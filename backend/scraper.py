"""
多平台话题抓取 API
支持 Reddit、微博、YouTube、新闻 RSS
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx
import feedparser
import re
import json
import uuid
from datetime import datetime
from pathlib import Path
import urllib.parse

router = APIRouter()

# Reddit API
REDDIT_BASE = "https://www.reddit.com"

# YouTube API Key (如果有的话)
YOUTUBE_API_KEY = ""  # 用户可以配置

# 新闻 RSS 源 - 增加更多来源
RSS_SOURCES = [
    # 主流英文媒体
    {"name": "BBC World", "url": "http://feeds.bbci.co.uk/news/world/rss.xml"},
    {"name": "Reuters World", "url": "https://feeds.reuters.com/reuters/worldnews"},
    {"name": "NYT World", "url": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"},
    {"name": "Al Jazeera", "url": "https://www.aljazeera.com/xml/rss/all.xml"},
    {"name": "CNN", "url": "http://rss.cnn.com/rss/edition_world.rss"},
    # 科技新闻
    {"name": "TechCrunch", "url": "https://techcrunch.com/feed/"},
    {"name": "Ars Technica", "url": "https://feeds.arstechnica.com/arstechnica/index"},
    # 商业新闻
    {"name": "CNBC", "url": "https://www.cnbc.com/id/100003114/device/rss/rss.html"},
    # 日本/亚洲新闻
    {"name": "NHK World", "url": "https://www3.nhk.or.jp/rss/news/cat0.xml"},
]

# 微博热搜 RSS (非官方，但可用)
WEIBO_RSS = "https://rsshub.app/weibo/hot"

class ScrapeRequest(BaseModel):
    keyword: str
    platforms: List[str] = ["reddit", "rss"]
    max_results: int = 500  # 增加默认数量

def parse_reddit_json(json_data: dict, keyword: str) -> List[dict]:
    """解析 Reddit JSON 数据"""
    results = []
    posts = json_data.get("data", {}).get("children", [])
    
    for post in posts:
        post_data = post.get("data", {})
        title = post_data.get("title", "")
        selftext = post_data.get("selftext", "")
        combined_text = f"{title} {selftext}".lower()
        
        if keyword.lower() in combined_text:
            results.append({
                "platform": "reddit",
                "post_id": post_data.get("id", ""),
                "author": post_data.get("author", ""),
                "title": title,
                "text": selftext,
                "url": f"https://reddit.com{post_data.get('permalink', '')}",
                "score": post_data.get("score", 0),
                "num_comments": post_data.get("num_comments", 0),
                "created_utc": post_data.get("created_utc", 0),
                "subreddit": post_data.get("subreddit", ""),
                "keyword_matched": keyword
            })
    
    return results

def parse_rss_feed(feed_url: str, keyword: str) -> List[dict]:
    """解析 RSS feed"""
    results = []
    try:
        feed = feedparser.parse(feed_url)
        for entry in feed.entries:
            title = entry.get("title", "")
            summary = ""
            if hasattr(entry, "summary"):
                summary = re.sub(r'<[^>]+>', '', entry.summary)
            elif hasattr(entry, "description"):
                summary = re.sub(r'<[^>]+>', '', entry.description)
            
            combined = f"{title} {summary}".lower()
            
            # 如果没有关键词，返回所有条目；否则过滤匹配的
            if not keyword or keyword.lower() in combined:
                results.append({
                    "platform": "rss",
                    "source": feed.feed.get("title", feed_url),
                    "title": title,
                    "text": summary[:500] if summary else "",
                    "url": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "keyword_matched": keyword if keyword else "all"
                })
    except Exception as e:
        print(f"RSS 解析错误 {feed_url}: {e}")
    
    return results

def parse_weibo_html(html_content: str, keyword: str) -> List[dict]:
    """解析微博热搜页面"""
    results = []
    try:
        # 微博热搜是 HTML 格式，提取链接和标题
        # 简化解析
        pattern = r'<a[^>]*href="([^"]*)"[^>]*>([^<]*)</a>'
        matches = re.findall(pattern, html_content)
        
        for href, title in matches[:50]:  # 取前50条
            title = re.sub(r'<[^>]+>', '', title).strip()
            if keyword.lower() in title.lower() or not keyword:
                if href.startswith('/'):
                    href = f"https://weibo.com{href}"
                results.append({
                    "platform": "weibo",
                    "title": title,
                    "text": title,
                    "url": href,
                    "keyword_matched": keyword if keyword else "all"
                })
    except Exception as e:
        print(f"微博解析错误: {e}")
    return results

def parse_youtube_response(data: dict, keyword: str) -> List[dict]:
    """解析 YouTube 搜索结果"""
    results = []
    items = data.get("items", [])
    
    for item in items:
        snippet = item.get("snippet", {})
        title = snippet.get("title", "")
        description = snippet.get("description", "")
        
        if keyword.lower() in (title + description).lower():
            results.append({
                "platform": "youtube",
                "video_id": item.get("id", {}).get("videoId", ""),
                "title": title,
                "text": description[:500],
                "url": f"https://youtube.com/watch?v={item.get('id', {}).get('videoId', '')}",
                "channel": snippet.get("channelTitle", ""),
                "published_at": snippet.get("publishedAt", ""),
                "view_count": snippet.get("viewCount", "0"),
                "keyword_matched": keyword
            })
    
    return results

async def scrape_reddit(keyword: str, max_results: int) -> List[dict]:
    """从 Reddit 抓取包含关键词的帖子 - 支持分页"""
    results = []
    
    headers = {"User-Agent": "OpinionLens/1.0 (research)"}
    encoded_keyword = urllib.parse.quote(keyword)
    
    # Pushshift 支持分页，每次最多100条
    page_size = 100
    after = None
    
    print(f"开始抓取 Reddit，最多 {max_results} 条...")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        while len(results) < max_results:
            try:
                url = f"https://api.pullpush.io/reddit/search/submission/?q={encoded_keyword}&limit={page_size}&sort=score"
                if after:
                    url += f"&after={after}"
                
                response = await client.get(url, headers=headers)
                
                if response.status_code != 200:
                    print(f"Pushshift 状态码: {response.status_code}")
                    break
                    
                data = response.json()
                posts = data.get("data", [])
                
                if not posts:
                    break
                
                for post in posts:
                    if len(results) >= max_results:
                        break
                    combined = f"{post.get('title', '')} {post.get('selftext', '')}".lower()
                    if keyword.lower() in combined:
                        results.append({
                            "platform": "reddit",
                            "post_id": post.get("id", ""),
                            "author": post.get("author", ""),
                            "title": post.get("title", ""),
                            "text": post.get("selftext", ""),
                            "url": f"https://reddit.com{post.get('permalink', '')}",
                            "score": post.get("score", 0),
                            "num_comments": post.get("num_comments", 0),
                            "created_utc": post.get("created_utc", 0),
                            "subreddit": post.get("subreddit", ""),
                            "keyword_matched": keyword
                        })
                
                print(f"Pushshift 第 {len(results)} 条...")
                
                # 更新 after 用于下一页
                after = posts[-1].get("created_utc")
                if not after:
                    break
                    
            except Exception as e:
                print(f"Pushshift 错误: {e}")
                break
    
    print(f"Reddit 共找到 {len(results)} 条")
    return results[:max_results]

async def scrape_weibo(keyword: str, max_results: int) -> List[dict]:
    """从微博抓取热搜数据"""
    results = []
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = "https://weibo.com/ajax/statuses/hot_band"
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Referer": "https://weibo.com"
            }
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                band_list = data.get("data", {}).get("band_list", [])
                
                # 先过滤匹配的
                matched = []
                unmatched = []
                for item in band_list[:max_results]:
                    word = item.get("word", "")
                    if keyword.lower() in word.lower():
                        matched.append({
                            "platform": "weibo",
                            "title": word,
                            "text": f"微博热搜: {word}",
                            "url": f"https://s.weibo.com/weibo?q={urllib.parse.quote(word)}",
                            "hot_score": item.get("raw_hot", 0),
                            "keyword_matched": keyword
                        })
                    else:
                        unmatched.append({
                            "platform": "weibo",
                            "title": word,
                            "text": f"微博热搜: {word}",
                            "url": f"https://s.weibo.com/weibo?q={urllib.parse.quote(word)}",
                            "hot_score": item.get("raw_hot", 0),
                            "keyword_matched": "trending"
                        })
                
                # 如果匹配太少（<10条），补充热搜
                if len(matched) < 10 and keyword:
                    results.extend(matched)
                    results.extend(unmatched[:max(50, max_results - len(matched))])
                else:
                    results = matched[:max_results]
                    
                print(f"微博热搜: 找到 {len(results)} 条（匹配 {len(matched)} 条 + 热门补充 {len(results) - len(matched)} 条）")
    except Exception as e:
        print(f"微博抓取错误: {e}")
        
        # 备选：RSSHub 代理
        try:
            rss_url = f"https://rsshub.app/weibo/hot"
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(rss_url)
                if response.status_code == 200:
                    results.extend(parse_weibo_html(response.text, keyword)[:max_results])
                    print(f"微博 RSS: 找到 {len(results)} 条")
        except Exception as e2:
            print(f"微博 RSS 错误: {e2}")
    
    return results[:max_results]

async def scrape_youtube(keyword: str, max_results: int, api_key: str = None) -> List[dict]:
    """从 YouTube 抓取视频"""
    results = []
    
    if not api_key:
        print("YouTube API Key 未配置，跳过")
        return results
    
    try:
        encoded_keyword = urllib.parse.quote(keyword)
        url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={encoded_keyword}&maxResults={min(max_results, 50)}&type=video&key={api_key}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                results.extend(parse_youtube_response(data, keyword))
                print(f"YouTube: 找到 {len(results)} 条")
    except Exception as e:
        print(f"YouTube 错误: {e}")
    
    return results[:max_results]

async def scrape_rss_feeds(keyword: str) -> List[dict]:
    """从新闻 RSS 源抓取"""
    results = []
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for source in RSS_SOURCES:
            try:
                response = await client.get(source["url"], timeout=15.0)
                if response.status_code == 200:
                    feed_results = parse_rss_feed(response.text, keyword)
                    results.extend(feed_results)
                    print(f"{source['name']}: 找到 {len(feed_results)} 条")
            except Exception as e:
                print(f"RSS {source['name']} 错误: {e}")
    
    return results

@router.post("/scrape/topic")
async def scrape_topic(request: ScrapeRequest):
    """
    多平台话题抓取 API
    
    支持平台:
    - reddit: Reddit 社区讨论
    - weibo: 微博热搜
    - youtube: YouTube 视频 (需要 API Key)
    - rss: 新闻 RSS 聚合
    
    配额说明 (YouTube):
    - 免费配额: 每天 10,000 单位
    - 每次搜索消耗 100 单位
    - 每次视频详情消耗 1 单位
    - 相当于每天最多 100 次搜索
    """
    try:
        all_results = []
        
        # Reddit
        if "reddit" in request.platforms:
            reddit_results = await scrape_reddit(request.keyword, request.max_results)
            all_results.extend(reddit_results)
        
        # 微博
        if "weibo" in request.platforms:
            weibo_results = await scrape_weibo(request.keyword, request.max_results)
            all_results.extend(weibo_results)
        
        # YouTube
        if "youtube" in request.platforms:
            yt_results = await scrape_youtube(request.keyword, request.max_results, YOUTUBE_API_KEY)
            all_results.extend(yt_results)
        
        # RSS
        if "rss" in request.platforms:
            rss_results = await scrape_rss_feeds(request.keyword)
            all_results.extend(rss_results)
        
        # 生成数据集
        dataset_id = f"topic_{request.keyword}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        dataset_dir = Path(__file__).parent.parent / "data_sources"
        dataset_dir.mkdir(exist_ok=True)
        
        # 保存为 jsonl
        output_file = dataset_dir / f"{dataset_id}.jsonl"
        with open(output_file, 'w', encoding='utf-8') as f:
            for item in all_results:
                f.write(json.dumps(item, ensure_ascii=False) + '\n')
        
        return {
            "success": True,
            "dataset_id": dataset_id,
            "total": len(all_results),
            "results": {
                "reddit": {"count": len([r for r in all_results if r["platform"] == "reddit"])},
                "weibo": {"count": len([r for r in all_results if r["platform"] == "weibo"])},
                "youtube": {"count": len([r for r in all_results if r["platform"] == "youtube"])},
                "rss": {"count": len([r for r in all_results if r["platform"] == "rss"])}
            },
            "message": f"成功抓取 {len(all_results)} 条数据"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scrape/datasets")
async def list_datasets():
    """列出已抓取的数据集"""
    dataset_dir = Path(__file__).parent.parent / "data_sources"
    dataset_dir.mkdir(exist_ok=True)

    datasets = []
    for f in dataset_dir.glob("topic_*.jsonl"):
        with open(f, 'r', encoding='utf-8') as file:
            first_line = file.readline()
            if first_line:
                sample = json.loads(first_line)
                # 统计总行数
                count = sum(1 for _ in open(f, 'r', encoding='utf-8'))
                datasets.append({
                    "id": f.stem,
                    "keyword": sample.get("keyword_matched", ""),
                    "platform": sample.get("platform", ""),
                    "created": datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d %H:%M"),
                    "count": count,
                    "size": f.stat().st_size
                })

    datasets.sort(key=lambda x: x["created"], reverse=True)
    return {"datasets": datasets}

@router.get("/scrape/analyze/{dataset_id}")
async def analyze_scraped_dataset(dataset_id: str):
    """分析指定的抓取数据集"""
    dataset_dir = Path(__file__).parent.parent / "data_sources"
    jsonl_file = dataset_dir / f"{dataset_id}.jsonl"

    if not jsonl_file.exists():
        raise HTTPException(status_code=404, detail="数据集不存在")

    # 读取所有数据
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

                # 简单情感分析（基于关键词）
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

    # 统计时间分布（如果有时间字段）
    daily_dist = {}
    for item in items:
        # 尝试从各种字段提取时间
        created = item.get("created_utc") or item.get("published") or item.get("created")
        if created:
            if isinstance(created, (int, float)):
                # Unix timestamp
                date_str = datetime.fromtimestamp(created).strftime("%Y-%m-%d")
            else:
                # ISO string
                try:
                    date_str = datetime.fromisoformat(str(created)[:10]).strftime("%Y-%m-%d")
                except:
                    date_str = str(created)[:10]
            daily_dist[date_str] = daily_dist.get(date_str, 0) + 1

    # 热门条目
    top_items = sorted(items, key=lambda x: x.get("score", 0) or x.get("hot_score", 0) or 0, reverse=True)[:10]

    # 平台分布
    platform_dist = [{"name": k, "value": v} for k, v in platforms.items()]

    return {
        "total_matches": len(items),
        "platform_distribution": platform_dist,
        "sentiment": sentiments,
        "daily_distribution": [{"date": k, "count": v} for k, v in sorted(daily_dist.items())],
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
    }
