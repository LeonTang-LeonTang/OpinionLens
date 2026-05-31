"""
高级舆论分析模块
包含：传播链路分析、异常检测、协同操纵识别
"""

import pandas as pd
import numpy as np
import json
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path
import math

DATA_DIR = Path(__file__).parent.parent / "data_processed"

def load_main_data():
    """加载主数据"""
    df = pd.read_csv(DATA_DIR / "takaichi_chinese_processed.csv")
    df['created_at'] = pd.to_datetime(df['created_at'])
    df['date'] = pd.to_datetime(df['date'])
    return df

def detect_burst_events(df, threshold=3.0):
    """检测热度突增事件（基于移动平均+标准差）"""
    daily = df.groupby(df['created_at'].dt.date).size()
    daily.index = pd.to_datetime(daily.index)

    if len(daily) < 14:
        return []

    # 计算7天移动平均和标准差
    rolling_mean = daily.rolling(7, min_periods=3).mean()
    rolling_std = daily.rolling(7, min_periods=3).std()

    # 检测突增点
    bursts = []
    for date, value in daily.items():
        if pd.notna(rolling_mean[date]) and pd.notna(rolling_std[date]):
            z_score = (value - rolling_mean[date]) / (rolling_std[date] + 1e-6)
            if z_score > threshold:
                bursts.append({
                    'date': str(date.date()),
                    'tweet_count': int(value),
                    'z_score': round(z_score, 2),
                    'avg_count': round(rolling_mean[date], 1),
                    'type': 'burst'
                })

    return bursts[:20]

def analyze_propagation_chains(df, topic_keyword=None, top_n=10):
    """分析传播链路：找核心扩散路径"""
    if topic_keyword:
        df = df[df['full_text'].str.contains(topic_keyword, case=False, na=False)]

    # 构建回复链
    reply_chains = []
    replies = df[df['in_reply_to_status_id'].notna()].copy()

    for _, row in replies.iterrows():
        chain = {
            'source': row['screen_name'],
            'target': row['in_reply_to_screen_name'],
            'date': str(row['created_at'].date()) if pd.notna(row['created_at']) else None,
            'text_preview': str(row['full_text'])[:100] if pd.notna(row['full_text']) else '',
            'engagement': int(row['favorite_count'] + row['retweet_count']),
            'type': 'reply'
        }
        reply_chains.append(chain)

    # 按参与度排序的代表性链路
    top_chains = sorted(reply_chains, key=lambda x: x['engagement'], reverse=True)[:top_n]

    return {
        'total_chains': len(reply_chains),
        'representative_chains': top_chains,
        'avg_chain_length': len(reply_chains) / df['user_id'].nunique() if df['user_id'].nunique() > 0 else 0
    }

