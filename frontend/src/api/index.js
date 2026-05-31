import { EMBEDDED_DATA } from '../data/embeddedData'

// 所有API直接从嵌入数据返回，不再有任何网络请求

export const fetchOverview = async () => {
  return { data: EMBEDDED_DATA.overview }
}

export const fetchSentiment = async () => {
  return { data: { summary: EMBEDDED_DATA.sentiment.summary } }
}

export const fetchTopics = async (limit = 20) => {
  const topics = EMBEDDED_DATA.topics
  return { data: {
    total_hashtags: topics.total_hashtags,
    hot_topics: topics.hot_topics.slice(0, limit)
  }}
}

export const fetchTimeline = async (granularity = 'day') => {
  return { data: EMBEDDED_DATA.timeline }
}

export const fetchLeaders = async (limit = 20) => {
  const leaders = EMBEDDED_DATA.leaders
  return { data: {
    leaders: leaders.leaders.slice(0, limit),
    total_leaders: leaders.total_leaders,
    top3: leaders.top3
  }}
}

export const fetchNetwork = async () => {
  return { data: EMBEDDED_DATA.network }
}

export const fetchCommunities = async (limit = 10) => {
  return { data: { communities: EMBEDDED_DATA.communities.communities.slice(0, limit) } }
}

export const fetchUserBehavior = async () => {
  return { data: {} }
}

export const searchTweets = async () => ({ data: { results: [], total: 0 } })

// Advanced Analysis
export const fetchBurstEvents = async () => {
  return { data: { events: EMBEDDED_DATA.advanced.burst_events } }
}

export const fetchSuspiciousAccounts = async (limit = 30) => {
  const sa = EMBEDDED_DATA.advanced.suspicious_accounts
  return { data: { ...sa, top_suspicious: sa.top_suspicious.slice(0, limit) } }
}

export const fetchCoordinatedBehavior = async (limit = 20) => {
  const cb = EMBEDDED_DATA.advanced.coordinated_behavior
  return { data: { events: cb.events.slice(0, limit), total_events: cb.total_events } }
}

export const fetchPropagationChains = async (limit = 20) => {
  const pc = EMBEDDED_DATA.advanced.propagation_chains
  return { data: { chains: pc.representative_chains.slice(0, limit), total_chains: pc.total_chains, avg_chain_length: pc.avg_chain_length } }
}

export const fetchAdvancedNetworkStats = async () => {
  return { data: {} }
}

export const fetchAnomalies = async () => {
  return { data: { anomalies: [] } }
}

// TopicSearch - 从预计算数据中查找，或使用默认关键词
export const analyzeTopic = async (keyword = '高市早苗') => {
  const precomputed = EMBEDDED_DATA.topic_search
  if (precomputed && precomputed[keyword]) {
    return { data: precomputed[keyword] }
  }
  // 默认返回高市早苗数据
  if (precomputed && precomputed['高市早苗']) {
    return { data: precomputed['高市早苗'] }
  }
  return { data: { total_matches: 0, unique_users: 0, engagement: {}, daily_distribution: [], sentiment: {}, top_participants: [], representative_tweets: [] } }
}

// Scraping (no-op)
export const scrapeTopic = async () => { throw new Error('抓取功能需要后端支持') }
export const listScrapedDatasets = async () => ({ data: { datasets: [] } })
export const analyzeScrapedDataset = async () => { throw new Error('抓取数据分析需要后端支持') }

export default {
  fetchOverview, fetchSentiment, fetchTopics, fetchTimeline,
  fetchLeaders, fetchNetwork, fetchCommunities, fetchUserBehavior,
  searchTweets, scrapeTopic, listScrapedDatasets, analyzeScrapedDataset
}
