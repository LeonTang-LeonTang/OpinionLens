import { EMBEDDED_DATA } from '../data/embeddedData'

// 所有API直接从嵌入数据返回，不再有任何网络请求

export const fetchOverview = async () => {
  return { data: EMBEDDED_DATA.overview }
}

export const fetchSentiment = async () => {
  return { data: EMBEDDED_DATA.sentiment }
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
  return { data: { top_suspicious: EMBEDDED_DATA.advanced.suspicious_accounts.top_suspicious.slice(0, limit) } }
}

export const fetchCoordinatedBehavior = async (limit = 20) => {
  return { data: { events: EMBEDDED_DATA.advanced.coordinated_behavior.events.slice(0, limit) } }
}

export const fetchPropagationChains = async (limit = 20) => {
  const pc = EMBEDDED_DATA.advanced.propagation_chains
  return { data: { chains: pc.chains.slice(0, limit), total_chains: pc.total_chains, avg_chain_length: pc.avg_chain_length } }
}

export const fetchAdvancedNetworkStats = async () => {
  return { data: {} }
}

export const fetchAnomalies = async () => {
  return { data: { anomalies: [] } }
}

export const analyzeTopic = async () => {
  return { data: EMBEDDED_DATA.topics }
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
