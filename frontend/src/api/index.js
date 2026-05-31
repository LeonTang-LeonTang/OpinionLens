import axios from 'axios'

const API_BASE = '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000
})

export const fetchOverview = () => api.get('/overview')
export const fetchSentiment = (params) => api.get('/sentiment', { params })
export const fetchTopics = (limit = 20) => api.get(`/topics?limit=${limit}`)
export const fetchTimeline = (granularity = 'day') => api.get(`/timeline?granularity=${granularity}`)
export const fetchLeaders = (limit = 20, sortBy = 'influence_score') =>
  api.get(`/leaders?limit=${limit}&sort_by=${sortBy}`)
export const fetchNetwork = (limit = 200) => api.get(`/network?limit=${limit}`)
export const fetchCommunities = (limit = 10) => api.get(`/communities?limit=${limit}`)
export const fetchUserBehavior = () => api.get('/user-behavior')
export const searchTweets = (keyword, limit = 20) =>
  api.get(`/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`)

// 高级分析API
export const fetchBurstEvents = () => api.get('/advanced/burst-events')
export const fetchSuspiciousAccounts = (limit = 30) => api.get(`/advanced/suspicious-accounts?limit=${limit}`)
export const fetchCoordinatedBehavior = (limit = 20) => api.get(`/advanced/coordinated?limit=${limit}`)
export const fetchPropagationChains = (limit = 20) => api.get(`/advanced/propagation?limit=${limit}`)
export const fetchAdvancedNetworkStats = () => api.get('/advanced/network-stats')
export const fetchAnomalies = () => api.get('/advanced/anomalies')
export const analyzeTopic = (keyword, days = 30) => api.get(`/topic-analysis?keyword=${encodeURIComponent(keyword)}&days=${days}`)

// 抓取API
export const scrapeTopic = (data) => api.post('/scrape/topic', data)
export const listScrapedDatasets = () => api.get('/scrape/datasets')
export const analyzeScrapedDataset = (datasetId) => api.get(`/scrape/analyze/${datasetId}`)

export default api
