import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Spin, DatePicker, Alert, Tooltip, Button } from 'antd'
import ReactECharts from 'echarts-for-react'
import { fetchSentiment } from '../api'
import { QuestionCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

// 指标解释
const METRICS_HELP = {
  sentiment: {
    title: '情感分析指标说明',
    items: [
      { term: '正面情感', desc: '表达支持、赞扬、认同等积极情绪的内容，如对政策的赞同、对人物的鼓励等。' },
      { term: '中立情感', desc: '客观陈述事实、转发新闻报道、中性询问等不带有明显情感倾向的内容。' },
      { term: '负面情感', desc: '表达批评、反对、担忧、嘲讽等消极情绪的内容，如对政策的质疑、对人物的批评等。' },
      { term: '情感倾向指数', desc: '正面情感占比（0-100%），越高表示整体舆论越正面。参考标准：>60%偏正面，40-60%偏中立，<40%偏负面。' }
    ]
  },
  insight: {
    title: '分析洞察',
    items: [
      '情感分布反映了公众对特定话题的整体态度，是判断舆论走向的关键指标。',
      '中立情感占比高（>70%）通常表明话题处于信息传播阶段，公众仍在观望。',
      '负面情感突增往往是舆论危机的先兆，需要重点关注。',
      '正面与负面情感的比值（正负比）可反映话题的支持基础。'
    ]
  }
}

export default function SentimentAnalysis() {
  const [loading, setLoading] = useState(true)
  const [sentiment, setSentiment] = useState(null)
  const [dateRange, setDateRange] = useState(null)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    loadData()
  }, [dateRange])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = {}
      if (dateRange) {
        params.date_from = dateRange[0].format('YYYY-MM-DD')
        params.date_to = dateRange[1].format('YYYY-MM-DD')
      }
      const res = await fetchSentiment(params)
      setSentiment(res.data)
    } catch (error) {
      console.error('加载数据失败:', error)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="loading-container"><Spin size="large" /></div>
  }

  if (!sentiment) {
    return <div className="loading-container">暂无数据</div>
  }

  const summary = sentiment.summary || {}
  const positive = summary.positive || 0
  const neutral = summary.neutral || 0
  const negative = summary.negative || 0
  const positiveRate = summary.positive_rate || 0
  const neutralRate = summary.neutral_rate || 0
  const negativeRate = summary.negative_rate || 0

  // 判断整体倾向
  const getOverallTone = () => {
    if (positiveRate > 60) return { label: '整体偏正面', color: '#52c41a', desc: '公众对该话题持积极态度，支持声音为主。' }
    if (negativeRate > 40) return { label: '整体偏负面', color: '#ff4d4f', desc: '公众对该话题持消极态度，批评质疑为主。' }
    return { label: '整体偏中立', color: '#1890ff', desc: '公众态度客观理性，情绪表达较少，以信息传播为主。' }
  }
  const overallTone = getOverallTone()

  const pieOption = {
    title: { text: '情感分布', left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 10, left: 'center' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%' },
      data: [
        { value: positive, name: '正面', itemStyle: { color: '#52c41a' } },
        { value: neutral, name: '中立', itemStyle: { color: '#1890ff' } },
        { value: negative, name: '负面', itemStyle: { color: '#ff4d4f' } }
      ]
    }]
  }

  // 修复指针位置，避免遮挡数字
  const gaugeOption = {
    title: {
      text: '情感倾向指数',
      left: 'center',
      textStyle: { fontSize: 16 }
    },
    series: [{
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 100,
      splitNumber: 5,
      center: ['50%', '65%'],
      radius: '85%',
      axisLine: {
        lineStyle: {
          width: 18,
          color: [
            [0.4, '#ff4d4f'],
            [0.6, '#1890ff'],
            [1, '#52c41a']
          ]
        }
      },
      pointer: {
        width: 4,
        length: '50%',
        offsetCenter: [0, '-35%']
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        show: true,
        distance: 15,
        color: '#999',
        formatter: (value) => value === 0 || value === 100 ? '' : value
      },
      detail: {
        valueAnimation: true,
        formatter: '{value}%',
        fontSize: 28,
        fontWeight: 'bold',
        color: overallTone.color,
        offsetCenter: [0, '15%']
      },
      data: [{ value: positiveRate }]
    }]
  }

  const barOption = {
    title: { text: '情感数量对比', left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: ['正面', '中立', '负面'] },
    yAxis: { type: 'value', name: '数量' },
    series: [{
      type: 'bar',
      data: [
        { value: positive, itemStyle: { color: '#52c41a' } },
        { value: neutral, itemStyle: { color: '#1890ff' } },
        { value: negative, itemStyle: { color: '#ff4d4f' } }
      ],
      barWidth: '50%',
      itemStyle: { borderRadius: [8, 8, 0, 0] }
    }]
  }

  return (
    <div>
      {/* 整体倾向判断 */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Alert
            message={
              <span>
                <strong>整体倾向判断：</strong>
                <span style={{ color: overallTone.color, fontWeight: 'bold' }}>{overallTone.label}</span>
              </span>
            }
            description={overallTone.desc}
            type={positiveRate > 50 ? 'success' : negativeRate > 40 ? 'error' : 'info'}
            showIcon
            style={{ marginBottom: 16 }}
          />
        </Col>
      </Row>

      {/* 指标说明开关 */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Button
            icon={<QuestionCircleOutlined />}
            onClick={() => setShowHelp(!showHelp)}
            type={showHelp ? 'primary' : 'default'}
          >
            {showHelp ? '收起指标说明' : '查看指标说明'}
          </Button>
        </Col>
      </Row>

      {showHelp && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title={METRICS_HELP.sentiment.title} size="small">
              {METRICS_HELP.sentiment.items.map((item, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <strong style={{ color: '#667eea' }}>{item.term}</strong>：{item.desc}
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      )}

      {/* 筛选器 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card
            title="时间范围筛选"
            extra={
              <RangePicker
                onChange={(dates) => setDateRange(dates)}
                allowClear
              />
            }
          >
            <Row gutter={16}>
              <Col span={8}>
                <div className="stat-card">
                  <div className="label">正面情感</div>
                  <div className="value green">{positive.toLocaleString()}</div>
                  <div style={{ color: '#52c41a' }}>{positiveRate.toFixed(1)}%</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="stat-card">
                  <div className="label">中立情感</div>
                  <div className="value" style={{ color: '#1890ff' }}>{neutral.toLocaleString()}</div>
                  <div style={{ color: '#1890ff' }}>{neutralRate.toFixed(1)}%</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="stat-card">
                  <div className="label">负面情感</div>
                  <div className="value red">{negative.toLocaleString()}</div>
                  <div style={{ color: '#ff4d4f' }}>{negativeRate.toFixed(1)}%</div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 图表 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={pieOption} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={gaugeOption} style={{ height: 180 }} />
            <ReactECharts option={barOption} style={{ height: 220 }} />
          </Card>
        </Col>
      </Row>

      {/* 分析洞察 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title={METRICS_HELP.insight.title}>
            <ul style={{ paddingLeft: 20 }}>
              {METRICS_HELP.insight.items.map((item, i) => (
                <li key={i} style={{ marginBottom: 8, color: '#666' }}>{item}</li>
              ))}
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
