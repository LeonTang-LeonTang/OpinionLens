import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Spin, Table, Tag, Tabs, Button, Empty, Statistic } from 'antd'
import ReactECharts from 'echarts-for-react'
import {
  fetchNetwork,
  fetchCommunities,
  fetchAdvancedNetworkStats,
  fetchPropagationChains
} from '../api'
import AnalysisReport from '../components/AnalysisReport'

export default function NetworkGraph() {
  const [loading, setLoading] = useState(true)
  const [networkData, setNetworkData] = useState(null)
  const [communities, setCommunities] = useState([])
  const [advancedStats, setAdvancedStats] = useState(null)
  const [propagation, setPropagation] = useState(null)
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [netRes, commRes, advRes, propRes] = await Promise.all([
        fetchNetwork(200),
        fetchCommunities(10),
        fetchAdvancedNetworkStats(),
        fetchPropagationChains(20)
      ])
      setNetworkData(netRes.data)
      setCommunities(commRes.data.communities || [])
      setAdvancedStats(advRes.data || {})
      setPropagation(propRes.data || {})
    } catch (error) {
      console.error('加载数据失败:', error)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="loading-container"><Spin size="large" /></div>
  }

  const stats = networkData?.stats || {}
  const graph = networkData?.graph || {}

  const nodeCount = stats.nodes || 0
  const edgeCount = stats.edges || 0
  const largestComponent = stats.largest_component_size || 0
  const avgClustering = stats.avg_clustering || 0

  // 节点类型分布图
  const nodeTypeOption = {
    title: { text: '网络节点类型分布', left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 10, left: 'center' },
    series: [{
      type: 'pie',
      radius: ['35%', '60%'],
      center: ['50%', '50%'],
      data: [
        { value: nodeCount, name: '用户节点', itemStyle: { color: '#667eea' } },
        { value: edgeCount, name: '互动边', itemStyle: { color: '#764ba2' } }
      ],
      label: { show: true, formatter: '{b}\n{c}' }
    }]
  }

  // 网络结构雷达图
  const densityScaled = Math.min((stats.density || 0) * 100000, 100)
  const connectivity = largestComponent > 0 ? (largestComponent / nodeCount * 100) : 0
  const clusteringScaled = avgClustering * 100

  const radarOption = {
    title: { text: '网络结构特征', left: 'center', textStyle: { fontSize: 16 } },
    radar: {
      indicator: [
        { name: '密度', max: 100 },
        { name: '连通性', max: 100 },
        { name: '聚类系数', max: 100 },
        { name: '传播力', max: 100 }
      ],
      radius: '60%'
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          densityScaled,
          connectivity,
          clusteringScaled,
          propagation.total_chains ? 75 : 50
        ],
        name: '网络特征',
        areaStyle: { color: 'rgba(102, 126, 234, 0.3)' },
        lineStyle: { color: '#667eea' }
      }]
    }]
  }

  // 传播者排行榜
  const mostRepliedTo = advancedStats?.most_replied_to || []
  const mostActiveRepliers = advancedStats?.most_active_repliers || []

  const repliedColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_, __, index) => index + 1
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      render: (name) => <Tag color="blue">@{name}</Tag>
    },
    {
      title: '被回复次数',
      dataIndex: 'count',
      key: 'count',
      render: (val) => <Tag color="purple">{val?.toLocaleString()}</Tag>
    }
  ]

  const replierColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_, __, index) => index + 1
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      render: (name) => <Tag color="green">@{name}</Tag>
    },
    {
      title: '主动回复次数',
      dataIndex: 'count',
      key: 'count',
      render: (val) => <Tag color="cyan">{val?.toLocaleString()}</Tag>
    }
  ]

  const propagationColumns = [
    {
      title: '源用户',
      dataIndex: 'source',
      key: 'source',
      render: (name) => <Tag color="blue">@{name}</Tag>
    },
    {
      title: '→ 目标用户',
      dataIndex: 'target',
      key: 'target',
      render: (name) => <Tag color="green">@{name}</Tag>
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date'
    },
    {
      title: '互动数',
      dataIndex: 'engagement',
      key: 'engagement',
      render: (val) => <Tag color="orange">{val?.toLocaleString()}</Tag>
    },
    {
      title: '内容预览',
      dataIndex: 'text_preview',
      key: 'text_preview',
      ellipsis: true,
      render: (text) => <span title={text}>{text}</span>
    }
  ]

  const communityColumns = [
    {
      title: '社区ID',
      dataIndex: 'community_id',
      key: 'community_id',
      render: (id) => <Tag color="purple">#{id}</Tag>
    },
    {
      title: '成员数',
      dataIndex: 'size',
      key: 'size',
      render: (size) => <Tag color="blue">{size?.toLocaleString()}</Tag>
    },
    {
      title: '核心成员（前10）',
      dataIndex: 'members',
      key: 'members',
      render: (members) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(members || []).slice(0, 8).map((m, i) => (
            <Tag key={i} style={{ fontSize: 11 }}>@{m}</Tag>
          ))}
          {(members || []).length > 8 && <Tag>+{members.length - 8}</Tag>}
        </div>
      )
    }
  ]

  const tabItems = [
    {
      key: 'overview',
      label: '网络概览',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic title="节点数" value={nodeCount} valueStyle={{ color: '#667eea' }} /></Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic title="边数" value={edgeCount} valueStyle={{ color: '#764ba2' }} /></Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic title="最大连通分量" value={largestComponent} suffix={`/ ${nodeCount}`} /></Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic title="平均聚类系数" value={avgClustering} precision={4} /></Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card><ReactECharts option={nodeTypeOption} style={{ height: 300 }} /></Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card><ReactECharts option={radarOption} style={{ height: 300 }} /></Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'propagation',
      label: '传播核心',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="被回复最多的用户（传播核心）" size="small">
              {mostRepliedTo.length > 0 ? (
                <Table columns={repliedColumns} dataSource={mostRepliedTo} rowKey="user" pagination={false} size="small" />
              ) : <Empty description="暂无数据" />}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="最活跃的传播者" size="small">
              {mostActiveRepliers.length > 0 ? (
                <Table columns={replierColumns} dataSource={mostActiveRepliers} rowKey="user" pagination={false} size="small" />
              ) : <Empty description="暂无数据" />}
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'chains',
      label: '传播链路',
      children: (
        <Card title={`代表性传播链路（共 ${(propagation.total_chains || 0).toLocaleString()} 条）`} size="small">
          {propagation.chains?.length > 0 ? (
            <Table columns={propagationColumns} dataSource={propagation.chains} rowKey={(_, i) => i} pagination={{ pageSize: 10 }} size="small" />
          ) : <Empty description="暂无传播链路数据" />}
        </Card>
      )
    },
    {
      key: 'communities',
      label: '社区分析',
      children: (
        <Card title={`社区列表（共 ${communities.length} 个）`} size="small">
          {communities.length > 0 ? (
            <Table columns={communityColumns} dataSource={communities} rowKey="community_id" pagination={{ pageSize: 10 }} size="small" />
          ) : <Empty description="暂无社区数据" />}
        </Card>
      )
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

      {showReport && <AnalysisReport pageKey="network" />}

      <Tabs defaultActiveKey="overview" items={tabItems} size="large" />
    </div>
  )
}