def detect_suspicious_accounts(df, min_tweets=10):
    """检测可疑账号（多特征综合评分）"""
    user_stats = df.groupby('screen_name').agg({
        'tweet_id': 'count',
        'created_at': ['min', 'max'],
        'favorite_count': 'sum',
        'retweet_count': 'sum',
        'reply_count': 'sum',
        'in_reply_to_user_id': lambda x: x.notna().sum(),
        'followers_count': 'first',
        'statuses_count': 'first'
    }).reset_index()

    user_stats.columns = ['screen_name', 'tweet_count', 'first_tweet', 'last_tweet',
                          'total_favorites', 'total_retweets', 'total_replies',
                          'reply_ratio', 'followers_count', 'total_statuses']

    # 过滤活跃用户
    active_users = user_stats[user_stats['tweet_count'] >= min_tweets].copy()

    suspicious = []

    for _, user in active_users.iterrows():
        risk_factors = []
        risk_score = 0

        # 1. 发帖频率异常（过高）
        if user['tweet_count'] > 100:
            risk_score += 0.2
            risk_factors.append('高发帖量')

        # 2. 回复比例过高（被动传播型）
        if user['tweet_count'] > 0:
            reply_ratio = user['reply_ratio'] / user['tweet_count']
            if reply_ratio > 0.9:
                risk_score += 0.3
                risk_factors.append('回复比例过高(被动传播)')

        # 3. 粉丝/发帖比异常（粉丝少但发帖多）
        if user['followers_count'] > 0 and user['tweet_count'] > 0:
            ratio = user['followers_count'] / user['tweet_count']
            if ratio < 1:
                risk_score += 0.25
                risk_factors.append('粉丝/发帖比异常')

        # 4. 互动率低（只发不互动）
        if user['total_favorites'] + user['total_retweets'] < user['tweet_count'] * 0.1:
            risk_score += 0.15
            risk_factors.append('互动率低')

        # 5. 账号时间短但发帖多
        if pd.notna(user['first_tweet']) and pd.notna(user['last_tweet']):
            days_active = (user['last_tweet'] - user['first_tweet']).days
            if days_active > 0:
                daily_posts = user['tweet_count'] / days_active
                if daily_posts > 50:
                    risk_score += 0.2
                    risk_factors.append(f'日均发帖{daily_posts:.0f}次')

        if risk_score >= 0.3:
            suspicious.append({
                'screen_name': user['screen_name'],
                'tweet_count': int(user['tweet_count']),
                'followers_count': int(user['followers_count']) if pd.notna(user['followers_count']) else 0,
                'risk_score': round(risk_score, 2),
                'risk_factors': risk_factors,
                'risk_level': 'high' if risk_score >= 0.6 else 'medium'
            })

    # 按风险评分排序
    suspicious = sorted(suspicious, key=lambda x: x['risk_score'], reverse=True)

    return {
        'total_suspicious': len(suspicious),
        'high_risk': len([s for s in suspicious if s['risk_level'] == 'high']),
        'medium_risk': len([s for s in suspicious if s['risk_level'] == 'medium']),
        'top_suspicious': suspicious[:30]
    }

def detect_coordinated_behavior(df, similarity_threshold=0.8, time_window_minutes=30):
    """检测协同传播行为（短时间内发布相似内容的账号组）"""
    # 按小时分组
    df['hour_bucket'] = df['created_at'].dt.floor('h')

    coordinated = []

    # 对每个小时窗口检测
    for hour, group in df.groupby('hour_bucket'):
        if len(group) < 5:
            continue

        # 提取文本特征（前50字符）
        texts = group['full_text'].fillna('').apply(lambda x: x[:50] if len(str(x)) >= 50 else str(x))

        # 统计相同文本的账号
        text_counts = texts.value_counts()

        for text, count in text_counts.items():
            if count >= 3:  # 至少3个账号发布相似内容
                same_text_users = group[texts == text]['screen_name'].unique()
                if len(same_text_users) >= 3:
                    coordinated.append({
                        'time_window': str(hour),
                        'text_preview': text[:80],
                        'account_count': len(same_text_users),
                        'sample_accounts': list(same_text_users)[:5],
                        'total_posts': int(count),
                        'type': 'content_similarity'
                    })

    # 按账号数排序
    coordinated = sorted(coordinated, key=lambda x: x['account_count'], reverse=True)

    return {
        'total_events': len(coordinated),
        'events': coordinated[:30]
    }

def analyze_sentiment_evolution(df, window_days=7):
    """分析情感随时间演变"""
    df = df.copy()
    df['date'] = df['created_at'].dt.date

    # 简化：用每日推文数代替
    daily_counts = df.groupby('date').size().reset_index(name='count')
    daily_counts.columns = ['date', 'count']

    # 检测情感突变（推文量突增/突降）
    daily_counts['change_rate'] = daily_counts['count'].pct_change()

    anomalies = daily_counts[daily_counts['change_rate'].abs() > 2.0].copy()
    anomalies['type'] = anomalies['change_rate'].apply(lambda x: 'surge' if x > 0 else 'drop')

    return {
        'daily_stats': daily_counts.to_dict('records'),
        'anomalies': [
            {
                'date': str(row['date']),
                'count': int(row['count']),
                'change_rate': round(row['change_rate'] * 100, 1),
                'type': row['type']
            }
            for _, row in anomalies.iterrows()
        ][:15]
    }

