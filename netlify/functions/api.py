"""
Netlify Serverless Function - 舆论分析 API
将 FastAPI 后端转换为 Netlify Functions 格式
"""

import json
import os
import sys
import math
from pathlib import Path
from datetime import datetime
import pandas as pd
import urllib.parse

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent.parent))

# 数据路径
DATA_DIR = Path(__file__).parent.parent / "data_processed"

# 全局缓存
_data_cache = {}

def load_data():
    """加载所有数据到缓存"""
    global _data_cache
    
    if not _data_cache:
        print("加载数据到缓存...")
        
        # 主数据
        main_csv = DATA_DIR / "takaichi_chinese_processed.csv"
        if main_csv.exists():
            _data_cache['main'] = pd.read_csv(main_csv)
            _data_cache['main']['created_at'] = pd.to_datetime(_data_cache['main']['created_at'])
            _data_cache['main']['date'] = pd.to_datetime(_data_cache['main']['date'])
        
        # 情感摘要
        sentiment_file = DATA_DIR / "sentiment_summary.json"
        if sentiment_file.exists():
            with open(sentiment_file, 'r', encoding='utf-8') as f:
                _data_cache['sentiment'] = json.load(f)
        
        # 话题分析
        topic_file = DATA_DIR / "topic_analysis.json"
        if topic_file.exists():
            with open(topic_file, 'r', encoding='utf-8') as f:
                _data_cache['topics'] = json.load(f)
        
        # 时间序列
        time_file = DATA_DIR / "time_series.json"
        if time_file.exists():
            with open(time_file, 'r', encoding='utf-8') as f:
                _data_cache['timeline'] = json.load(f)
        
        # 网络统计
        network_file = DATA_DIR / "network_stats.json"
        if network_file.exists():
            with open(network_file, 'r', encoding='utf-8') as f:
                _data_cache['network_stats'] = json.load(f)
        
        # 意见领袖
        leaders_file = DATA_DIR / "opinion_leaders.csv"
        if leaders_file.exists():
            _data_cache['leaders'] = pd.read_csv(leaders_file)
        
        print(f"数据加载完成，缓存键: {list(_data_cache.keys())}")
    
    return _data_cache

def clean_nan(value):
    """清理NaN值"""
    if isinstance(value, float) and math.isnan(value):
        return None
    return value

def handle(event, context):
    """Netlify Function 处理程序"""
    
    # 设置 CORS 头
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Content-Type": "application/json"
    }
    
    # 处理 OPTIONS 请求
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}
    
    path = event.get("path", "")
    method = event.get("httpMethod", "GET")
    query = event.get("queryStringParameters") or {}
    
    print(f"请求: {method} {path}")
    
    try:
        # 加载数据
        data = load_data()
        
        # 路由处理
        if path == "/api/overview" or path.endswith("/overview"):
            return handle_overview(data, headers)
        
        elif path == "/api/sentiment" or path.endswith("/sentiment"):
            return handle_sentiment(data, headers)
        
        elif path == "/api/topics" or path.endswith("/topics"):
            limit = int(query.get("limit", 20))
            return handle_topics(data, headers, limit)
        
        elif path == "/api/timeline" or path.endswith("/timeline"):
            granularity = query.get("granularity", "day")
            return handle_timeline(data, headers, granularity)
        
        elif path == "/api/leaders" or path.endswith("/leaders"):
            limit = int(query.get("limit", 20))
            return handle_leaders(data, headers, limit)
        
        elif path == "/api/network" or path.endswith("/network"):
            limit = int(query.get("limit", 200))
            return handle_network(data, headers, limit)
        
        elif "/scrape/datasets" in path:
            return handle_scrape_datasets(headers)
        
        elif "/scrape/analyze/" in path:
            dataset_id = path.split("/scrape/analyze/")[-1]
            return handle_scrape_analyze(dataset_id, headers)
        
        else:
            return {
                "statusCode": 404,
                "headers": headers,
                "body": json.dumps({"error": "API endpoint not found"})
            }
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": str(e)})
        }

def handle_overview(data, headers):
    """处理概览请求"""
    main = data.get('main')
    if main is None:
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": "数据未加载"})}
    
    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({
            "topic": "高市早苗相关舆论",
            "total_tweets": int(main.shape[0]),
            "total_users": int(main['user_screen_name'].nunique()),
            "time_range": {
                "start": str(main['created_at'].min()),
                "end": str(main['created_at'].max())
            },
            "network": data.get('network_stats', {}),
            "sentiment": data.get('sentiment', {}).get('summary', {})
        })
    }

