"""
情感分析与话题聚类脚本
功能：情感分析、话题提取、时间序列分析
"""

import pandas as pd
import numpy as np
import re
import json
from collections import Counter
from pathlib import Path
from datetime import datetime, timedelta
from decimal import Decimal

class DateTimeEncoder(json.JSONEncoder):
    """自定义JSON编码器，处理日期时间类型"""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

# 配置路径
DATA_DIR = Path("data_processed")
OUTPUT_DIR = DATA_DIR

# 尝试导入NLP库
try:
    from snownlp import SnowNLP
    SNOWNLP_AVAILABLE = True
except ImportError:
    SNOWNLP_AVAILABLE = False
    print("SnowNLP not available, will use simple keyword-based sentiment")

try:
    import jieba
    import jieba.analyse
    JIEBA_AVAILABLE = True
except ImportError:
    JIEBA_AVAILABLE = False
    print("Jieba not available, will skip Chinese word segmentation")

def load_data():
    """加载预处理后的数据"""
    print("加载数据...")
    df = pd.read_csv(DATA_DIR / "takaichi_chinese_processed.csv")
    df['created_at'] = pd.to_datetime(df['created_at'])
    df['date'] = pd.to_datetime(df['date'])
    return df

def simple_sentiment(text):
    """基于关键词的简单情感分析"""
    positive_words = ['支持', '加油', '伟大', '优秀', '厉害', '成功', '希望', '好', '棒', '赞',
                      '恭喜', '祝贺', '期待', '感谢', '喜欢', '爱', '最强', '素晴らしい', '支持',
                      '赞成', ' хоро', 'good', 'great', 'best', 'love', 'win']
    negative_words = ['反对', '失望', '糟糕', '差', '垃圾', '无语', '讨厌', '恨', '烂', '废物',
                      '批判', '反对', '讨厌', '嫌', '烂', ' 最悪', 'だめ', 'bad', 'hate', 'worst']

    text_lower = text.lower()
    pos_count = sum(1 for w in positive_words if w in text_lower)
    neg_count = sum(1 for w in negative_words if w in text_lower)

    if pos_count > neg_count:
        return 1  # 正面
    elif neg_count > pos_count:
        return -1  # 负面
    else:
        return 0  # 中立

def analyze_sentiment(text):
    """情感分析"""
    if not text or len(text) < 5:
        return 0.5

    if SNOWNLP_AVAILABLE:
        try:
            s = SnowNLP(text)
            return s.sentiments  # 0-1，越接近1越正面
        except:
            return simple_sentiment(text)
    else:
        result = simple_sentiment(text)
        if result == 1:
            return 0.8
        elif result == -1:
            return 0.2
        else:
            return 0.5

def batch_sentiment_analysis(df, sample_size=50000):
    """批量情感分析"""
    print("\n开始情感分析...")

    # 采样（如果数据量太大）
    if len(df) > sample_size:
        print(f"  采样 {sample_size} 条进行分析...")
        df_sample = df.sample(n=sample_size, random_state=42)
    else:
        df_sample = df

    sentiments = []
    for i, (_, row) in enumerate(df_sample.iterrows()):
        text = str(row['full_text']) if pd.notna(row['full_text']) else ""
        sentiment = analyze_sentiment(text)
        sentiments.append(sentiment)

        if (i + 1) % 10000 == 0:
            print(f"  已分析 {i + 1} 条...")

    df_sample = df_sample.copy()
    df_sample['sentiment_score'] = sentiments

    # 分类
    df_sample['sentiment_label'] = df_sample['sentiment_score'].apply(
        lambda x: 'positive' if x > 0.6 else ('negative' if x < 0.4 else 'neutral')
    )

    print(f"  情感分析完成: {len(df_sample)} 条")

    return df_sample

def sentiment_statistics(sentiment_df):
    """情感统计"""
    print("\n情感统计:")

    label_counts = sentiment_df['sentiment_label'].value_counts()
    print(label_counts)

    sentiment_by_lang = sentiment_df.groupby('lang')['sentiment_score'].agg(['mean', 'std', 'count'])
    print("\n按语言统计:")
    print(sentiment_by_lang)

    return {
        'label_distribution': label_counts.to_dict(),
        'overall_mean': float(sentiment_df['sentiment_score'].mean()),
        'overall_std': float(sentiment_df['sentiment_score'].std()),
        'by_language': sentiment_by_lang.to_dict()
    }

def extract_keywords(text):
    """提取关键词"""
    if not JIEBA_AVAILABLE:
        # 简单提取
        words = re.findall(r'[\u4e00-\u9fa5]+', text)
        return list(set(words))[:20]

    # 使用TF-IDF提取关键词
    keywords = jieba.analyse.extract_tags(text, topK=20, withWeight=False)
    return keywords

