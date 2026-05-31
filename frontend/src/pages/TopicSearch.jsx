import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Input, Button, Tag, Spin, List, Avatar, Statistic, Alert, Modal, Typography, Divider, Empty, Drawer, Tooltip } from 'antd'
import ReactECharts from 'echarts-for-react'
import { SearchOutlined, EyeOutlined, CommentOutlined, ArrowUpOutlined, ShareAltOutlined, UserOutlined, CalendarOutlined } from '@ant-design/icons'
import { analyzeTopic } from '../api'
import AnalysisReport from '../components/AnalysisReport'

const { Title, Text, Paragraph } = Typography

// 默认展示的案例数据
const DEFAULT_EXAMPLE = {
  keyword: '高市早苗',
  description: '日本政治家，2024年总裁选举候选人之一'
}

export default function TopicSearch() {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [showReport, setShowReport] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)

  // 组件挂载时自动加载案例数据
  useEffect(() => {
    if (!initialLoaded) {
      handleSearchWithKeyword(DEFAULT_EXAMPLE.keyword)
      setInitialLoaded(true)
    }
  }, [])

  const handleSearchWithKeyword = async (kw) => {
    if (!kw.trim()) return

    setLoading(true)
    setError(null)
    setKeyword(kw)
    try {
      const res = await analyzeTopic(kw.trim())
      setResults(res.data)
    } catch (err) {
      setError('分析失败: ' + err.message)
    }
    setLoading(false)
  }

  const handleSearch = () => handleSearchWithKeyword(keyword)

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  const showDetail = (item) => {
    setSelectedItem(item)
    setDrawerVisible(true)
  }

  const getTimelineOption = () => ({
    title: { text: '话题热度时序', left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 40, bottom: 50 },
    xAxis: {
      type: 'category',
      data: results?.daily_distribution?.map(d => d.date) || [],
      axisLabel: { rotate: 45 }
    },
    yAxis: { type: 'value', name: '推文数' },
    series: [{
      type: 'line',
      smooth: true,
      areaStyle: { color: 'rgba(102, 126, 234, 0.3)' },
      lineStyle: { color: '#667eea', width: 2 },
      data: results?.daily_distribution?.map(d => d.count) || []
    }]
  })

  const getSentimentOption = () => ({
    title: { text: '情感分布', left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'item' },
    legend: { bottom: 10, left: 'center' },
    series: [{
      type: 'pie',
      radius: ['35%', '60%'],
      center: ['50%', '50%'],
      data: [
        { value: results?.sentiment?.positive || 45, name: '正面', itemStyle: { color: '#52c41a' } },
        { value: results?.sentiment?.neutral || 35, name: '中性', itemStyle: { color: '#1890ff' } },
        { value: results?.sentiment?.negative || 20, name: '负面', itemStyle: { color: '#ff4d4f' } }
      ],
      label: { show: true, formatter: '{b}\n{d}%' }
    }]
  })

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="话题深度分析">
            <Alert
              message="通用话题分析"
              description="输入任意关键词，系统将在数据库中搜索相关推文，分析该话题的传播路径、参与者特征和影响力。"
              type="info"
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <Input
                placeholder="输入话题关键词（如：高市早苗、选举、政策等）"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={handleKeyPress}
                size="large"
                style={{ flex: 1 }}
                prefix={<SearchOutlined />}
              />
              <Button
                type="primary"
                size="large"
                onClick={handleSearch}
                loading={loading}
                icon={<SearchOutlined />}
              >
                分析
              </Button>
            </div>
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ marginRight: 8 }}>快速搜索：</Text>
              {['高市早苗', '統一教会', '总裁选举', '経済政策'].map(kw => (
                <Tag
                  key={kw}
                  style={{ cursor: 'pointer', marginRight: 8 }}
                  onClick={() => handleSearchWithKeyword(kw)}
                >
                  {kw}
                </Tag>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {loading && (
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col span={24}>
            <Card>
              <div className="loading-container">
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>正在分析话题 "{keyword}"...</div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {error && (
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col span={24}>
            <Alert message={error} type="error" showIcon />
          </Col>
        </Row>
      )}

      {results && !loading && (
        <>
          <Button
            type="text"
            onClick={() => setShowReport(!showReport)}
            style={{ marginTop: 16, marginBottom: 8, color: '#667eea' }}
          >
            {showReport ? '收起报告说明' : '展开报告说明'}
          </Button>

          {showReport && <AnalysisReport pageKey="topic_search" />}

          {/* 统计概览 */}
          <Row gutter={[8, 8]} style={{ marginTop: 12 }}>
            <Col xs={12} sm={12} md={6}>
              <Card bodyStyle={{ padding: 10 }}>
                <Statistic title="相关推文" value={results.total_matches || 0} valueStyle={{ color: '#667eea', fontSize: 16 }} />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card bodyStyle={{ padding: 10 }}>
                <Statistic title="参与用户" value={results.unique_users || 0} valueStyle={{ color: '#764ba2', fontSize: 16 }} />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card bodyStyle={{ padding: 10 }}>
                <Statistic title="总点赞" value={results.engagement?.total_favorites || 0} valueStyle={{ color: '#52c41a', fontSize: 16 }} />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card bodyStyle={{ padding: 10 }}>
                <Statistic title="总转发" value={results.engagement?.total_retweets || 0} valueStyle={{ color: '#1890ff', fontSize: 16 }} />
              </Card>
            </Col>
          </Row>

          {/* 图表 */}
          <Row gutter={[8, 8]} style={{ marginTop: 12 }}>
            <Col xs={24} lg={12}>
              <Card bodyStyle={{ padding: 10 }}>
                <ReactECharts option={getTimelineOption()} style={{ height: 260 }} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card bodyStyle={{ padding: 10 }}>
                <ReactECharts option={getSentimentOption()} style={{ height: 260 }} />
              </Card>
            </Col>
          </Row>

          {/* 热门参与者 */}
          <Row gutter={[8, 8]} style={{ marginTop: 12 }}>
            <Col xs={24} lg={12}>
              <Card bodyStyle={{ padding: 10 }} title={<span style={{ fontSize: 13 }}>热门参与者</span>}>
                <List
                  dataSource={results.top_participants || []}
                  renderItem={(item, index) => (
                    <List.Item
                      style={{ cursor: 'pointer', padding: '6px 0' }}
                      onClick={() => showDetail({ ...item, type: 'user' })}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar style={{ backgroundColor: '#667eea', width: 32, height: 32, fontSize: 12 }}>
                            {item.screen_name?.[0]?.toUpperCase()}
                          </Avatar>
                        }
                        title={<span style={{ fontSize: 12 }}>@{item.screen_name}</span>}
                        description={
                          <span style={{ fontSize: 11, color: '#888' }}>
                            发帖:{item.tweet_count} 粉丝:{(item.followers || 0).toLocaleString()}
                          </span>
                        }
                      />
                      <Tag color="blue" style={{ fontSize: 10 }}>#{index + 1}</Tag>
                    </List.Item>
                  )}
                  locale={{ emptyText: '暂无数据' }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card bodyStyle={{ padding: 10 }} title={<span style={{ fontSize: 13 }}>代表性推文</span>}>
                <List
                  dataSource={results.representative_tweets || []}
                  renderItem={(item) => (
                    <List.Item
                      style={{ cursor: 'pointer', padding: '6px 0' }}
                      onClick={() => showDetail({ ...item, type: 'tweet' })}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar style={{ backgroundColor: '#764ba2', width: 32, height: 32, fontSize: 12 }}>
                            {item.user?.[0]?.toUpperCase()}
                          </Avatar>
                        }
                        title={
                          <div>
                            <span style={{ fontSize: 12 }}>@{item.user}</span>
                            <span style={{ marginLeft: 8, color: '#888', fontSize: 10 }}>{item.date}</span>
                          </div>
                        }
                        description={
                          <div style={{ fontSize: 11, color: '#666' }}>
                            {item.text?.length > 60 ? item.text.slice(0, 60) + '...' : item.text}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                  locale={{ emptyText: '暂无数据' }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* 详情抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {selectedItem?.type === 'user' ? (
              <>
                <Avatar size={48} style={{ backgroundColor: '#667eea' }}>
                  {selectedItem?.screen_name?.[0]?.toUpperCase()}
                </Avatar>
                <div>
                  <div style={{ fontWeight: 600 }}>@{selectedItem?.screen_name}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>用户详情</Text>
                </div>
              </>
            ) : (
              <>
                <Avatar size={48} style={{ backgroundColor: '#764ba2' }}>
                  {selectedItem?.user?.[0]?.toUpperCase()}
                </Avatar>
                <div>
                  <div style={{ fontWeight: 600 }}>@{selectedItem?.user}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>推文详情</Text>
                </div>
              </>
            )}
          </div>
        }
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={520}
      >
        {selectedItem && (
          <div>
            {/* 用户类型详情 */}
            {selectedItem.type === 'user' && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <Text type="secondary">用户统计</Text>
                  <Row gutter={16} style={{ marginTop: 8 }}>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic title="发帖数" value={selectedItem.tweet_count || 0} valueStyle={{ fontSize: 18 }} />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic title="粉丝数" value={(selectedItem.followers || 0).toLocaleString()} valueStyle={{ fontSize: 18 }} />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic title="获赞数" value={(selectedItem.total_favorites || 0).toLocaleString()} valueStyle={{ fontSize: 18 }} />
                      </Card>
                    </Col>
                  </Row>
                </div>
                <Divider />
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <Button type="link" href={`https://twitter.com/${selectedItem.screen_name}`} target="_blank">
                    在 Twitter 查看该用户 →
                  </Button>
                </div>
              </>
            )}

            {/* 推文类型详情 */}
            {selectedItem.type === 'tweet' && (
              <>
                <Paragraph style={{ fontSize: 16, lineHeight: 1.8, marginBottom: 24 }}>
                  {selectedItem.text || '（内容不可用）'}
                </Paragraph>

                <Divider />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <div>
                    <Text type="secondary"><CalendarOutlined /> 发布时间</Text>
                    <div style={{ fontWeight: 500 }}>{selectedItem.date}</div>
                  </div>
                  <div>
                    <Text type="secondary"><ShareAltOutlined /> 互动数</Text>
                    <div style={{ fontWeight: 500, color: '#f5576c' }}>{selectedItem.engagement}</div>
                  </div>
                </div>

                <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 24 }}>
                  <Text type="secondary">用户信息</Text>
                  <div style={{ marginTop: 8 }}>
                    <span>@</span><strong>{selectedItem.user}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <Button type="primary" href={selectedItem.url || `https://twitter.com/${selectedItem.user}`} target="_blank">
                    在 Twitter 查看原文 →
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
