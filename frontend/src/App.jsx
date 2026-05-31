import React, { useState, useEffect } from 'react'
import { Layout, Menu, Drawer, Button } from 'antd'
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  HomeOutlined,
  DashboardOutlined,
  FileTextOutlined,
  TeamOutlined,
  ApartmentOutlined,
  HistoryOutlined,
  AlertOutlined,
  SearchOutlined,
  DatabaseOutlined,
  MenuOutlined
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
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/dashboard', icon: <DashboardOutlined />, label: '概览' },
  { key: '/sentiment', icon: <FileTextOutlined />, label: '情感分析' },
  { key: '/topics', icon: <HistoryOutlined />, label: '话题分析' },
  { key: '/timeline', icon: <HistoryOutlined />, label: '时间趋势' },
  { key: '/leaders', icon: <TeamOutlined />, label: '意见领袖' },
  { key: '/network', icon: <ApartmentOutlined />, label: '传播网络' },
  { key: '/topic-search', icon: <SearchOutlined />, label: '话题搜索' },
  { key: '/advanced', icon: <AlertOutlined />, label: '异常检测' },
  { key: '/data-sources', icon: <DatabaseOutlined />, label: '数据源' },
]

// 底部 Tab 栏（仅移动端显示）
function MobileTabBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!isMobile) return null

  // 底部 5 个最重要的 Tab
  const bottomTabs = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/dashboard', icon: <DashboardOutlined />, label: '概览' },
    { key: '/sentiment', icon: <FileTextOutlined />, label: '情感' },
    { key: '/leaders', icon: <TeamOutlined />, label: '领袖' },
    { key: '/advanced', icon: <AlertOutlined />, label: '异常' },
  ]

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: '#fff',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {bottomTabs.map(tab => {
        const active = location.pathname === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => navigate(tab.key)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              padding: '10px 0',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              color: active ? '#667eea' : '#999',
              fontSize: 10,
              fontWeight: active ? 600 : 400,
            }}
          >
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

// Header 组件（自适应）
function AppHeader() {
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // 移动端：精简标题 + 汉堡按钮
  if (isMobile) {
    return (
      <Header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '0 16px',
        height: 50,
        lineHeight: '50px',
        position: 'sticky',
        top: 0,
        zIndex: 999,
      }}>
        <div style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>
          舆论透镜
        </div>
        <Button
          type="text"
          icon={<MenuOutlined style={{ color: 'white', fontSize: 20 }} />}
          onClick={() => setDrawerOpen(true)}
          style={{ border: 'none' }}
        />
        <Drawer
          title={<span style={{ color: '#667eea', fontWeight: 700 }}>导航菜单</span>}
          placement="right"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          width={280}
          styles={{ body: { padding: 0 } }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems.map(item => ({
              key: item.key,
              icon: item.icon,
              label: <Link to={item.key} onClick={() => setDrawerOpen(false)}>{item.label}</Link>,
            }))}
            style={{ border: 'none' }}
          />
        </Drawer>
      </Header>
    )
  }

  // 桌面端：完整横向菜单
  return (
    <Header style={{
      display: 'flex',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '0 24px',
      height: 56,
      lineHeight: '56px',
      position: 'sticky',
      top: 0,
      zIndex: 999,
    }}>
      <div style={{
        color: 'white',
        fontSize: 18,
        fontWeight: 700,
        marginRight: 32,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        舆论透镜
      </div>
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems.map(item => ({
          key: item.key,
          icon: item.icon,
          label: <Link to={item.key}>{item.label}</Link>,
        }))}
        style={{ background: 'transparent', border: 'none', flex: 1 }}
        inlineCollapsed={false}
      />
    </Header>
  )
}

function AppContent() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <Layout className="app-container" style={{ paddingBottom: isMobile ? 60 : 0 }}>
      <AppHeader />
      <Content style={{
        padding: isMobile ? '12px' : '24px',
        minHeight: `calc(100vh - ${isMobile ? 50 : 56}px)`,
        background: '#f0f2f5'
      }}>
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
      <MobileTabBar />
    </Layout>
  )
}

export default function App() {
  return <AppContent />
}
