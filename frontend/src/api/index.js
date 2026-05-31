import axios from 'axios'

const DATA_BASE = '/data/data_processed'

const loadJSON = async (filename) => {
  try {
    const resp = await axios.get(`${DATA_BASE}/${filename}`)
    return resp.data
  } catch (e) {
    console.warn(`加载失败 ${filename}:`, e.message)
    return null
  }
}

export const fetchOverview = async () => {
  const data = await loadJSON('overview.json')
  const sentimentData = await loadJSON('sentiment_summary.json')
  // 嵌入情感数据，适配 Dashboard 的 overview?.sentiment?.positive_rate 等
  if (data && sentimentData) {
    data.sentiment = {
      positive_rate: (sentimentData.positive_rate * 100).toFixed(1),
      negative_rate: (sentimentData.negative_rate * 100).toFixed(1),
      positive_count: sentimentData.positive_count,
      neutral_count: sentimentData.neutral_count,
      negative_count: sentimentData.negative_count,
      positive_pct: (sentimentData.positive_rate * 100).toFixed(1),
      neutral_pct: (sentimentData.neutral_rate * 100).toFixed(1),
      negative_pct: (sentimentData.negative_rate * 100).toFixed(1)
    }
  }
  return { data }
}

export const fetchSentiment = async () => {
  const data = await loadJSON('sentiment_summary.json')
  // 前端 Dashboard 期望 .summary 下有 positive/neutral/negative
  // 但原数据直接在根级别，做适配
  if (data && !data.summary) {
    data.summary = {
      positive: data.positive_count,
      neutral: data.neutral_count,
      negative: data.negative_count,
      positive_rate: Number((data.positive_rate * 100).toFixed(1)),
      neutral_rate: Number((data.neutral_rate * 100).toFixed(1)),
      negative_rate: Number((data.negative_rate * 100).toFixed(1)),
      positive_pct: (data.positive_rate * 100).toFixed(1),
      neutral_pct: (data.neutral_rate * 100).toFixed(1),
      negative_pct: (data.negative_rate * 100).toFixed(1)
    }
  }
  return { data }
}

export const fetchTopics = async (limit = 20) => {
  const data = await loadJSON('topic_analysis.json')
  if (!data) return { data: { total_hashtags: 0, hot_topics: [] } }
  // top_hashtags 是 [[name, count], ...] 转为 [{hashtag, count}, ...]
  const hot_topics = (data.top_hashtags || []).slice(0, limit).map((t, i) => ({
    rank: i + 1,
    hashtag: t[0],
    count: t[1]
  }))
  return {
    data: {
      total_hashtags: data.total_unique_hashtags || 0,
      hot_topics
    }
  }
}

export const fetchTimeline = async (granularity = 'day') => {
  const data = await loadJSON('time_series.json')
  if (!data) return { data: { timeline: [], peak_days: [] } }
  // daily_stats: {date, tweet_count, total_favorites, total_retweets, ...}
  // Timeline.jsx expects: {date, tweet_count, daily_favorites, daily_retweets}
  const timeline = (data.daily_stats || []).map(d => ({
    date: d.date,
    tweet_count: d.tweet_count || 0,
    daily_favorites: d.total_favorites || 0,
    daily_retweets: d.total_retweets || 0,
    favorites: d.total_favorites || 0,
    retweets: d.total_retweets || 0,
    engagement: d.engagement || 0
  }))
  // top_peak_days -> peak_days
  const peak_days = (data.top_peak_days || []).map(d => ({
    date: d.date,
    tweet_count: d.tweet_count || 0,
    total_engagement: d.engagement || 0,
    engagement: d.engagement || 0
  }))
  return { data: { timeline, peak_days } }
}

export const fetchLeaders = async (limit = 20) => {
  const data = await loadJSON('opinion_leaders.json')
  if (!data || !data.slice) return { data: [] }
  const leaders = data.slice(0, limit).map(l => ({
    ...l,
    screen_name: l.screen_name || l.username || '',
    username: '@' + (l.screen_name || l.username || ''),
    rank: l.rank || l.position || 0
  }))
  return { data: leaders }
}

export const fetchNetwork = async () => {
  const data = await loadJSON('network_stats.json')
  if (!data) return { data: { stats: { nodes: 0, edges: 0 } } }
  // 前端期望 { stats: { nodes, edges, density, ... } }
  return {
    data: {
      stats: {
        nodes: data.nodes || data.node_count || 0,
        edges: data.edges || data.edge_count || 0,
        density: data.density || 0,
        avg_clustering: data.avg_clustering || 0,
        largest_component_size: data.largest_component_size || 0
      },
      ...data
    }
  }
}

export const fetchCommunities = async (limit = 10) => {
  const data = await loadJSON('communities.json')
  if (!data) return { data: { communities: [] } }
  // 原数据可能是 {communities: [...]} 或直接是数组
  const communities = Array.isArray(data) ? data : (data.communities || [])
  return { data: { communities: communities.slice(0, limit) } }
}

export const fetchUserBehavior = async () => {
  const data = await loadJSON('user_behavior.json')
  return { data: data || {} }
}

export const searchTweets = async () => ({ data: { results: [], total: 0 } })

export const fetchBurstEvents = async () => {
  const data = await loadJSON('advanced_analysis.json')
  return { data: data?.burst_events || [] }
}

export const fetchSuspiciousAccounts = async (limit = 30) => {
  const data = await loadJSON('advanced_analysis.json')
  return { data: (data?.suspicious_accounts || []).slice(0, limit) }
}

export const fetchCoordinatedBehavior = async (limit = 20) => {
  const data = await loadJSON('advanced_analysis.json')
  return { data: (data?.coordinated_behavior || []).slice(0, limit) }
}

export const fetchPropagationChains = async () => ({ data: [] })

export const fetchAdvancedNetworkStats = async () => {
  const data = await loadJSON('advanced_analysis.json')
  // network_advanced -> network_stats 适配
  const networkStats = data?.network_advanced || data?.network_stats || {}
  return { data: networkStats }
}

export const fetchAnomalies = async () => ({ data: [] })

export const analyzeTopic = async () => {
  const data = await loadJSON('topic_analysis.json')
  return { data: data || {} }
}

export const scrapeTopic = async () => { throw new Error('抓取功能需要后端支持') }
export const listScrapedDatasets = async () => ({ data: { datasets: [] } })
export const analyzeScrapedDataset = async () => { throw new Error('抓取数据分析需要后端支持') }

export default {
  fetchOverview, fetchSentiment, fetchTopics, fetchTimeline,
  fetchLeaders, fetchNetwork, fetchCommunities, fetchUserBehavior,
  searchTweets, scrapeTopic, listScrapedDatasets, analyzeScrapedDataset
}
