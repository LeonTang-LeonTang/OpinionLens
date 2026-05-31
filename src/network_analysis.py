"""
传播网络构建与分析脚本
功能：构建信息传播网络，计算中心性指标，识别关键节点
"""

import pandas as pd
import networkx as nx
import json
from collections import Counter
from pathlib import Path
from datetime import datetime

# 配置路径
DATA_DIR = Path("data_processed")
OUTPUT_DIR = DATA_DIR

def load_data():
    """加载预处理后的数据"""
    print("加载数据...")
    df = pd.read_csv(DATA_DIR / "takaichi_chinese_processed.csv")
    df['created_at'] = pd.to_datetime(df['created_at'])
    df['date'] = pd.to_datetime(df['date'])
    return df

def build_retweet_network(df):
    """构建转发网络"""
    print("\n构建转发网络...")

    G = nx.DiGraph()

    # 边数据：转发者 -> 原作者
    edges = []

    # 处理转发关系
    retweets = df[df['retweeted_status_screen_name'].notna()]
    print(f"  转发推文: {len(retweets)} 条")

    for _, row in retweets.iterrows():
        source = row['screen_name']
        target = row['retweeted_status_screen_name']
        if source and target and source != target:
            edges.append((source, target, 'retweet'))

    # 处理回复关系
    replies = df[df['in_reply_to_screen_name'].notna()]
    print(f"  回复推文: {len(replies)} 条")

    for _, row in replies.iterrows():
        source = row['screen_name']
        target = row['in_reply_to_screen_name']
        if source and target and source != target:
            edges.append((source, target, 'reply'))

    # 处理引用关系
    quotes = df[df['quoted_tweet_screen_name'].notna()]
    print(f"  引用推文: {len(quotes)} 条")

    for _, row in quotes.iterrows():
        source = row['screen_name']
        target = row['quoted_tweet_screen_name']
        if source and target and source != target:
            edges.append((source, target, 'quote'))

    # 添加边到图
    for src, tgt, relation in edges:
        if G.has_edge(src, tgt):
            G[src][tgt]['weight'] += 1
            if relation not in G[src][tgt]['types']:
                G[src][tgt]['types'].append(relation)
        else:
            G.add_edge(src, tgt, weight=1, types=[relation])

    print(f"  网络节点数: {G.number_of_nodes()}")
    print(f"  网络边数: {G.number_of_edges()}")

    return G, edges

def build_interaction_network(df):
    """构建互动网络（双向）"""
    print("\n构建互动网络...")

    G = nx.Graph()  # 无向图

    edges = []

    # 处理回复关系
    replies = df[df['in_reply_to_screen_name'].notna()]
    for _, row in replies.iterrows():
        source = row['screen_name']
        target = row['in_reply_to_screen_name']
        if source and target and source != target:
            edges.append((min(source, target), max(source, target)))

    # 添加边
    edge_counts = Counter(edges)
    for (src, tgt), count in edge_counts.items():
        G.add_edge(src, tgt, weight=count)

    print(f"  互动网络节点数: {G.number_of_nodes()}")
    print(f"  互动网络边数: {G.number_of_edges()}")

    return G

def compute_centrality(G):
    """计算网络中心性指标"""
    print("\n计算中心性指标...")

    # 度中心性
    if G.is_directed():
        in_degree = dict(G.in_degree())
        out_degree = dict(G.out_degree())
        degree_centrality = {
            node: (in_degree[node] + out_degree[node]) / (2 * (len(G) - 1))
            for node in G.nodes()
        }
    else:
        in_degree = dict(G.degree())
        degree_centrality = nx.degree_centrality(G)

    # 介数中心性（对大网络较慢，使用近似）
    print("  计算介数中心性...")
    try:
        if G.number_of_nodes() > 10000:
            # 使用采样近似
            betweenness = nx.betweenness_centrality(G, k=min(100, G.number_of_nodes()))
        else:
            betweenness = nx.betweenness_centrality(G)
    except:
        betweenness = {node: 0 for node in G.nodes()}

    # PageRank
    print("  计算PageRank...")
    try:
        if G.is_directed():
            pagerank = nx.pagerank(G, alpha=0.85, max_iter=100)
        else:
            pagerank = nx.pagerank(G, max_iter=100)
    except:
        pagerank = {node: 0 for node in G.nodes()}

    return {
        'degree_centrality': degree_centrality,
        'betweenness_centrality': betweenness,
        'pagerank': pagerank,
        'in_degree': in_degree if G.is_directed() else None,
        'out_degree': out_degree if G.is_directed() else None
    }

def identify_opinion_leaders(centrality, user_stats, top_n=50):
    """识别意见领袖"""
    print("\n识别意见领袖...")

    # 合并多个指标
    scores = {}
    for node in centrality['pagerank'].keys():
        scores[node] = (
            centrality['pagerank'].get(node, 0) * 0.4 +
            centrality['betweenness_centrality'].get(node, 0) * 0.3 +
            centrality['degree_centrality'].get(node, 0) * 0.3
        )

    # 排序
    sorted_nodes = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    # 获取详细信息（去重，取最新的）
    user_stats_unique = user_stats.drop_duplicates(subset='screen_name', keep='last')
    user_dict = user_stats_unique.set_index('screen_name').to_dict('index')

    leaders = []
    for screen_name, score in sorted_nodes[:top_n]:
        user_info = user_dict.get(screen_name, {})
        leaders.append({
            'rank': len(leaders) + 1,
            'screen_name': screen_name,
            'name': user_info.get('name', ''),
            'followers_count': user_info.get('followers_count', 0),
            'tweet_count': user_info.get('tweet_count', 0),
            'total_engagement': user_info.get('total_engagement', 0),
            'influence_score': round(score, 6),
            'pagerank': round(centrality['pagerank'].get(screen_name, 0), 6),
            'betweenness': round(centrality['betweenness_centrality'].get(screen_name, 0), 6)
        })

    return leaders

