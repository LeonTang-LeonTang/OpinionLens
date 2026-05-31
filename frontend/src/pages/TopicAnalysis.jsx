import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Spin, Tag, Button } from 'antd'
import ReactECharts from 'echarts-for-react'
import { fetchTopics } from '../api'
import AnalysisReport from '../components/AnalysisReport'

export default function TopicAnalysis() {
  const [loading, setLoading] = useState(true)
  const [topics, setTopics] = useState(null)
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetchTopics(30)
      setTopics(res.data)
    } catch (error) {
      console.error('加载数据失败:', error)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="loading-container"><Spin size="large" /></div>
  }

  const topTopics = topics?.hot_topics?.slice(0, 15) || []

  const barOption = {
    title: { text: '热门话题排行', left: 'center', textStyle: { fontSize: 18 } },
    tooltip: { trigger: 'axis' },
    grid: { left: 150, right: 40, top: 40, bottom: 50 },
    xAxis: { type: 'value', name: '讨论量' },
    yAxis: {
      type: 'category',
      data: topTopics.map(t => '#' + t.hashtag),
      inverse: true,
      axisLabel: { fontSize: 12 }
    },
    series: [{
      type: 'bar',
      data: topTopics.map(t => t.count),
      itemStyle: {
        color: (params) => {
          const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
                         '#00f2fe', '#43e97b', '#38f9d7', '#ffecd2', '#fcb69f']
          return colors[params.dataIndex % colors.length]
        },
        borderRadius: [0, 4, 4, 0]
      },
      label: { show: true, position: 'right', formatter: '{c}' }
    }]
  }

  const pieOption = {
    title: { text: '话题分布', left: 'center', textStyle: { fontSize: 18 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' }
      },
      data: topTopics.slice(0, 8).map((t, i) => ({
        name: '#' + t.hashtag,
        value: t.count,
        itemStyle: {
          color: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
                  '#00f2fe', '#43e97b', '#38f9d7'][i]
        }
      }))
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

      {showReport && <AnalysisReport pageKey="topics" />}

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card bodyStyle={{ padding: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Tag color="blue" style={{ fontSize: 13, padding: '4px 10px' }}>
                总话题: {topics?.total_hashtags?.toLocaleString() || 0}
              </Tag>
              <Tag color="purple" style={{ fontSize: 13, padding: '4px 10px' }}>
                热门: {topics?.hot_topics?.length || 0}
              </Tag>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[8, 8]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={14}>
          <Card bodyStyle={{ padding: 10 }}>
            <ReactECharts option={barOption} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card bodyStyle={{ padding: 10 }}>
            <ReactECharts option={pieOption} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col span={24}>
          <Card bodyStyle={{ padding: 12 }} title={<span style={{ fontSize: 13 }}>热门话题标签</span>}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {topics?.hot_topics?.map((topic, index) => (
                <Tag
                  key={index}
                  color={index < 3 ? 'red' : index < 10 ? 'orange' : 'blue'}
                  style={{ fontSize: 12, padding: '2px 8px' }}
                >
                  #{topic.hashtag} ({topic.count.toLocaleString()})
                </Tag>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
