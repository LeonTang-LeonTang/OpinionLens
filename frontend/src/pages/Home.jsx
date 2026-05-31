import React, { useState } from 'react'
import { Card, Row, Col, Input, Button, Tag, Statistic, Alert, Space, Typography, Divider, Modal, message, Progress } from 'antd'
import { DatabaseOutlined, RocketOutlined, CloudUploadOutlined, InfoCircleOutlined, CheckCircleOutlined, RadarChartOutlined, GlobalOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { scrapeTopic } from '../api'

const { Title, Text, Paragraph } = Typography

// 数据集配置（已检测实际语言分布）
const DATASETS = {
  takaichi_chinese: {
    name: '高市早苗相关舆论',
    alias: '高市早苗数据集',
    description: '关于日本政治家高市早苗的推文舆论数据（含多语言）',
    topic: '高市早苗相关舆论',
    languages: '日语(93%), 中文(4.6%), 其他(2.4%)',
    timeRange: '2025-10 至 2026-05',
    size: '271,852',
    totalSize: 271852
  },
  le_pen_french: {
    name: '勒庞相关舆论',
    alias: '勒庞数据集',
    description: '关于法国政治家 Marine Le Pen 的推文舆论数据',
    topic: '勒庞相关舆论',
    languages: '英文',
    timeRange: '2022-03 至 2026-05',
    size: '待处理',
    totalSize: 0
  }
}

export default function Home() {
  const [currentDataset, setCurrentDataset] = useState('takaichi_chinese')
  const [customAlias, setCustomAlias] = useState('')
  const [showScrapingModal, setShowScrapingModal] = useState(false)
  const navigate = useNavigate()

  const dataset = DATASETS[currentDataset]

  const handleSwitchDataset = (datasetKey) => {
    if (DATASETS[datasetKey].totalSize === 0) {
      message.warning('该数据集尚未处理，请先完成数据预处理')
      return
    }
    setCurrentDataset(datasetKey)
    setCustomAlias('')
    message.success(`已切换到: ${DATASETS[datasetKey].name}`)
  }

  return (
    <div style={{ padding: '0 0 32px 0' }}>
      {/* 英雄区 */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f5576c 100%)',
        borderRadius: '0 0 48px 48px',
        padding: '64px 48px',
        marginBottom: 48,
        textAlign: 'center',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* 背景装饰 */}
        <div style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -50,
          left: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Title level={1} style={{ color: 'white', fontSize: 48, marginBottom: 8, fontWeight: 700 }}>
            舆论透镜
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 20, display: 'block', marginBottom: 32 }}>
            透视舆论本质 · 多平台话题分析专家
          </Text>
        </div>
      </div>

      {/* 主内容区 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        {/* 当前数据集信息 */}
        <Card
          style={{
            marginBottom: 32,
            borderRadius: 16,
            boxShadow: '0 8px 30px rgba(102, 126, 234, 0.15)'
          }}
        >
          <Row gutter={[32, 24]} align="middle">
            <Col xs={24} md={16}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  color: 'white'
                }}>
                  <DatabaseOutlined />
                </div>
                <div>
                  <Title level={3} style={{ margin: 0 }}>
                    {customAlias || dataset.alias}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 15 }}>
                    {dataset.description}
                  </Text>
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic 
                    title="数据量" 
                    value={dataset.size} 
                    suffix="条"
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="语种" 
                    value={dataset.languages.split('(')[0]} 
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
              </Row>
            </Col>
          </Row>
          
          <Divider style={{ margin: '24px 0' }} />
          
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {dataset.languageDistribution?.map(l => (
              <Tag 
                key={l.lang} 
                style={{ 
                  borderRadius: 20, 
                  padding: '4px 16px',
                  background: '#f1f5f9',
                  border: 'none'
                }}
              >
                {l.label}: {l.count.toLocaleString()} ({l.percent}%)
              </Tag>
            ))}
            <Tag style={{ borderRadius: 20, padding: '4px 16px', background: '#fef3c7', border: 'none' }}>
              主题: {dataset.topic}
            </Tag>
            <Tag style={{ borderRadius: 20, padding: '4px 16px', background: '#dbeafe', border: 'none' }}>
              时间: {dataset.timeRange}
            </Tag>
          </div>
        </Card>

        {/* 功能区 */}
        <Row gutter={[24, 24]}>
          {/* 数据集管理 */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <DatabaseOutlined style={{ color: '#667eea' }} />
                  数据集管理
                </span>
              }
              style={{ borderRadius: 16, height: '100%' }}
            >
              <Paragraph type="secondary" style={{ marginBottom: 20 }}>
                为当前数据集设置别名，方便识别不同数据集
              </Paragraph>

              <div style={{ marginBottom: 24 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>自定义别名</Text>
                <Input
                  placeholder="输入数据集别名"
                  value={customAlias}
                  onChange={(e) => setCustomAlias(e.target.value)}
                  size="large"
                  style={{ borderRadius: 12 }}
                />
                {customAlias && (
                  <Tag 
                    color="success" 
                    style={{ marginTop: 8, borderRadius: 20 }}
                    icon={<CheckCircleOutlined />}
                  >
                    别名已设置: {customAlias}
                  </Tag>
                )}
              </div>

              <Divider>可用数据集</Divider>

              {Object.entries(DATASETS).map(([key, ds]) => (
                <Card
                  key={key}
                  size="small"
                  style={{
                    marginBottom: 12,
                    borderRadius: 12,
                    border: currentDataset === key ? '2px solid #667eea' : '1px solid #e2e8f0',
                    cursor: ds.totalSize === 0 ? 'not-allowed' : 'pointer',
                    opacity: ds.totalSize === 0 ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                  onClick={() => handleSwitchDataset(key)}
                  hoverable={ds.totalSize > 0}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong style={{ fontSize: 15 }}>{ds.name}</Text>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{ds.description}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>语种: {ds.languages}</div>
                    </div>
                    {currentDataset === key ? (
                      <Tag color="processing" style={{ borderRadius: 20 }}>当前</Tag>
                    ) : ds.totalSize === 0 ? (
                      <Tag style={{ borderRadius: 20 }}>待处理</Tag>
                    ) : null}
                  </div>
                </Card>
              ))}
            </Card>
          </Col>

          {/* 功能入口 */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RadarChartOutlined style={{ color: '#667eea' }} />
                  分析功能
                </span>
              }
              style={{ borderRadius: 16, height: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Alert
                  message="本地数据分析"
                  description="基于已加载的数据集进行完整的舆论分析，包括情感分析、传播网络、异常检测等。"
                  type="info"
                  showIcon
                  style={{ borderRadius: 12 }}
                />

                <Link to="/dashboard" style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    size="large"
                    block
                    style={{
                      height: 64,
                      fontSize: 18,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)'
                    }}
                  >
                    <RocketOutlined style={{ marginRight: 8 }} />
                    进入数据分析
                  </Button>
                </Link>

                <Divider style={{ margin: '8px 0' }}>高级功能</Divider>

                <Button
                  size="large"
                  icon={<GlobalOutlined />}
                  onClick={() => setShowScrapingModal(true)}
                  block
                  style={{ borderRadius: 12, height: 48 }}
                >
                  <span style={{ marginLeft: 8 }}>多平台话题抓取</span>
                </Button>

                <Link to="/data-sources" style={{ width: '100%' }}>
                  <Button
                    size="large"
                    icon={<CloudUploadOutlined />}
                    block
                    style={{ borderRadius: 12, height: 48 }}
                  >
                    <span style={{ marginLeft: 8 }}>数据源管理</span>
                  </Button>
                </Link>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 系统说明 */}
        <Card 
          title="系统功能" 
          style={{ marginTop: 32, borderRadius: 16 }}
        >
          <Row gutter={[32, 24]}>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: 28
                }}>
                  📊
                </div>
                <Title level={5}>本地数据分析</Title>
                <Paragraph type="secondary">
                  选择已有数据集，系统将对其中的推文进行完整的舆论分析，
                  包括情感分布、传播路径、意见领袖识别和异常检测。
                </Paragraph>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: 28
                }}>
                  🔍
                </div>
                <Title level={5}>通用话题查询</Title>
                <Paragraph type="secondary">
                  在现有数据集中搜索任意关键词，快速分析该话题的传播热度、
                  参与者特征和代表性内容。
                </Paragraph>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: 28
                }}>
                  🌐
                </div>
                <Title level={5}>多平台话题抓取</Title>
                <Paragraph type="secondary">
                  输入话题关键词，系统将从 Reddit、新闻 RSS 等多平台抓取相关数据，
                  生成数据集后可立即进入分析。
                </Paragraph>
              </div>
            </Col>
          </Row>
        </Card>
      </div>

      {/* 多平台抓取弹窗 */}
      <TopicScrapingModal
        visible={showScrapingModal}
        onClose={() => setShowScrapingModal(false)}
      />
    </div>
  )
}

