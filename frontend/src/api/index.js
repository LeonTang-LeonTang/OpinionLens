import axios from 'axios'

const API_BASE = '' // 使用静态数据
const DATA_BASE = '/data/data_processed'

// 加载静态JSON数据
const loadJSON = async (filename) => {
  try {
    const response = await axios.get(`${DATA_BASE}/${filename}`)
    return response.data
  } catch (error) {
    console.warn(`无法加载 ${filename}:`, error.message)
    return null
  }
}

// API 函数 - 从静态文件读取
export const fetchOverview = async () => {
  const main = await loadJSON('overview.json')
  const network = await loadJSON('network_stats.json')
  const sentiment = await loadJSON('sentiment_summary.json')
  
  return { data: { ...main, network, sentiment } }
}

export const fetchSentiment = async () => {
  const data = await loadJSON('sentiment_summary.json')
  return { data }
}

export const fetchTopics = async (limit = 20) => {
  const data = await loadJSON('topic_analysis.json')
  if (!data) return { data: { total_hashtags: 0, hot_topics: [] } }
  const hashtags = data.top_hashtags?.slice(0, limit) || []
  return {
    data: {
      total_hashtags: data.total_unique_hashtags || 0,
      hot_topics: hashtags.map((tag, i) => ({ rank: i + 1, hashtag: tag[0], count: tag[1] }))
    }
  }
}

export const fetchTimeline = async (granularity = 'day') => {
  const data = await loadJSON('time_series.json')
  return { data: data || { timeline: [], peak_days: [] } }
}

export const fetchLeaders = async (limit = 20, sortBy = 'influence_score') => {
  const data = await loadJSON('opinion_leaders.json')
  if (!data || !data.slice) return { data: [] }
  return { data: data.slice(0, limit) }
}

export const fetchNetwork = async (limit = 200) => {
  const data = await loadJSON('network_stats.json')
  return { data: data || { nodes_count: 0, edges_count: 0 } }
}

export const fetchCommunities = async (limit = 10) => {
  const data = await loadJSON('communities.json')
  return { data: data?.communities?.slice(0, limit) || [] }
}

export const fetchUserBehavior = async () => {
  const data = await loadJSON('user_behavior.json')
  return { data: data || {} }
}

export const searchTweets = async (keyword, limit = 20) => {
  // 静态模式下不支持搜索
  return { data: { results: [], total: 0 } }
}

// 高级分析API
export const fetchBurstEvents = async () => {
  const data = await loadJSON('advanced_analysis.json')
  return { data: data?.burst_events || [] }
}

export const fetchSuspiciousAccounts = async (limit = 30) => {
  const data = await loadJSON('advanced_analysis.json')
  return { data: data?.suspicious_accounts?.slice(0, limit) || [] }
}

export const fetchCoordinatedBehavior = async (limit = 20) => {
  const data = await loadJSON('advanced_analysis.json')
  return { data: data?.coordinated_behavior?.slice(0, limit) || [] }
}

export const fetchPropagationChains = async (limit = 20) => {
  return { data: [] }
}

export const fetchAdvancedNetworkStats = async () => {
  const data = await loadJSON('advanced_analysis.json')
  return { data: data?.network_stats || {} }
}

export const fetchAnomalies = async () => {
  return { data: [] }
}

export const analyzeTopic = async (keyword, days = 30) => {
  const data = await loadJSON('topic_analysis.json')
  return { data: data || {} }
}

// 抓取API - 需要后端支持
export const scrapeTopic = async (data) => {
  throw new Error('抓取功能需要后端服务支持')
}

export const listScrapedDatasets = async () => {
  return { data: { datasets: [] } }
}

export const analyzeScrapedDataset = async (datasetId) => {
  throw new Error('抓取数据分析需要后端服务支持')
}

export default {
  fetchOverview, fetchSentiment, fetchTopics, fetchTimeline,
  fetchLeaders, fetchNetwork, fetchCommunities, fetchUserBehavior,
  searchTweets, scrapeTopic, listScrapedDatasets, analyzeScrapedDataset
}
