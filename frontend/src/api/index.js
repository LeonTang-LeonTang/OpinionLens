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

// ─── Overview ────────────────────────────────────────────────────────────────
export const fetchOverview = async () => {
  const data = await loadJSON('overview.json')
  const sentimentData = await loadJSON('sentiment_summary.json')
  if (data && sentimentData) {
    data.sentiment = {
      positive_rate: Number((sentimentData.positive_rate * 100).toFixed(1)),
      negative_rate: Number((sentimentData.negative_rate * 100).toFixed(1)),
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

// ─── Sentiment ────────────────────────────────────────────────────────────────
export const fetchSentiment = async () => {
  const data = await loadJSON('sentiment_summary.json')
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

// ─── Topics ──────────────────────────────────────────────────────────────────
export const fetchTopics = async (limit = 20) => {
  const data = await loadJSON('topic_analysis.json')
  if (!data) return { data: { total_hashtags: 0, hot_topics: [] } }
  const hot_topics = (data.top_hashtags || []).slice(0, limit).map((t, i) => ({
    rank: i + 1,
    hashtag: t[0],
    count: t[1]
  }))
  return { data: { total_hashtags: data.total_unique_hashtags || 0, hot_topics } }
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
export const fetchTimeline = async (granularity = 'day') => {
  const data = await loadJSON('time_series.json')
  if (!data) return { data: { timeline: [], peak_days: [] } }
  const timeline = (data.daily_stats || []).map(d => ({
    date: d.date,
    tweet_count: d.tweet_count || 0,
    daily_favorites: d.total_favorites || 0,
    daily_retweets: d.total_retweets || 0,
    favorites: d.total_favorites || 0,
    retweets: d.total_retweets || 0,
    engagement: d.engagement || 0
  }))
  const peak_days = (data.top_peak_days || []).map(d => ({
    date: d.date,
    tweet_count: d.tweet_count || 0,
    total_engagement: d.engagement || 0,
    engagement: d.engagement || 0
  }))
  return { data: { timeline, peak_days } }
}

// ─── Leaders ─────────────────────────────────────────────────────────────────
export const fetchLeaders = async (limit = 20) => {
  const data = await loadJSON('opinion_leaders.json')
  if (!data || !data.slice) return { data: { leaders: [], total_leaders: 0, top3: [] } }
  const leaders = data.slice(0, limit).map(l => ({
    ...l,
    screen_name: l.screen_name || l.username || '',
    username: '@' + (l.screen_name || l.username || ''),
    rank: l.rank || l.position || 0
  }))
  const top3 = leaders.slice(0, 3)
  return { data: { leaders, total_leaders: data.length, top3 } }
}

// ─── Network ──────────────────────────────────────────────────────────────────
export const fetchNetwork = async () => {
  const data = await loadJSON('network_stats.json')
  if (!data) return { data: { stats: { nodes: 0, edges: 0 } } }
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

// ─── Communities ──────────────────────────────────────────────────────────────
export const fetchCommunities = async (limit = 10) => {
  const data = await loadJSON('communities.json')
  let communities = []
  if (Array.isArray(data)) {
    communities = data
  } else if (data && Array.isArray(data.communities)) {
    communities = data.communities
  }
  return { data: { communities: communities.slice(0, limit) } }
}

// ─── User Behavior ────────────────────────────────────────────────────────────
export const fetchUserBehavior = async () => {
  const data = await loadJSON('user_behavior.json')
  return { data: data || {} }
}

// ─── Search ──────────────────────────────────────────────────────────────────
export const searchTweets = async () => ({ data: { results: [], total: 0 } })

// ─── Advanced Analysis ─────────────────────────────────────────────────────────
// 返回 { events: [...] } 兼容 AdvancedAnalysis 页面
export const fetchBurstEvents = async () => {
  const data = await loadJSON('advanced_analysis.json')
  const events = data?.burst_events || []
  return { data: { events } }
}

// 返回 { top_suspicious: [...] } 兼容 AdvancedAnalysis 页面
export const fetchSuspiciousAccounts = async (limit = 30) => {
  const data = await loadJSON('advanced_analysis.json')
  let accounts = []
  if (data?.suspicious_accounts) {
    if (Array.isArray(data.suspicious_accounts)) {
      accounts = data.suspicious_accounts
    } else if (data.suspicious_accounts.top_suspicious) {
      accounts = data.suspicious_accounts.top_suspicious
    }
  }
  return { data: { top_suspicious: accounts.slice(0, limit) } }
}

// 返回 { events: [...] } 兼容 AdvancedAnalysis 页面
export const fetchCoordinatedBehavior = async (limit = 20) => {
  const data = await loadJSON('advanced_analysis.json')
  let events = []
  if (data?.coordinated_behavior) {
    if (Array.isArray(data.coordinated_behavior)) {
      events = data.coordinated_behavior
    } else if (data.coordinated_behavior.events) {
      events = data.coordinated_behavior.events
    }
  }
  return { data: { events: events.slice(0, limit) } }
}

// 返回 { total_chains, chains: [...] } 兼容 AdvancedAnalysis 页面
export const fetchPropagationChains = async (limit = 20) => {
  const data = await loadJSON('advanced_analysis.json')
  const pc = data?.propagation_chains || {}
  let chains = pc.representative_chains || pc.chains || []
  return {
    data: {
      total_chains: pc.total_chains || 0,
      avg_chain_length: pc.avg_chain_length || 0,
      chains: chains.slice(0, limit)
    }
  }
}

export const fetchAdvancedNetworkStats = async () => {
  const data = await loadJSON('advanced_analysis.json')
  return { data: data?.network_advanced || data?.network_stats || {} }
}

// 返回 { anomalies: [...] } 兼容 AdvancedAnalysis 页面
export const fetchAnomalies = async () => {
  const data = await loadJSON('advanced_analysis.json')
  // 原数据没有 anomalies 字段，返回空
  return { data: { anomalies: [] } }
}

export const analyzeTopic = async () => {
  const data = await loadJSON('topic_analysis.json')
  return { data: data || {} }
}

// ─── Scraping (no-op for static) ──────────────────────────────────────────────
export const scrapeTopic = async () => { throw new Error('抓取功能需要后端支持') }
export const listScrapedDatasets = async () => ({ data: { datasets: [] } })
export const analyzeScrapedDataset = async () => { throw new Error('抓取数据分析需要后端支持') }

export default {
  fetchOverview, fetchSentiment, fetchTopics, fetchTimeline,
  fetchLeaders, fetchNetwork, fetchCommunities, fetchUserBehavior,
  searchTweets, scrapeTopic, listScrapedDatasets, analyzeScrapedDataset
}
