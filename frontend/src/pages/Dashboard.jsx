import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Spin, Alert, Tabs, List, Avatar, Tag, message } from 'antd'
import ReactECharts from 'echarts-for-react'
import { FileTextOutlined, GlobalOutlined, LinkOutlined, HeartOutlined } from '@ant-design/icons'
import { fetchOverview, fetchSentiment, fetchTopics, fetchTimeline, analyzeScrapedDataset } from '../api'

const { TabPane } = Tabs

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [dataType, setDataType] = useState('default') // 'default' or 'scraped'
  const [scrapedData, setScrapedData] = useState(null)
  const [overview, setOverview] = useState(null)
  const [sentiment, setSentiment] = useState(null)
  const [topics, setTopics] = useState(null)
  const [timeline, setTimeline] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setLoading(true)
    
    // 从 URL 解析 scraped 参数
    const hash = window.location.hash
    let scrapedId = null
    if (hash.includes('scraped=')) {
      const match = hash.match(/scraped=([^&]+)/)
      if (match) {
        scrapedId = decodeURIComponent(match[1])
      }
    }

    if (scrapedId) {
      console.log('加载抓取数据:', scrapedId)
      loadScrapedData(scrapedId)
    } else {
      loadDefaultData()
    }
  }

  const loadScrapedData = async (datasetId) => {
    setDataType('scraped')
    try {
      const res = await analyzeScrapedDataset(datasetId)
      setScrapedData(res.data)
      message.success(`已加载数据集: ${datasetId}`)
    } catch (error) {
      console.error('加载抓取数据失败:', error)
      message.error('加载抓取数据失败: ' + error.message)
    }
    setLoading(false)
  }

  const loadDefaultData = async () => {
    setDataType('default')
    try {
      const [ovRes, sentRes, topicRes, timeRes] = await Promise.all([
        fetchOverview(),
        fetchSentiment(),
        fetchTopics(10),
        fetchTimeline('day')
      ])
      setOverview(ovRes.data)
      setSentiment(sentRes.data)
      setTopics(topicRes.data)
      setTimeline(timeRes.data)
    } catch (error) {
      console.error('加载数据失败:', error)
      message.error('加载数据失败: ' + error.message)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载中...</div>
      </div>
    )
  }

  // 抓取数据视图
  if (dataType === 'scraped' && scrapedData) {
    return (
      <div>
        <Alert
          message="抓取数据分析"
          description={`数据集: ${scrapedData.dataset_id} | 共 ${scrapedData.total_matches} 条数据`}
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 统计卡片 */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card><Statistic title="总条目" value={scrapedData.total_matches || 0} prefix={<FileTextOutlined />} /></Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card><Statistic title="平台数" value={scrapedData.platform_distribution?.length || 0} prefix={<GlobalOutlined />} /></Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card><Statistic title="正面" value={scrapedData.sentiment?.positive || 0} valueStyle={{ color: '#52c41a' }} /></Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card><Statistic title="负面" value={scrapedData.sentiment?.negative || 0} valueStyle={{ color: '#ff4d4f' }} /></Card>
          </Col>
        </Row>

        {/* 图表 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card title="平台分布">
              <ReactECharts
                option={{
                  tooltip: { trigger: 'item' },
                  series: [{
                    type: 'pie',
                    radius: ['35%', '60%'],
                    data: (scrapedData.platform_distribution || []).map(p => ({
                      name: p.name,
                      value: p.value,
                      itemStyle: {
                        color: p.name === 'reddit' ? '#ff4500' : p.name === 'weibo' ? '#fa541c' : '#1890ff'
                      }
                    }))
                  }]
                }}
                style={{ height: 250 }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="情感分布">
              <ReactECharts
                option={{
                  tooltip: { trigger: 'item' },
                  legend: { bottom: 0 },
                  series: [{
                    type: 'pie',
                    radius: ['35%', '60%'],
                    data: [
                      { name: '正面', value: scrapedData.sentiment?.positive || 0, itemStyle: { color: '#52c41a' } },
                      { name: '中立', value: scrapedData.sentiment?.neutral || 0, itemStyle: { color: '#1890ff' } },
                      { name: '负面', value: scrapedData.sentiment?.negative || 0, itemStyle: { color: '#ff4d4f' } }
                    ]
                  }]
                }}
                style={{ height: 250 }}
              />
            </Card>
          </Col>
        </Row>

        {/* 热门条目 */}
        <Card title="热门条目" style={{ marginTop: 16 }}>
          <List
            dataSource={scrapedData.top_items || []}
            renderItem={(item, index) => (
              <List.Item extra={<a href={item.url} target="_blank" rel="noopener noreferrer"><LinkOutlined /> 查看</a>}>
                <List.Item.Meta
                  avatar={<Avatar style={{ backgroundColor: index < 3 ? '#667eea' : '#764ba2' }}>{index + 1}</Avatar>}
                  title={<><Tag>{item.platform}</Tag> {item.title}</>}
                  description={`来源: ${item.author} | 热度: ${item.score}`}
                />
              </List.Item>
            )}
          />
        </Card>
      </div>
    )
  }

  // 默认数据视图
  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="总推文" value={overview?.total_tweets || 0} prefix={<FileTextOutlined />} valueStyle={{ color: '#667eea' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="总用户" value={overview?.total_users || 0} valueStyle={{ color: '#764ba2' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="正面率" value={(overview?.sentiment?.positive_rate || 0).toFixed(1) + '%'} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="负面率" value={(overview?.sentiment?.negative_rate || 0).toFixed(1) + '%'} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
      </Row>

      {/* 图表 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="情感分布">
            <ReactECharts
              option={{
                tooltip: { trigger: 'item' },
                legend: { bottom: 0 },
                series: [{
                  type: 'pie',
                  radius: ['35%', '60%'],
                  data: [
                    { name: '正面', value: sentiment?.summary?.positive || 0, itemStyle: { color: '#52c41a' } },
                    { name: '中立', value: sentiment?.summary?.neutral || 0, itemStyle: { color: '#1890ff' } },
                    { name: '负面', value: sentiment?.summary?.negative || 0, itemStyle: { color: '#ff4d4f' } }
                  ]
                }]
              }}
              style={{ height: 250 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="每日趋势">
            <ReactECharts
              option={{
                tooltip: { trigger: 'axis' },
                grid: { left: 50, right: 20, top: 20, bottom: 40 },
                xAxis: { type: 'category', data: (timeline?.timeline || []).map(d => d.date?.slice(0, 10)) },
                yAxis: { type: 'value', name: '推文数' },
                series: [{
                  type: 'bar',
                  data: (timeline?.timeline || []).map(d => d.tweet_count || 0)
                }]
              }}
              style={{ height: 250 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 热门话题 */}
      <Card title="热门话题 Top 10" style={{ marginTop: 16 }}>
        <List
          dataSource={(topics?.hot_topics || []).slice(0, 10)}
          renderItem={(item, index) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar style={{ backgroundColor: index < 3 ? '#667eea' : '#764ba2' }}>{index + 1}</Avatar>}
                title={item.hashtag}
                description={`出现 ${item.count} 次`}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}