def topic_clustering(df, n_topics=10):
    """话题聚类分析"""
    print(f"\n话题聚类分析 (聚类数: {n_topics})...")

    # 提取所有话题标签
    all_hashtags = []
    for tags in df['hashtags']:
        if isinstance(tags, list):
            all_hashtags.extend(tags)
        elif isinstance(tags, str) and tags:
            try:
                all_hashtags.extend(eval(tags))
            except:
                pass

    # 话题标签统计
    hashtag_counts = Counter(all_hashtags)
    top_hashtags = hashtag_counts.most_common(50)

    print("  热门话题标签 (Top 20):")
    for tag, count in top_hashtags[:20]:
        print(f"    #{tag}: {count}")

    # 提取推文文本特征
    print("  提取文本关键词...")

    # 按时间分段分析话题
    df_sorted = df.sort_values('date')
    df_sorted['week'] = df_sorted['date'].dt.isocalendar().week
    df_sorted['month'] = df_sorted['date'].dt.to_period('M')

    # 月度话题变化
    monthly_keywords = {}
    for month, group in df_sorted.groupby('month'):
        texts = ' '.join(group['full_text'].dropna().astype(str).tolist()[:5000])
        if JIEBA_AVAILABLE:
            keywords = jieba.analyse.extract_tags(texts, topK=15, withWeight=True)
            monthly_keywords[str(month)] = {k: float(v) for k, v in keywords}
        else:
            keywords = extract_keywords(texts)[:15]
            monthly_keywords[str(month)] = {k: 1.0 for k in keywords}

    return {
        'top_hashtags': top_hashtags,
        'monthly_keywords': monthly_keywords,
        'total_unique_hashtags': len(hashtag_counts)
    }

def time_series_analysis(df):
    """时间序列分析"""
    print("\n时间序列分析...")

    # 日度统计
    daily_stats = df.groupby('date').agg({
        'tweet_id': 'count',
        'favorite_count': 'sum',
        'retweet_count': 'sum',
        'reply_count': 'sum',
        'user_id': 'nunique'
    }).reset_index()
    daily_stats.columns = ['date', 'tweet_count', 'total_favorites', 'total_retweets',
                          'total_replies', 'active_users']

    # 计算热度指标
    daily_stats['engagement'] = (
        daily_stats['total_favorites'] +
        daily_stats['total_retweets'] * 2 +
        daily_stats['total_replies'] * 2
    )

    # 识别高峰日
    daily_stats['is_peak'] = daily_stats['engagement'] > daily_stats['engagement'].quantile(0.95)

    print("  高热度日 (Top 10):")
    top_days = daily_stats.nlargest(10, 'engagement')
    for _, row in top_days.iterrows():
        print(f"    {row['date'].strftime('%Y-%m-%d')}: "
              f"推文={row['tweet_count']:,}, 互动={row['engagement']:,.0f}")

    # 周内分布
    df['day_of_week'] = df['created_at'].dt.day_name()
    weekly_pattern = df['day_of_week'].value_counts()

    print("\n  周内分布:")
    for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']:
        count = weekly_pattern.get(day, 0)
        print(f"    {day}: {count:,}")

    # 小时分布
    hourly_pattern = df.groupby('hour').size()

    return {
        'daily_stats': daily_stats.to_dict('records'),
        'top_peak_days': top_days.to_dict('records'),
        'weekly_pattern': weekly_pattern.to_dict(),
        'hourly_pattern': hourly_pattern.to_dict()
    }

def user_behavior_analysis(df):
    """用户行为分析"""
    print("\n用户行为分析...")

    # 用户活跃度分布
    user_activity = df.groupby('screen_name').size()
    print(f"  用户活跃度统计:")
    print(f"    总用户数: {len(user_activity):,}")
    print(f"    活跃用户(>10条): {(user_activity > 10).sum():,}")
    print(f"    高产用户(>100条): {(user_activity > 100).sum():,}")

    # 互动类型分析
    df['has_reply'] = df['reply_count'] > 0
    df['has_retweet'] = df['retweet_count'] > 0
    df['has_quote'] = df['quote_count'] > 0
    df['is_original'] = (df['in_reply_to_status_id'].isna() &
                         df['retweeted_status_id'].isna() &
                         df['quoted_tweet_status_id'].isna())

    behavior_stats = {
        'reply_rate': df['has_reply'].mean(),
        'retweet_rate': df['has_retweet'].mean(),
        'quote_rate': df['has_quote'].mean(),
        'original_rate': df['is_original'].mean()
    }

    print("  互动类型分布:")
    for k, v in behavior_stats.items():
        print(f"    {k}: {v:.2%}")

    # 用户分层
    user_stats = df.groupby('screen_name').agg({
        'tweet_id': 'count',
        'followers_count': 'first',
        'favorite_count': 'sum',
        'retweet_count': 'sum'
    }).reset_index()

    # 计算影响力指数
    user_stats['influence'] = (
        user_stats['tweet_id'] * 0.2 +
        np.log1p(user_stats['followers_count']) * 0.4 +
        np.log1p(user_stats['favorite_count']) * 0.2 +
        np.log1p(user_stats['retweet_count']) * 0.2
    )

    # 用户分层
    user_stats['level'] = pd.qcut(user_stats['influence'], q=5,
                                   labels=['level1', 'level2', 'level3', 'level4', 'level5'])

    level_dist = user_stats['level'].value_counts()

    return {
        'total_users': len(user_activity),
        'active_users': int((user_activity > 10).sum()),
        'power_users': int((user_activity > 100).sum()),
        'behavior_rates': behavior_stats,
        'user_level_distribution': level_dist.to_dict()
    }

