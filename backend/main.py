"""
舆论分析系统 - FastAPI 后端
提供舆论分析各个维度的API接口
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import json
import math
from pathlib import Path
from typing import Optional, List
from datetime import datetime

# 导入抓取模块
from .scraper import router as scraper_router

def clean_nan(value):
    """清理NaN值，转换为None以便JSON序列化"""
    if isinstance(value, float) and math.isnan(value):
        return None
    return value

def clean_records(records):
    """清理记录列表中的NaN值"""
    return [
        {k: clean_nan(v) for k, v in record.items()}
        for record in records
    ]

# 初始化FastAPI应用
app = FastAPI(
    title="舆论分析系统 API",
    description="舆论传播机制与意见领袖分析系统后端服务",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册抓取路由
app.include_router(scraper_router, prefix="/api")

# 数据路径配置
DATA_DIR = Path(__file__).parent.parent / "data_processed"

# 全局数据缓存
_data_cache = {}

def load_data():
    """加载所有数据到缓存"""
    global _data_cache

    if not _data_cache:
        print("加载数据到缓存...")

        # 主数据
        _data_cache['main'] = pd.read_csv(DATA_DIR / "takaichi_chinese_processed.csv")
        _data_cache['main']['created_at'] = pd.to_datetime(_data_cache['main']['created_at'])
        _data_cache['main']['date'] = pd.to_datetime(_data_cache['main']['date'])

        # 用户统计
        _data_cache['user_stats'] = pd.read_csv(DATA_DIR / "user_stats.csv")

        # 意见领袖
        _data_cache['leaders'] = pd.read_csv(DATA_DIR / "opinion_leaders.csv")

        # 网络统计
        with open(DATA_DIR / "network_stats.json", 'r', encoding='utf-8') as f:
            _data_cache['network_stats'] = json.load(f)

        # 网络图数据
        with open(DATA_DIR / "network_graph.json", 'r', encoding='utf-8') as f:
            _data_cache['network_graph'] = json.load(f)

        # 社区信息
        with open(DATA_DIR / "communities.json", 'r', encoding='utf-8') as f:
            _data_cache['communities'] = json.load(f)

        # 情感摘要
        with open(DATA_DIR / "sentiment_summary.json", 'r', encoding='utf-8') as f:
            _data_cache['sentiment_summary'] = json.load(f)

        # 情感分析
        _data_cache['sentiment'] = pd.read_csv(DATA_DIR / "sentiment_analysis.csv")

        # 话题分析
        with open(DATA_DIR / "topic_analysis.json", 'r', encoding='utf-8') as f:
            _data_cache['topic_analysis'] = json.load(f)

        # 时间序列
        with open(DATA_DIR / "time_series.json", 'r', encoding='utf-8') as f:
            _data_cache['time_series'] = json.load(f)

        # 用户行为
        with open(DATA_DIR / "user_behavior.json", 'r', encoding='utf-8') as f:
            _data_cache['user_behavior'] = json.load(f)

        # 每日统计
        _data_cache['daily_stats'] = pd.read_csv(DATA_DIR / "daily_stats.csv")
        _data_cache['daily_stats']['date'] = pd.to_datetime(_data_cache['daily_stats']['date'])

        print("数据加载完成!")

    return _data_cache

@app.on_event("startup")
async def startup_event():
    """应用启动时加载数据"""
    load_data()

@app.get("/")
async def root():
    """API根路径"""
    return {
        "message": "舆论分析系统 API",
        "version": "1.0.0",
        "endpoints": {
            "overview": "/api/overview",
            "sentiment": "/api/sentiment",
            "topics": "/api/topics",
            "timeline": "/api/timeline",
            "leaders": "/api/leaders",
            "network": "/api/network",
            "communities": "/api/communities",
            "user_behavior": "/api/user-behavior"
        }
    }

@app.get("/api/overview")
async def get_overview():
    """获取舆论分析概览"""
    data = load_data()
    main_df = data['main']
    network_stats = data['network_stats']
    sentiment = data['sentiment_summary']

    return {
        "topic": "高市早苗相关舆论",
        "total_tweets": len(main_df),
        "total_users": main_df['user_id'].nunique(),
        "time_range": {
            "start": str(main_df['created_at'].min()),
            "end": str(main_df['created_at'].max())
        },
        "network": {
            "nodes": network_stats.get('nodes', 0),
            "edges": network_stats.get('edges', 0),
            "density": round(network_stats.get('density', 0), 6)
        },
        "sentiment": {
            "positive_rate": round(sentiment['positive_rate'] * 100, 1),
            "neutral_rate": round(sentiment['neutral_rate'] * 100, 1),
            "negative_rate": round(sentiment['negative_rate'] * 100, 1)
        }
    }

@app.get("/api/sentiment")
async def get_sentiment(
    date_from: Optional[str] = Query(None, description="开始日期 YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="结束日期 YYYY-MM-DD")
):
    """获取情感分析结果"""
    data = load_data()
    sentiment_df = data['sentiment']
    summary = data['sentiment_summary']

    # 时间筛选
    if date_from or date_to:
        sentiment_df = sentiment_df.copy()
        sentiment_df['date'] = pd.to_datetime(sentiment_df['date'])

        if date_from:
            sentiment_df = sentiment_df[sentiment_df['date'] >= date_from]
        if date_to:
            sentiment_df = sentiment_df[sentiment_df['date'] <= date_to]

        # 重新计算统计
        total = len(sentiment_df)
        pos = (sentiment_df['sentiment_label'] == 'positive').sum()
        neu = (sentiment_df['sentiment_label'] == 'neutral').sum()
        neg = (sentiment_df['sentiment_label'] == 'negative').sum()

        result = {
            "summary": {
                "total": total,
                "positive": int(pos),
                "neutral": int(neu),
                "negative": int(neg),
                "positive_rate": round(pos / total * 100, 1) if total > 0 else 0,
                "neutral_rate": round(neu / total * 100, 1) if total > 0 else 0,
                "negative_rate": round(neg / total * 100, 1) if total > 0 else 0
            }
        }
    else:
        # 使用统一的字段名
        result = {
            "summary": {
                "total": summary['total_analyzed'],
                "positive": summary['positive_count'],
                "neutral": summary['neutral_count'],
                "negative": summary['negative_count'],
                "positive_rate": round(summary['positive_rate'] * 100, 1),
                "neutral_rate": round(summary['neutral_rate'] * 100, 1),
                "negative_rate": round(summary['negative_rate'] * 100, 1),
                "avg_sentiment_score": summary.get('avg_sentiment_score', 0)
            }
        }

    # 返回情感分布饼图数据
    result["chart_data"] = {
        "labels": ["正面", "中立", "负面"],
        "values": [
            result["summary"]["positive"],
            result["summary"]["neutral"],
            result["summary"]["negative"]
        ]
    }

    return result

@app.get("/api/topics")
async def get_topics(limit: int = Query(20, ge=1, le=50)):
    """获取热门话题"""
    data = load_data()
    topic_data = data['topic_analysis']

    hashtags = topic_data.get('top_hashtags', [])[:limit]

    return {
        "total_hashtags": topic_data.get('total_unique_hashtags', 0),
        "hot_topics": [
            {"rank": i + 1, "hashtag": tag, "count": count}
            for i, (tag, count) in enumerate(hashtags)
        ],
        "chart_data": {
            "labels": [tag for tag, _ in hashtags[:10]],
            "values": [count for _, count in hashtags[:10]]
        }
    }

@app.get("/api/timeline")
async def get_timeline(
    granularity: str = Query("day", pattern="^(day|week|month)$")
):
    """获取时间序列数据"""
    data = load_data()
    daily_stats = data['daily_stats'].copy()
    time_series = data['time_series']

    if granularity == "day":
        stats = daily_stats
    elif granularity == "week":
        daily_stats['week'] = daily_stats['date'].dt.isocalendar().week
        stats = daily_stats.groupby('week').agg({
            'tweet_count': 'sum',
            'daily_favorites': 'sum',
            'daily_retweets': 'sum'
        }).reset_index()
        stats.columns = ['period', 'tweet_count', 'favorites', 'retweets']
    else:
        daily_stats['month'] = daily_stats['date'].dt.to_period('M')
        stats = daily_stats.groupby('month').agg({
            'tweet_count': 'sum',
            'daily_favorites': 'sum',
            'daily_retweets': 'sum'
        }).reset_index()
        stats['period'] = stats['month'].astype(str)
        stats = stats[['period', 'tweet_count', 'daily_favorites', 'daily_retweets']]
        stats.columns = ['period', 'tweet_count', 'favorites', 'retweets']

    # 峰值日期
    peak_days = time_series.get('top_peak_days', [])

    return {
        "granularity": granularity,
        "timeline": stats.to_dict('records'),
        "peak_days": peak_days[:5],
        "weekly_pattern": time_series.get('weekly_pattern', {}),
        "hourly_pattern": time_series.get('hourly_pattern', {})
    }

@app.get("/api/leaders")
async def get_leaders(
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("influence_score", pattern="^(influence_score|followers_count|tweet_count)$")
):
    """获取意见领袖榜单"""
    data = load_data()
    leaders_df = data['leaders'].copy()

    # 排序
    leaders_df = leaders_df.sort_values(sort_by, ascending=False).head(limit)

    # 清理NaN值
    leaders_list = clean_records(leaders_df.to_dict('records'))
    top3_list = clean_records(leaders_df.head(3).to_dict('records'))

    return {
        "total_leaders": len(data['leaders']),
        "leaders": leaders_list,
        "top3": top3_list
    }

@app.get("/api/network")
async def get_network(
    limit: int = Query(100, ge=10, le=500)
):
    """获取传播网络数据"""
    data = load_data()
    network_graph = data['network_graph']
    network_stats = data['network_stats']

    # 限制节点数量
    if limit < len(network_graph.get('nodes', [])):
        # 按pagerank排序取前N个节点
        nodes = network_graph.get('nodes', [])
        nodes_sorted = sorted(nodes, key=lambda x: x.get('pagerank', 0) if isinstance(x, dict) else 0, reverse=True)[:limit]
        node_ids = set([n.get('id') if isinstance(n, dict) else n for n in nodes_sorted])

        # 过滤边
        edges = [e for e in network_graph.get('links', []) or network_graph.get('edges', [])
                 if (isinstance(e, dict) and e.get('source') in node_ids and e.get('target') in node_ids)]

        network_graph['nodes'] = nodes_sorted
        network_graph['edges'] = edges
        network_graph['links'] = edges

    return {
        "stats": network_stats,
        "graph": network_graph
    }

@app.get("/api/communities")
async def get_communities(limit: int = Query(10, ge=1, le=50)):
    """获取社区信息"""
    data = load_data()
    communities = data['communities']

    # 按规模排序
    communities_sorted = sorted(communities, key=lambda x: x.get('size', 0), reverse=True)[:limit]

    return {
        "total_communities": len(communities),
        "communities": communities_sorted
    }

@app.get("/api/user-behavior")
async def get_user_behavior():
    """获取用户行为分析"""
    data = load_data()
    user_behavior = data['user_behavior']

    return {
        "overview": {
            "total_users": user_behavior.get('total_users', 0),
            "active_users": user_behavior.get('active_users', 0),
            "power_users": user_behavior.get('power_users', 0)
        },
        "behavior_rates": user_behavior.get('behavior_rates', {}),
        "user_level_distribution": user_behavior.get('user_level_distribution', {})
    }

@app.get("/api/search")
async def search_tweets(
    keyword: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100)
):
    """搜索推文"""
    data = load_data()
    main_df = data['main']

    # 搜索推文
    mask = main_df['full_text'].str.contains(keyword, case=False, na=False)
    results = main_df[mask].sort_values('favorite_count', ascending=False).head(limit)

    return {
        "keyword": keyword,
        "total_matches": int(mask.sum()),
        "results": results[['tweet_id', 'screen_name', 'full_text', 'favorite_count',
                           'retweet_count', 'created_at']].to_dict('records')
    }

# ============ 高级分析API ============

@app.get("/api/advanced/burst-events")
async def get_burst_events():
    """获取热度突增事件"""
    with open(DATA_DIR / "advanced_analysis.json", 'r', encoding='utf-8') as f:
        data = json.load(f)
    return {"events": data.get('burst_events', [])}

@app.get("/api/advanced/suspicious-accounts")
async def get_suspicious_accounts(limit: int = Query(30, ge=1, le=100)):
    """获取可疑账号列表"""
    with open(DATA_DIR / "advanced_analysis.json", 'r', encoding='utf-8') as f:
        data = json.load(f)
    accounts = data.get('suspicious_accounts', {})
    return {
        "total": accounts.get('total_suspicious', 0),
        "high_risk": accounts.get('high_risk', 0),
        "medium_risk": accounts.get('medium_risk', 0),
        "accounts": clean_records(accounts.get('top_suspicious', [])[:limit])
    }

@app.get("/api/advanced/coordinated")
async def get_coordinated_behavior(limit: int = Query(20, ge=1, le=50)):
    """获取协同传播事件"""
    with open(DATA_DIR / "advanced_analysis.json", 'r', encoding='utf-8') as f:
        data = json.load(f)
    coordinated = data.get('coordinated_behavior', {})
    return {
        "total_events": coordinated.get('total_events', 0),
        "events": coordinated.get('events', [])[:limit]
    }

@app.get("/api/advanced/propagation")
async def get_propagation_chains(limit: int = Query(20, ge=1, le=50)):
    """获取传播链路分析"""
    with open(DATA_DIR / "advanced_analysis.json", 'r', encoding='utf-8') as f:
        data = json.load(f)
    propagation = data.get('propagation_chains', {})
    return {
        "total_chains": propagation.get('total_chains', 0),
        "avg_chain_length": propagation.get('avg_chain_length', 0),
        "chains": clean_records(propagation.get('representative_chains', [])[:limit])
    }

@app.get("/api/advanced/network-stats")
async def get_advanced_network_stats():
    """获取增强的网络统计"""
    with open(DATA_DIR / "advanced_analysis.json", 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('network_advanced', {})

@app.get("/api/advanced/anomalies")
async def get_anomalies():
    """获取异常波动"""
    with open(DATA_DIR / "advanced_analysis.json", 'r', encoding='utf-8') as f:
        data = json.load(f)
    return {"anomalies": data.get('sentiment_evolution', {}).get('anomalies', [])}

@app.get("/api/topic-analysis")
async def analyze_topic(
    keyword: str = Query(..., min_length=1),
    days: int = Query(30, ge=1, le=365)
):
    """对任意话题/关键词进行完整分析"""
    main_df = load_data()['main']

    # 搜索
    mask = main_df['full_text'].str.contains(keyword, case=False, na=False)
    results = main_df[mask].copy()

    if len(results) == 0:
        return {'total_matches': 0, 'keyword': keyword}

    # 基本统计
    stats = {
        'total_matches': len(results),
        'unique_users': int(results['user_id'].nunique()),
        'time_range': {
            'start': str(results['created_at'].min().date()),
            'end': str(results['created_at'].max().date())
        },
        'engagement': {
            'total_favorites': int(results['favorite_count'].sum()),
            'total_retweets': int(results['retweet_count'].sum()),
            'avg_favorites': round(results['favorite_count'].mean(), 2),
            'avg_retweets': round(results['retweet_count'].mean(), 2)
        }
    }

    # 时序分布
    daily = results.groupby(results['created_at'].dt.date).size()
    stats['daily_distribution'] = [
        {'date': str(k), 'count': int(v)} for k, v in daily.items()
    ]

    # 热门参与者
    top_users = results.groupby('screen_name').agg({
        'tweet_id': 'count',
        'favorite_count': 'sum',
        'followers_count': 'first'
    }).reset_index()
    top_users.columns = ['screen_name', 'tweet_count', 'total_favorites', 'followers']
    top_users = top_users.sort_values('tweet_count', ascending=False).head(10)
    stats['top_participants'] = clean_records(top_users.to_dict('records'))

    # 代表性推文
    results['engagement'] = results['favorite_count'] + results['retweet_count'] * 2
    top_tweets = results.nlargest(5, 'engagement')[['screen_name', 'full_text', 'engagement', 'created_at']]
    stats['representative_tweets'] = [
        {
            'user': row['screen_name'],
            'text': str(row['full_text'])[:200],
            'engagement': int(row['engagement']),
            'date': str(row['created_at'].date())
        }
        for _, row in top_tweets.iterrows()
    ]

    return stats

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