// ==================== 多平台话题抓取弹窗 ====================
function TopicScrapingModal({ visible, onClose }) {
  const [keyword, setKeyword] = useState('')
  const [platforms, setPlatforms] = useState(['reddit', 'weibo'])
  const [maxResults, setMaxResults] = useState(500)
  const [scraping, setScraping] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState([])
  const [result, setResult] = useState(null)
  const [navigateToAnalysis, setNavigateToAnalysis] = useState(false)

  const addLog = (msg) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])

  const handleScrape = async () => {
    if (!keyword.trim()) {
      message.warning('请输入话题关键词')
      return
    }

    setScraping(true)
    setProgress(0)
    setLogs([])
    setResult(null)
    addLog(`开始抓取话题: ${keyword}`)
    addLog(`选择平台: ${platforms.join(', ')}`)
    addLog(`抓取数量: ${maxResults}条/平台`)

    try {
      const response = await scrapeTopic({ keyword, platforms, max_results: maxResults })
      const data = response.data
      
      if (data.success) {
        setProgress(100)
        addLog(`抓取完成!`)
        addLog(`Reddit: ${data.results.reddit?.count || 0} 条`)
        addLog(`微博: ${data.results.weibo?.count || 0} 条`)
        addLog(`YouTube: ${data.results.youtube?.count || 0} 条`)
        addLog(`新闻 RSS: ${data.results.rss?.count || 0} 条`)
        addLog(`总计: ${data.total} 条数据`)
        addLog(`数据集ID: ${data.dataset_id}`)
        
        setResult({
          total: data.total,
          datasetId: data.dataset_id,
          breakdown: data.results
        })
        
        message.success(`抓取完成！共获取 ${data.total} 条数据`)
      } else {
        addLog(`抓取失败: ${data.error}`)
        message.error(data.error)
      }
    } catch (error) {
      addLog(`请求失败: ${error.message}`)
      message.error('后端服务未启动，请先启动后端')
    }

    setScraping(false)
  }

  // 模拟进度
  React.useEffect(() => {
    if (!scraping) return
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 95) return p
        return p + Math.random() * 10
      })
    }, 500)
    return () => clearInterval(interval)
  }, [scraping])

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GlobalOutlined style={{ color: '#667eea' }} />
          多平台话题抓取
        </span>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={640}
      style={{ top: 100 }}
    >
      {/* 话题输入 */}
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>话题关键词</Text>
        <Input
          placeholder="输入要分析的话题（如：高市早苗、气候变化、AI监管）"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          size="large"
          style={{ borderRadius: 12 }}
          prefix="🔍"
          disabled={scraping}
        />
      </div>

      {/* 平台选择 */}
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>数据来源</Text>
        <Space wrap>
          <Tag 
            color={platforms.includes('reddit') ? 'processing' : 'default'}
            onClick={() => {
              if (!scraping) {
                setPlatforms(prev => 
                  prev.includes('reddit') 
                    ? prev.filter(p => p !== 'reddit')
                    : [...prev, 'reddit']
                )
              }
            }}
            style={{ cursor: 'pointer', borderRadius: 20, padding: '4px 16px' }}
          >
            Reddit 社区
          </Tag>
          <Tag 
            color={platforms.includes('weibo') ? 'processing' : 'default'}
            onClick={() => {
              if (!scraping) {
                setPlatforms(prev => 
                  prev.includes('weibo') 
                    ? prev.filter(p => p !== 'weibo')
                    : [...prev, 'weibo']
                )
              }
            }}
            style={{ cursor: 'pointer', borderRadius: 20, padding: '4px 16px' }}
          >
            微博热搜
          </Tag>
          <Tag 
            color={platforms.includes('youtube') ? 'processing' : 'default'}
            onClick={() => {
              if (!scraping) {
                setPlatforms(prev => 
                  prev.includes('youtube') 
                    ? prev.filter(p => p !== 'youtube')
                    : [...prev, 'youtube']
                )
              }
            }}
            style={{ cursor: 'pointer', borderRadius: 20, padding: '4px 16px' }}
          >
            YouTube 视频
          </Tag>
          <Tag 
            color={platforms.includes('rss') ? 'processing' : 'default'}
            onClick={() => {
              if (!scraping) {
                setPlatforms(prev => 
                  prev.includes('rss') 
                    ? prev.filter(p => p !== 'rss')
                    : [...prev, 'rss']
                )
              }
            }}
            style={{ cursor: 'pointer', borderRadius: 20, padding: '4px 16px' }}
          >
            新闻 RSS
          </Tag>
        </Space>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            * Reddit/微博/新闻RSS免费使用 | YouTube需要配置API Key
          </Text>
        </div>
      </div>

      {/* 数量选择 */}
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>抓取数量</Text>
        <Space>
          {[100, 300, 500, 1000].map(n => (
            <Tag
              key={n}
              color={maxResults === n ? 'processing' : 'default'}
              onClick={() => !scraping && setMaxResults(n)}
              style={{ cursor: 'pointer', borderRadius: 8, padding: '4px 12px' }}
            >
              {n}条
            </Tag>
          ))}
        </Space>
      </div>

      {/* 进度 */}
      {scraping && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text>抓取进度</Text>
            <Text>{Math.floor(progress)}%</Text>
          </div>
          <Progress percent={Math.floor(progress)} status="active" strokeGradient={{ '0%': '#667eea', '100%': '#764ba2' }} />
        </div>
      )}

      {/* 日志 */}
      {logs.length > 0 && (
        <div style={{ 
          background: '#1e293b', 
          borderRadius: 12, 
          padding: 16, 
          marginBottom: 24,
          maxHeight: 200,
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: 13
        }}>
          {logs.map((log, i) => (
            <div key={i} style={{ color: log.includes('错误') ? '#f87171' : log.includes('成功') ? '#4ade80' : '#94a3b8', marginBottom: 4 }}>
              {log}
            </div>
          ))}
        </div>
      )}

      {/* 结果 */}
      {result && (
        <Alert
          message={`抓取完成！共获取 ${result.total} 条数据`}
          description={
            <div style={{ marginTop: 8 }}>
              <Space wrap>
                <Tag color="processing">Reddit: {result.breakdown.reddit?.count || 0} 条</Tag>
                <Tag color="magenta">微博: {result.breakdown.weibo?.count || 0} 条</Tag>
                <Tag color="red">YouTube: {result.breakdown.youtube?.count || 0} 条</Tag>
                <Tag color="cyan">新闻: {result.breakdown.rss?.count || 0} 条</Tag>
              </Space>
            </div>
          }
          type="success"
          showIcon
          style={{ marginBottom: 24, borderRadius: 12 }}
        />
      )}

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        {result && (
          <Button
            type="primary"
            size="large"
            style={{ borderRadius: 12 }}
            icon={<RocketOutlined />}
            onClick={() => {
              onClose()
              // 跳转到数据分析页，加载抓取的数据集
              navigate(`/dashboard?scraped=${result.datasetId}`)
            }}
          >
            进入数据分析
          </Button>
        )}
        <Button 
          onClick={handleScrape}
          type="primary"
          size="large"
          loading={scraping}
          disabled={!keyword.trim() || platforms.length === 0}
          style={{ borderRadius: 12 }}
        >
          {scraping ? '抓取中...' : '开始抓取'}
        </Button>
      </div>
    </Modal>
  )
}
