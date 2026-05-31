import React from 'react'
import { Layout, Menu } from 'antd'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  DashboardOutlined,
  FileTextOutlined,
  TeamOutlined,
  ApartmentOutlined,
  HistoryOutlined,
  AlertOutlined,
  SearchOutlined,
  DatabaseOutlined
} from '@ant-design/icons'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import SentimentAnalysis from './pages/SentimentAnalysis'
import TopicAnalysis from './pages/TopicAnalysis'
import Leaders from './pages/Leaders'
import NetworkGraph from './pages/NetworkGraph'
import Timeline from './pages/Timeline'
import Search from './pages/Search'
import AdvancedAnalysis from './pages/AdvancedAnalysis'
import TopicSearch from './pages/TopicSearch'
import DataSources from './pages/DataSources'

const { Header, Content } = Layout

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: <Link to="/">首页</Link> },
  { key: '/dashboard', icon: <DashboardOutlined />, label: <Link to="/dashboard">概览</Link> },
  { key: '/sentiment', icon: <FileTextOutlined />, label: <Link to="/sentiment">情感分析</Link> },
  { key: '/topics', icon: <HistoryOutlined />, label: <Link to="/topics">话题分析</Link> },
  { key: '/timeline', icon: <HistoryOutlined />, label: <Link to="/timeline">时间趋势</Link> },
  { key: '/leaders', icon: <TeamOutlined />, label: <Link to="/leaders">意见领袖</Link> },
  { key: '/network', icon: <ApartmentOutlined />, label: <Link to="/network">传播网络</Link> },
  { key: '/topic-search', icon: <SearchOutlined />, label: <Link to="/topic-search">话题搜索</Link> },
  { key: '/advanced', icon: <AlertOutlined />, label: <Link to="/advanced">异常检测</Link> },
  { key: '/data-sources', icon: <DatabaseOutlined />, label: <Link to="/data-sources">数据源</Link> },
]

function AppContent() {
  const location = useLocation()

  return (
    <Layout className="app-container">
      <Header style={{
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '0 24px'
      }}>
        <div style={{ color: 'white', fontSize: 20, fontWeight: 600, marginRight: 48 }}>
          舆论透镜
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ background: 'transparent', border: 'none' }}
        />
      </Header>
      <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px)', background: '#f0f2f5' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sentiment" element={<SentimentAnalysis />} />
          <Route path="/topics" element={<TopicAnalysis />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/leaders" element={<Leaders />} />
          <Route path="/network" element={<NetworkGraph />} />
          <Route path="/search" element={<Search />} />
          <Route path="/topic-search" element={<TopicSearch />} />
          <Route path="/advanced" element={<AdvancedAnalysis />} />
          <Route path="/data-sources" element={<DataSources />} />
        </Routes>
      </Content>
    </Layout>
  )
}

export default function App() {
  return <AppContent />
}