def topic_query_analysis(df, keyword, days=30):
    """对任意关键词进行完整分析"""
    # 搜索
    mask = df['full_text'].str.contains(keyword, case=False, na=False)
    results = df[mask].copy()

    if len(results) == 0:
        return {'total_matches': 0, 'keyword': keyword}

    # 基本统计
    stats = {
        'total_matches': len(results),
        'unique_users': results['user_id'].nunique(),
        'time_range': {
            'start': str(results['created_at'].min().date()) if len(results) > 0 else None,
            'end': str(results['created_at'].max().date()) if len(results) > 0 else None
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
    stats['top_participants'] = top_users.to_dict('records')

    # 热门hashtag（与关键词共现）
    all_tags = []
    for tags in results['hashtags']:
        if isinstance(tags, str):
            all_tags.append(tags)
    tag_counts = Counter(all_tags).most_common(10)
    stats['related_hashtags'] = [{'tag': t, 'count': c} for t, c in tag_counts]

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

def get_advanced_network_stats(df):
    """获取增强的网络统计"""
    # 回复关系
    replies = df[df['in_reply_to_screen_name'].notna()]

    # 计算传播深度（回复链长度）
    reply_depth = defaultdict(int)
    for _, row in replies.iterrows():
        source = row['screen_name']
        target = row['in_reply_to_screen_name']
        if source and target:
            reply_depth[source] += 1
            reply_depth[target] += 1

    # 找出传播核心（被回复最多的用户）
    in_reply_counts = Counter(replies['in_reply_to_screen_name'].dropna())

    # 找出传播者（发起讨论最多的用户）
    out_reply_counts = Counter(replies['screen_name'])

    return {
        'total_reply_chains': len(replies),
        'unique_repliers': len(set(replies['screen_name'])),
        'most_replied_to': [
            {'user': user, 'count': count}
            for user, count in in_reply_counts.most_common(10)
        ],
        'most_active_repliers': [
            {'user': user, 'count': count}
            for user, count in out_reply_counts.most_common(10)
        ],
        'reply_ratio': round(len(replies) / len(df) * 100, 1) if len(df) > 0 else 0
    }

def main():
    print("=" * 60)
    print("高级舆论分析模块")
    print("=" * 60)

    df = load_main_data()
    print(f"\n加载数据: {len(df)} 条推文")

    # 1. 热度突增检测
    print("\n1. 检测热度突增事件...")
    bursts = detect_burst_events(df)
    print(f"   发现 {len(bursts)} 个热度突增事件")

    # 2. 可疑账号检测
    print("\n2. 检测可疑账号...")
    suspicious = detect_suspicious_accounts(df)
    print(f"   高风险: {suspicious['high_risk']} 个")
    print(f"   中风险: {suspicious['medium_risk']} 个")

    # 3. 协同传播检测
    print("\n3. 检测协同传播...")
    coordinated = detect_coordinated_behavior(df)
    print(f"   发现 {coordinated['total_events']} 个协同事件")

    # 4. 情感演变
    print("\n4. 分析情感演变...")
    sentiment_evo = analyze_sentiment_evolution(df)
    print(f"   发现 {len(sentiment_evo['anomalies'])} 个异常波动")

    # 5. 传播链路
    print("\n5. 分析传播链路...")
    propagation = analyze_propagation_chains(df, top_n=20)
    print(f"   总传播链路: {propagation['total_chains']}")

    # 6. 增强网络统计
    print("\n6. 网络统计分析...")
    network_stats = get_advanced_network_stats(df)

    # 保存结果
    results = {
        'burst_events': bursts,
        'suspicious_accounts': suspicious,
        'coordinated_behavior': coordinated,
        'sentiment_evolution': sentiment_evo,
        'propagation_chains': propagation,
        'network_advanced': network_stats
    }

    with open(DATA_DIR / "advanced_analysis.json", 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2, default=str)

    print(f"\n分析结果已保存: {DATA_DIR / 'advanced_analysis.json'}")

    return results

if __name__ == "__main__":
    main()