def handle_sentiment(data, headers):
    """处理情感分析请求"""
    sentiment = data.get('sentiment', {})
    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps(sentiment)
    }

def handle_topics(data, headers, limit):
    """处理话题请求"""
    topics = data.get('topics', {})
    hashtags = topics.get('top_hashtags', [])[:limit]
    
    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({
            "total_hashtags": topics.get('total_unique_hashtags', 0),
            "hot_topics": [
                {"rank": i + 1, "hashtag": tag, "count": count}
                for i, (tag, count) in enumerate(hashtags)
            ]
        })
    }

def handle_timeline(data, headers, granularity):
    """处理时间线请求"""
    timeline = data.get('timeline', {})
    
    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({
            "granularity": granularity,
            "timeline": timeline.get('daily_counts', [])[:100],
            "peak_days": timeline.get('top_peak_days', [])[:5]
        })
    }

def handle_leaders(data, headers, limit):
    """处理意见领袖请求"""
    leaders = data.get('leaders')
    if leaders is None or leaders.empty:
        return {"statusCode": 200, "headers": headers, "body": json.dumps([])}
    
    top_leaders = leaders.head(limit)
    
    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps(top_leaders.to_dict('records'))
    }

def handle_network(data, headers, limit):
    """处理网络数据请求"""
    network = data.get('network_stats', {})
    
    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({
            "nodes_count": network.get('nodes_count', 0),
            "edges_count": network.get('edges_count', 0),
            "avg_degree": network.get('avg_degree', 0),
            "density": network.get('density', 0)
        })
    }

def handle_scrape_datasets(headers):
    """列出抓取的数据集"""
    data_dir = Path(__file__).parent.parent / "data_sources"
    datasets = []
    
    if data_dir.exists():
        for f in data_dir.glob("topic_*.jsonl"):
            count = sum(1 for _ in open(f, 'r', encoding='utf-8'))
            datasets.append({
                "id": f.stem,
                "created": datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d %H:%M"),
                "count": count,
                "size": f.stat().st_size
            })
    
    datasets.sort(key=lambda x: x["created"], reverse=True)
    
    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({"datasets": datasets})
    }

def handle_scrape_analyze(dataset_id, headers):
    """分析抓取的数据集"""
    data_dir = Path(__file__).parent.parent / "data_sources"
    jsonl_file = data_dir / f"{dataset_id}.jsonl"
    
    if not jsonl_file.exists():
        return {
            "statusCode": 404,
            "headers": headers,
            "body": json.dumps({"error": "数据集不存在"})
        }
    
    # 读取数据
    items = []
    platforms = {}
    sentiments = {"positive": 0, "neutral": 0, "negative": 0}
    
    with open(jsonl_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                item = json.loads(line)
                items.append(item)
                
                # 统计平台
                platform = item.get("platform", "unknown")
                platforms[platform] = platforms.get(platform, 0) + 1
                
                # 简单情感分析
                text = (item.get("title", "") + " " + item.get("text", "")).lower()
                positive_words = ["good", "great", "excellent", "amazing", "wonderful", "best", "love", "happy", "success", "win", "支持", "点赞", "好", "棒", "赞", "优秀"]
                negative_words = ["bad", "terrible", "awful", "worst", "hate", "angry", "fail", "lose", "disaster", "坏", "差", "垃圾", "讨厌", "反对", "批评"]
                
                pos_count = sum(1 for w in positive_words if w in text)
                neg_count = sum(1 for w in negative_words if w in text)
                
                if pos_count > neg_count:
                    sentiments["positive"] += 1
                elif neg_count > pos_count:
                    sentiments["negative"] += 1
                else:
                    sentiments["neutral"] += 1
    
    # 热门条目
    top_items = sorted(items, key=lambda x: x.get("score", 0) or x.get("hot_score", 0) or 0, reverse=True)[:10]
    
    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({
            "total_matches": len(items),
            "platform_distribution": [{"name": k, "value": v} for k, v in platforms.items()],
            "sentiment": sentiments,
            "top_items": [
                {
                    "title": item.get("title") or item.get("text", "")[:100],
                    "author": item.get("author") or item.get("source", ""),
                    "platform": item.get("platform", ""),
                    "url": item.get("url", ""),
                    "score": item.get("score", 0) or item.get("hot_score", 0) or 0
                }
                for item in top_items
            ],
            "dataset_id": dataset_id
        })
    }