def analyze_community(G):
    """社区检测"""
    print("\n进行社区检测...")

    try:
        # 使用Louvain算法
        from networkx.algorithms.community import louvain_communities
        communities = louvain_communities(G.to_undirected(), seed=42)

        community_data = []
        for i, community in enumerate(communities):
            community_data.append({
                'community_id': i + 1,
                'size': len(community),
                'members': list(community)[:20]  # 只保存前20个成员
            })

        print(f"  发现 {len(communities)} 个社区")
        return community_data
    except Exception as e:
        print(f"  社区检测失败: {e}")
        return []

def analyze_network_structure(G):
    """分析网络结构特征"""
    print("\n分析网络结构...")

    # 基础统计
    stats = {
        'nodes': G.number_of_nodes(),
        'edges': G.number_of_edges(),
        'density': nx.density(G),
    }

    # 转为无向图计算连通分量
    if G.is_directed():
        undirected = G.to_undirected()
        largest_cc = max(nx.connected_components(undirected), key=len)
        stats['largest_component_size'] = len(largest_cc)
        stats['num_connected_components'] = nx.number_connected_components(undirected)
    else:
        largest_cc = max(nx.connected_components(G), key=len)
        stats['largest_component_size'] = len(largest_cc)
        stats['num_connected_components'] = nx.number_connected_components(G)

    # 计算聚类系数
    try:
        stats['avg_clustering'] = nx.average_clustering(G.to_undirected())
    except:
        stats['avg_clustering'] = 0

    print(f"  节点数: {stats['nodes']}")
    print(f"  边数: {stats['edges']}")
    print(f"  网络密度: {stats['density']:.6f}")
    print(f"  最大连通分量: {stats['largest_component_size']}")
    print(f"  连通分量数: {stats['num_connected_components']}")

    return stats

def export_network_for_visualization(G, centrality, output_file):
    """导出网络数据用于可视化"""
    print(f"\n导出网络数据: {output_file}")

    # 选择关键节点（top 500 by pagerank）
    top_nodes = sorted(centrality['pagerank'].items(), key=lambda x: x[1], reverse=True)[:500]
    top_node_set = set([n[0] for n in top_nodes])

    # 创建子图
    subgraph = G.subgraph(top_node_set).copy()

    # 添加节点属性
    for node in subgraph.nodes():
        subgraph.nodes[node]['pagerank'] = centrality['pagerank'].get(node, 0)
        subgraph.nodes[node]['betweenness'] = centrality['betweenness_centrality'].get(node, 0)

    # 导出为JSON
    data = nx.node_link_data(subgraph)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"  导出节点数: {subgraph.number_of_nodes()}")
    print(f"  导出边数: {subgraph.number_of_edges()}")

    return data

def main():
    print("=" * 60)
    print("传播网络构建与分析")
    print("=" * 60)

    # 加载数据
    df = load_data()
    user_stats = pd.read_csv(DATA_DIR / "user_stats.csv")

    # 构建网络
    G_directed, edges = build_retweet_network(df)
    G_undirected = build_interaction_network(df)

    # 网络结构分析
    network_stats = analyze_network_structure(G_directed)

    # 计算中心性
    centrality = compute_centrality(G_directed)

    # 识别意见领袖
    opinion_leaders = identify_opinion_leaders(centrality, user_stats, top_n=100)

    # 社区检测
    communities = analyze_community(G_undirected)

    # 导出结果
    print("\n保存分析结果...")

    # 保存意见领袖
    leaders_df = pd.DataFrame(opinion_leaders)
    leaders_df.to_csv(OUTPUT_DIR / "opinion_leaders.csv", index=False, encoding='utf-8-sig')
    print(f"意见领袖: {OUTPUT_DIR / 'opinion_leaders.csv'}")

    # 保存网络统计
    with open(OUTPUT_DIR / "network_stats.json", 'w', encoding='utf-8') as f:
        json.dump(network_stats, f, ensure_ascii=False, indent=2)
    print(f"网络统计: {OUTPUT_DIR / 'network_stats.json'}")

    # 导出网络可视化数据
    network_data = export_network_for_visualization(G_directed, centrality, OUTPUT_DIR / "network_graph.json")

    # 保存社区信息
    with open(OUTPUT_DIR / "communities.json", 'w', encoding='utf-8') as f:
        json.dump(communities, f, ensure_ascii=False, indent=2)
    print(f"社区信息: {OUTPUT_DIR / 'communities.json'}")

    # 打印Top 10意见领袖
    print("\n" + "=" * 60)
    print("Top 10 意见领袖")
    print("=" * 60)
    for leader in opinion_leaders[:10]:
        print(f"{leader['rank']:2d}. @{leader['screen_name']:20s} "
              f"粉丝: {leader['followers_count']:>10,} "
              f"得分: {leader['influence_score']:.4f}")

    print("\n" + "=" * 60)
    print("网络分析完成!")
    print("=" * 60)

    return {
        'network_stats': network_stats,
        'opinion_leaders': opinion_leaders,
        'communities': communities,
        'network_data': network_data
    }

if __name__ == "__main__":
    main()
