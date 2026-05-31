"""
数据预处理脚本
功能：解压JSONL文件，清洗数据，标准化格式，保存为处理后的数据
"""

import os
import json
import zipfile
import pandas as pd
from datetime import datetime
from pathlib import Path

# 配置路径
DATASET_DIR = Path("dataset")
OUTPUT_DIR = Path("data_processed")

def unzip_files():
    """解压所有ZIP文件"""
    print("=" * 60)
    print("步骤1: 解压数据文件")
    print("=" * 60)

    zip_files = list(DATASET_DIR.glob("*.zip"))
    extracted_files = {}

    for zip_file in zip_files:
        print(f"\n正在解压: {zip_file.name}")
        jsonl_name = zip_file.stem.replace("_no_filter_combined", "").replace("_combined", "") + ".jsonl"
        jsonl_path = DATASET_DIR / "temp" / jsonl_name

        if not jsonl_path.exists():
            with zipfile.ZipFile(zip_file, 'r') as zf:
                zf.extractall(DATASET_DIR / "temp")
            print(f"  解压完成: {jsonl_path}")
        else:
            print(f"  已存在: {jsonl_path}")

        extracted_files[zip_file.stem] = jsonl_path

    return extracted_files

def load_jsonl(file_path, max_rows=None):
    """加载JSONL文件"""
    print(f"\n加载数据: {file_path}")
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if max_rows and i >= max_rows:
                break
            try:
                data.append(json.loads(line.strip()))
            except json.JSONDecodeError:
                continue
            if (i + 1) % 50000 == 0:
                print(f"  已加载 {i + 1} 条...")

    print(f"  总共加载 {len(data)} 条数据")
    return data

def parse_date(date_str):
    """解析Twitter日期格式"""
    try:
        return datetime.strptime(date_str, "%a %b %d %H:%M:%S %z %Y")
    except:
        try:
            return datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
        except:
            return None

def standardize_record(record, source_name):
    """标准化单条记录"""
    # 提取用户信息
    user = {
        "user_id": record.get("user_id_str", ""),
        "screen_name": record.get("screen_name", ""),
        "name": record.get("name", ""),
        "followers_count": record.get("followers_count", 0),
        "friends_count": record.get("friends_count", 0),
        "statuses_count": record.get("statuses_count", 0),
        "favourites_count": record.get("favourites_count", 0),
        "location": record.get("location", ""),
        "account_created_at": parse_date(record.get("user_created_at", "")),
    }

    # 提取推文信息
    tweet = {
        "tweet_id": record.get("id_str", ""),
        "full_text": record.get("full_text", ""),
        "created_at": parse_date(record.get("created_at", "")),
        "lang": record.get("lang", ""),
        "favorite_count": record.get("favorite_count", 0),
        "retweet_count": record.get("retweet_count", 0),
        "reply_count": record.get("reply_count", 0),
        "quote_count": record.get("quote_count", 0),
        "view_count": int(record.get("view_count", 0)) if record.get("view_count", "0").isdigit() else 0,
        "is_quote_status": record.get("is_quote_status", False),
    }

    # 提取实体信息
    entities = record.get("entities", {})
    hashtags = [h.get("text", "") for h in entities.get("hashtags", [])]
    mentions = [m.get("screen_name", "") for m in entities.get("user_mentions", [])]
    urls = [u.get("expanded_url", "") for u in entities.get("urls", [])]

    # 提取回复/引用关系
    relations = {
        "in_reply_to_user_id": record.get("in_reply_to_user_id_str"),
        "in_reply_to_screen_name": record.get("in_reply_to_screen_name"),
        "in_reply_to_status_id": record.get("in_reply_to_status_id_str"),
        "quoted_tweet_status_id": record.get("quoted_tweet_status_id_str"),
        "quoted_tweet_screen_name": record.get("quoted_tweet_screen_name"),
        "retweeted_status_id": record.get("retweeted_status_id_str"),
        "retweeted_status_screen_name": record.get("retweeted_status_screen_name"),
    }

    return {
        **user,
        **tweet,
        "hashtags": hashtags,
        "mentions": mentions,
        "urls": urls,
        "has_media": "media" in entities and len(entities["media"]) > 0,
        **relations,
        "source": source_name,
        "tweet_url": record.get("tweet_url", ""),
    }

def clean_data(data, source_name):
    """清洗和标准化数据"""
    print("\n清洗数据...")
    cleaned = []
    for record in data:
        # 跳过无效记录
        if not record.get("full_text") or not record.get("id_str"):
            continue

        # 跳过删除标记
        if record.get("text") == "[]" or "delete" in record:
            continue

        cleaned.append(standardize_record(record, source_name))

    print(f"  清洗后: {len(cleaned)} 条有效数据")
    return cleaned

def compute_user_engagement_score(record):
    """计算用户参与度得分"""
    followers = max(record["followers_count"], 1)
    engagement = (
        record["favorite_count"] * 1 +
        record["retweet_count"] * 2 +
        record["reply_count"] * 2 +
        record["quote_count"] * 3
    )
    # 考虑粉丝数量的相对影响力
    return engagement * (1 + (followers / 10000) ** 0.3)

