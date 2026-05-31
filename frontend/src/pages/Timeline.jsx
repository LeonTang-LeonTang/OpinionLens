import React, { useEffect, useState } from 'react'
import { Card, Spin, Row, Col, Button } from 'antd'
import ReactECharts from 'echarts-for-react'
import { fetchTimeline } from '../api'
import AnalysisReport from '../components/AnalysisReport'

export default function Timeline() {
  const [loading, setLoading] = useState(true)
  const [timeline, setTimeline] = useState(null)
  const [granularity, setGranularity] = useState('day')
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    loadData()
  }, [granularity])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetchTimeline(granularity)
      setTimeline(res.data)
    } catch (error) {
      console.error('加载数据失败:', error)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="loading-container"><Spin size="large" /></div>
  }

  const timelineData = timeline?.timeline || []
  const periods = timelineData.map(d => {
    const date = d.date || d.period
    if (typeof date === 'string') {
      return date.length > 10 ? date.split('T')[0] : date
    }
    return String(date)
  })
  const tweetCounts = timelineData.map(d => d.tweet_count || 0)
  const engagements = timelineData.map(d =>
    (d.daily_favorites || d.favorites || 0) +
    (d.daily_retweets || d.retweets || 0) * 2
  )

  const lineOption = {
    title: { text: '推文数量趋势', left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'axis' },
    legend: { data: ['推文数', '互动量'], top: 30 },
    grid: { left: 50, right: 20, top: 70, bottom: 60 },
    xAxis: {
      type: 'category',
      data: periods,
      axisLabel: { rotate: granularity === 'day' ? 45 : 0 }
    },
    yAxis: [
      { type: 'value', name: '推文数', position: 'left' },
      { type: 'value', name: '互动量', position: 'right' }
    ],
    series: [
      {
        name: '推文数',
        type: 'line',
        smooth: true,
        data: tweetCounts,
        lineStyle: { color: '#667eea', width: 2 },
        areaStyle: { color: 'rgba(102, 126, 234, 0.2)' },
        itemStyle: { color: '#667eea' }
      },
      {
        name: '互动量',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: engagements,
        lineStyle: { color: '#f5576c', width: 2 },
        itemStyle: { color: '#f5576c' }
      }
    ]
  }

  const heatmapOption = {
    title: { text: '周内分布', left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { position: 'top' },
    grid: { left: 80, right: 20, top: 50, bottom: 50 },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    yAxis: { type: 'category', data: ['发帖量'] },
    visualMap: {
      min: 30000,
      max: 45000,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#e0e7ff', '#667eea'] }
    },
    series: [{
      type: 'heatmap',
      data: [['周一', 0, 38453], ['周二', 0, 42260], ['周三', 0, 37961],
             ['周四', 0, 34565], ['周五', 0, 38384], ['周六', 0, 41077], ['周日', 0, 39152]],
      label: { show: true },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
    }]
  }

  const peakDays = timeline?.peak_days || []
  const peakOption = {
    title: { text: '高热度日 TOP 5', left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: peakDays.map(d => d.date?.split('T')[0] || d.date) },
    yAxis: { type: 'value', name: '互动量' },
    series: [{
      type: 'bar',
      data: peakDays.map(d => d.engagement || d.total_engagement),
      itemStyle: {
        color: '#f5576c',
        borderRadius: [4, 4, 0, 0]
      }
    }]
  }

  return (
    <div>
      <Button
        type="text"
        onClick={() => setShowReport(!showReport)}
        style={{ marginBottom: 8, color: '#667eea' }}
      >
        {showReport ? '收起报告说明' : '展开报告说明'}
      </Button>

      {showReport && <AnalysisReport pageKey="timeline" />}

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title="时间序列分析"
            extra={
              <div style={{ display: 'flex', gap: 12 }}>
                {['day', 'week', 'month'].map(g => (
                  <span
                    key={g}
                    onClick={() => setGranularity(g)}
                    style={{
                      cursor: 'pointer',
                      padding: '4px 12px',
                      borderRadius: 4,
                      background: granularity === g ? '#667eea' : '#f0f0f0',
                      color: granularity === g ? '#fff' : '#333'
                    }}
                  >
                    {g === 'day' ? '按日' : g === 'week' ? '按周' : '按月'}
                  </span>
                ))}
              </div>
            }
          >
            <ReactECharts option={lineOption} style={{ height: 400 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={heatmapOption} style={{ height: 250 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={peakOption} style={{ height: 250 }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
