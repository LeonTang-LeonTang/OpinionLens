import React, { useEffect, useState } from 'react'
import { Card, Table, Avatar, Tag, Spin, Select, Alert, Button } from 'antd'
import { fetchLeaders } from '../api'
import AnalysisReport from '../components/AnalysisReport'

export default function Leaders() {
  const [loading, setLoading] = useState(true)
  const [leaders, setLeaders] = useState(null)
  const [sortBy, setSortBy] = useState('influence_score')
  const [limit, setLimit] = useState(30)
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    loadData()
  }, [sortBy, limit])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetchLeaders(limit, sortBy)
      setLeaders(res.data)
    } catch (error) {
      console.error('加载数据失败:', error)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="loading-container"><Spin size="large" /></div>
  }

  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank) => {
        const colors = { 1: 'gold', 2: 'silver', 3: '#cd7f32' }
        return <Tag color={colors[rank] || 'default'}>{rank}</Tag>
      }
    },
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar style={{ backgroundColor: '#667eea' }}>
            {record.screen_name?.[0]?.toUpperCase() || '?'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>@{record.screen_name || 'unknown'}</div>
            <div style={{ color: '#888', fontSize: 12 }}>
              {record.name || record.screen_name || ''}
            </div>
          </div>
        </div>
      )
    },
    {
      title: '粉丝数',
      dataIndex: 'followers_count',
      key: 'followers_count',
      sorter: true,
      render: (val) => val?.toLocaleString() || '-'
    },
    {
      title: '发帖数',
      dataIndex: 'tweet_count',
      key: 'tweet_count',
      sorter: true,
      render: (val) => val?.toLocaleString() || '-'
    },
    {
      title: '总互动',
      dataIndex: 'total_engagement',
      key: 'total_engagement',
      sorter: true,
      render: (val) => val?.toLocaleString() || '-'
    },
    {
      title: '影响力得分',
      dataIndex: 'influence_score',
      key: 'influence_score',
      sorter: true,
      render: (val) => <Tag color="purple">{val?.toFixed(6) || '-'}</Tag>
    },
    {
      title: 'PageRank',
      dataIndex: 'pagerank',
      key: 'pagerank',
      render: (val) => <Tag color="blue">{val?.toFixed(6) || '-'}</Tag>
    }
  ]

  return (
    <div>
      <Button
        type="text"
        onClick={() => setShowReport(!showReport)}
        style={{ marginBottom: 8, color: '#667eea' }}
      >
        {showReport ? '收起报告说明' : '展开报告说明'}
      </Button>

      {showReport && <AnalysisReport pageKey="leaders" />}

      <Card
        title="意见领袖识别"
        extra={
          <div style={{ display: 'flex', gap: 12 }}>
            <Select
              value={limit}
              onChange={setLimit}
              options={[
                { value: 20, label: 'Top 20' },
                { value: 50, label: 'Top 50' },
                { value: 100, label: 'Top 100' }
              ]}
            />
            <Select
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'influence_score', label: '影响力得分' },
                { value: 'followers_count', label: '粉丝数' },
                { value: 'tweet_count', label: '发帖数' }
              ]}
            />
          </div>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Tag color="blue">意见领袖总数: {leaders?.total_leaders || 0}</Tag>
        </div>
        <Table
          columns={columns}
          dataSource={leaders?.leaders || []}
          rowKey="rank"
          pagination={{ pageSize: 15 }}
        />
      </Card>

      {leaders?.top3?.length > 0 && (
        <Card title="TOP 3 意见领袖" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
            {leaders.top3.map((leader, index) => (
              <Card
                key={index}
                style={{
                  minWidth: 110,
                  maxWidth: 140,
                  flex: 1,
                  textAlign: 'center',
                  borderTop: index === 0 ? '4px solid gold' :
                            index === 1 ? '4px solid silver' : '4px solid #cd7f32',
                  flexShrink: 0
                }}
                bodyStyle={{ padding: 12 }}
              >
                <Avatar size={48} style={{
                  backgroundColor: ['#667eea', '#764ba2', '#f5576c'][index],
                  fontSize: 18,
                  marginBottom: 8
                }}>
                  {leader.screen_name?.[0]?.toUpperCase()}
                </Avatar>
                <div style={{ fontSize: 11, fontWeight: 600, wordBreak: 'break-all', lineHeight: 1.3 }}>@{leader.screen_name}</div>
                <div style={{ color: '#888', fontSize: 10, marginBottom: 4 }}>{leader.name || '-'}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#667eea' }}>#{index + 1}</div>
                <div style={{ color: '#888', fontSize: 10 }}>粉丝 {leader.followers_count?.toLocaleString() || '-'}</div>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