def analyze_basic_stats(df):
    """输出基本统计信息"""
    print("\n" + "=" * 60)
    print("数据统计摘要")
    print("=" * 60)

    print(f"\n总推文数: {len(df):,}")
    print(f"总用户数: {df['user_id'].nunique():,}")
    print(f"时间范围: {df['created_at'].min()} ~ {df['created_at'].max()}")

    print("\n语言分布:")
    print(df['lang'].value_counts().head(5))

    print("\n互动统计:")
    print(f"  平均点赞数: {df['favorite_count'].mean():.1f}")
    print(f"  平均转发数: {df['retweet_count'].mean():.1f}")
    print(f"  平均回复数: {df['reply_count'].mean():.1f}")

    # 高互动推文
    df['total_engagement'] = df['favorite_count'] + df['retweet_count'] + df['reply_count'] + df['quote_count']
    top_tweets = df.nlargest(5, 'total_engagement')[['screen_name', 'full_text', 'total_engagement']]
    print("\n热门推文 (Top 5):")
    for _, row in top_tweets.iterrows():
        text = row['full_text'][:50] + "..." if len(row['full_text']) > 50 else row['full_text']
        print(f"  @{row['screen_name']}: {text} [{row['total_engagement']}]")

def main():
    print("\n" + "=" * 60)
    print("舆论分析系统 - 数据预处理")
    print("=" * 60)

    OUTPUT_DIR.mkdir(exist_ok=True)

    # 解压文件
    extracted_files = unzip_files()

    # 选择主要数据源进行完整处理（中文数据）
    main_data_file = DATASET_DIR / "temp" / "takaichi_chinese_2025-10-01_2026-05-06_combined.jsonl"

    # 加载数据
    print("\n" + "=" * 60)
    print("步骤2: 加载和处理数据")
    print("=" * 60)

    raw_data = load_jsonl(main_data_file)

    # 清洗数据
    cleaned_data = clean_data(raw_data, "takaichi_chinese")

    # 转换为DataFrame
    df = pd.DataFrame(cleaned_data)

    # 转换日期列
    df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
    df['account_created_at'] = pd.to_datetime(df['account_created_at'], errors='coerce')

    # 计算参与度得分
    print("\n计算用户参与度得分...")
    df['engagement_score'] = df.apply(compute_user_engagement_score, axis=1)

    # 提取日期用于时序分析
    df['date'] = df['created_at'].dt.date
    df['hour'] = df['created_at'].dt.hour
    df['day_of_week'] = df['created_at'].dt.dayofweek

    # 基本统计
    analyze_basic_stats(df)

    # 保存处理后的数据
    print("\n" + "=" * 60)
    print("步骤3: 保存处理后的数据")
    print("=" * 60)

    # 保存完整数据
    output_path = OUTPUT_DIR / "takaichi_chinese_processed.csv"
    df.to_csv(output_path, index=False, encoding='utf-8-sig')
    print(f"\n完整数据已保存: {output_path}")

    # 提取关键数据供后续使用
    print("\n提取关键数据...")

    # 1. 传播关系数据（用于网络分析）
    network_df = df[df['in_reply_to_user_id'].notna() | df['retweeted_status_id'].notna() | df['quoted_tweet_status_id'].notna()]
    network_df[['user_id', 'screen_name', 'tweet_id', 'in_reply_to_user_id',
                'retweeted_status_id', 'quoted_tweet_status_id', 'followers_count']].to_csv(
        OUTPUT_DIR / "network_relations.csv", index=False, encoding='utf-8-sig')
    print(f"传播关系数据: {len(network_df)} 条")

    # 2. 用户统计
    user_stats = df.groupby(['user_id', 'screen_name', 'followers_count']).agg({
        'tweet_id': 'count',
        'favorite_count': 'sum',
        'retweet_count': 'sum',
        'engagement_score': 'sum'
    }).reset_index()
    user_stats.columns = ['user_id', 'screen_name', 'followers_count', 'tweet_count',
                          'total_favorites', 'total_retweets', 'total_engagement']
    user_stats.to_csv(OUTPUT_DIR / "user_stats.csv", index=False, encoding='utf-8-sig')
    print(f"用户统计数据: {len(user_stats)} 个用户")

    # 3. 时序数据
    daily_stats = df.groupby('date').agg({
        'tweet_id': 'count',
        'favorite_count': 'sum',
        'retweet_count': 'sum'
    }).reset_index()
    daily_stats.columns = ['date', 'tweet_count', 'daily_favorites', 'daily_retweets']
    daily_stats.to_csv(OUTPUT_DIR / "daily_stats.csv", index=False, encoding='utf-8-sig')
    print(f"时序统计数据: {len(daily_stats)} 天")

    # 4. 热门话题
    all_hashtags = []
    for tags in df['hashtags']:
        all_hashtags.extend(tags)
    hashtag_counts = pd.Series(all_hashtags).value_counts().head(50)
    hashtag_counts.to_csv(OUTPUT_DIR / "hashtags.csv", encoding='utf-8-sig')
    print(f"热门话题: {len(hashtag_counts)} 个")

    print("\n" + "=" * 60)
    print("数据预处理完成!")
    print("=" * 60)

    return df

if __name__ == "__main__":
    main()