def main():
    print("=" * 60)
    print("情感分析与话题聚类")
    print("=" * 60)

    # 加载数据
    df = load_data()

    # 情感分析
    sentiment_df = batch_sentiment_analysis(df)
    sentiment_stats = sentiment_statistics(sentiment_df)

    # 保存情感数据
    sentiment_output = sentiment_df[['tweet_id', 'full_text', 'screen_name',
                                     'sentiment_score', 'sentiment_label', 'date']]
    sentiment_output.to_csv(OUTPUT_DIR / "sentiment_analysis.csv", index=False, encoding='utf-8-sig')
    print(f"\n情感分析结果已保存: {OUTPUT_DIR / 'sentiment_analysis.csv'}")

    # 话题聚类
    topic_data = topic_clustering(df)

    # 保存话题数据
    with open(OUTPUT_DIR / "topic_analysis.json", 'w', encoding='utf-8') as f:
        json.dump(topic_data, f, ensure_ascii=False, indent=2, cls=DateTimeEncoder)
    print(f"话题分析结果已保存: {OUTPUT_DIR / 'topic_analysis.json'}")

    # 时间序列分析
    time_series = time_series_analysis(df)

    # 保存时间序列数据
    with open(OUTPUT_DIR / "time_series.json", 'w', encoding='utf-8') as f:
        json.dump(time_series, f, ensure_ascii=False, indent=2, cls=DateTimeEncoder)
    print(f"时间序列结果已保存: {OUTPUT_DIR / 'time_series.json'}")

    # 用户行为分析
    user_behavior = user_behavior_analysis(df)

    # 保存用户行为数据
    with open(OUTPUT_DIR / "user_behavior.json", 'w', encoding='utf-8') as f:
        json.dump(user_behavior, f, ensure_ascii=False, indent=2, cls=DateTimeEncoder)
    print(f"用户行为结果已保存: {OUTPUT_DIR / 'user_behavior.json'}")

    # 保存情感统计摘要
    sentiment_summary = {
        'total_analyzed': len(sentiment_df),
        'positive_count': int((sentiment_df['sentiment_label'] == 'positive').sum()),
        'neutral_count': int((sentiment_df['sentiment_label'] == 'neutral').sum()),
        'negative_count': int((sentiment_df['sentiment_label'] == 'negative').sum()),
        'positive_rate': float((sentiment_df['sentiment_label'] == 'positive').mean()),
        'neutral_rate': float((sentiment_df['sentiment_label'] == 'neutral').mean()),
        'negative_rate': float((sentiment_df['sentiment_label'] == 'negative').mean()),
        'avg_sentiment_score': float(sentiment_df['sentiment_score'].mean())
    }

    with open(OUTPUT_DIR / "sentiment_summary.json", 'w', encoding='utf-8') as f:
        json.dump(sentiment_summary, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print("情感分析摘要")
    print("=" * 60)
    print(f"正面: {sentiment_summary['positive_rate']:.1%} ({sentiment_summary['positive_count']:,})")
    print(f"中立: {sentiment_summary['neutral_rate']:.1%} ({sentiment_summary['neutral_count']:,})")
    print(f"负面: {sentiment_summary['negative_rate']:.1%} ({sentiment_summary['negative_count']:,})")
    print(f"平均情感得分: {sentiment_summary['avg_sentiment_score']:.3f}")

    print("\n" + "=" * 60)
    print("情感分析与话题聚类完成!")
    print("=" * 60)

    return {
        'sentiment_stats': sentiment_summary,
        'topic_data': topic_data,
        'time_series': time_series,
        'user_behavior': user_behavior
    }

if __name__ == "__main__":
    main()
