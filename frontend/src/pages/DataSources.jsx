import React, { useState, useRef } from 'react'
import { Card, Row, Col, Upload, Button, Table, Tag, Alert, Typography, Space, Select, Input, message, Progress, Collapse, Divider, List, Badge, Statistic } from 'antd'
import { InboxOutlined, CloudDownloadOutlined, DatabaseOutlined, GlobalOutlined, FileTextOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Title, Text, Paragraph } = Typography
const { Dragger } = Upload
const { Panel } = Collapse

// Nitter 公开实例列表
const NITTER_INSTANCES = [
  { name: 'nitter.net', url: 'https://nitter.net', status: 'unknown', note: '官方实例' },
  { name: 'nitter.privacydev.net', url: 'https://nitter.privacydev.net', status: 'unknown', note: '社区维护' },
  { name: 'nitter.poast.org', url: 'https://nitter.poast.org', status: 'unknown', note: '社区维护' },
  { name: 'nitter.1d4.us', url: 'https://nitter.1d4.us', status: 'unknown', note: '社区维护' }
]

// RSS Bridge 实例
const RSS_BRIDGE = {
  name: 'RSS Bridge',
  description: '自建 RSS 生成器，可抓取 Twitter、微博等平台的公开内容',
  setupUrl: 'https://github.com/RSS-Bridge/rss-bridge'
}

export default function DataSources() {
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importedData, setImportedData] = useState(null)
  const [nitterStatus, setNitterStatus] = useState({})
  const [nitterUsers, setNitterUsers] = useState([])
  const [fetchingNitter, setFetchingNitter] = useState(false)
  const [nitterResults, setNitterResults] = useState([])
  const [config, setConfig] = useState({
    instance: NITTER_INSTANCES[0].url,
    userInput: ''
  })

  // 检查 Nitter 实例状态
  const checkNitterStatus = async (instance) => {
    try {
      const response = await axios.get(`${instance}/`, { timeout: 5000 })
      if (response.status === 200) {
        setNitterStatus(prev => ({ ...prev, [instance]: 'online' }))
        return true
      }
    } catch {
      setNitterStatus(prev => ({ ...prev, [instance]: 'offline' }))
      return false
    }
    return false
  }

  // 从 Nitter 抓取用户推文
  const fetchFromNitter = async () => {
    if (!config.userInput.trim()) {
      message.warning('请输入 Twitter 用户名')
      return
    }

    const username = config.userInput.replace('@', '').trim()
    setFetchingNitter(true)
    setNitterResults([])

    try {
      // 使用 Nitter 的 RSS 功能
      const rssUrl = `${config.instance}/${username}/rss`
      const response = await axios.get(rssUrl, {
        timeout: 10000,
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' }
      })

      // 解析 RSS
      const parser = new DOMParser()
      const xml = parser.parseFromString(response.data, 'text/xml')
      const items = xml.querySelectorAll('item')

      const tweets = []
      items.forEach(item => {
        const title = item.querySelector('title')?.textContent || ''
        const link = item.querySelector('link')?.textContent || ''
        const pubDate = item.querySelector('pubDate')?.textContent || ''
        const description = item.querySelector('description')?.textContent || ''

        // 清理 HTML
        const temp = document.createElement('div')
        temp.innerHTML = description
        const cleanText = temp.textContent || temp.innerText || ''

        tweets.push({
          key: tweets.length,
          username,
          text: cleanText.substring(0, 280),
          date: pubDate ? new Date(pubDate).toLocaleString('zh-CN') : 'N/A',
          link
        })
      })

      if (tweets.length === 0) {
        message.warning('未找到该用户的推文，可能 Nitter 实例不支持或用户不存在')
      } else {
        setNitterResults(tweets)
        message.success(`成功获取 ${tweets.length} 条推文`)
      }
    } catch (error) {
      console.error('Nitter fetch error:', error)
      message.error(`抓取失败: ${error.message}`)
    }

    setFetchingNitter(false)
  }

  // 上传文件
  const handleUpload = async (file) => {
    setUploadLoading(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    try {
      // 模拟上传进度
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100))
        setUploadProgress(i)
      }

      // 读取文件预览
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target.result
          let parsed = []

          if (file.name.endsWith('.jsonl')) {
            parsed = content.split('\n')
              .filter(line => line.trim())
              .slice(0, 10)
              .map((line, i) => {
                try {
                  return JSON.parse(line)
                } catch {
                  return { line: i + 1, raw: line.substring(0, 100) }
                }
              })
          } else if (file.name.endsWith('.json')) {
            const json = JSON.parse(content)
            parsed = Array.isArray(json) ? json.slice(0, 10) : [json]
          }

          setImportedData({
            filename: file.name,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            preview: parsed,
            totalLines: content.split('\n').filter(l => l.trim()).length
          })
          message.success('文件上传成功！')
        } catch (error) {
          message.error('文件解析失败: ' + error.message)
        }
      }
      reader.readAsText(file)
    } catch (error) {
      message.error('上传失败: ' + error.message)
    }

    setUploadLoading(false)
    return false
  }

  const columns = [
    { title: '字段', dataIndex: 'field', key: 'field', width: 150 },
    { title: '值预览', dataIndex: 'value', key: 'value', ellipsis: true }
  ]

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <Title level={3}>数据源管理</Title>
      <Paragraph type="secondary">
        支持多种方式获取数据：上传本地文件、免费 Nitter 实例抓取、RSS Bridge
      </Paragraph>

      {/* 数据导入 */}
      <Card
        title={
          <span>
            <InboxOutlined style={{ marginRight: 8 }} />
            本地文件导入
          </span>
        }
        style={{ marginBottom: 24 }}
      >
        <Dragger
          accept=".jsonl,.json,.csv,.zip"
          showUploadList={false}
          beforeUpload={handleUpload}
          disabled={uploadLoading}
        >
          {uploadLoading ? (
            <div>
              <LoadingOutlined style={{ fontSize: 48, color: '#667eea' }} />
              <p className="ant-upload-text" style={{ marginTop: 16 }}>
                正在解析文件...
              </p>
              <Progress percent={uploadProgress} style={{ width: 200, margin: '0 auto' }} />
            </div>
          ) : (
            <div>
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: 48, color: '#667eea' }} />
              </p>
              <p className="ant-upload-text">点击或拖拽上传数据文件</p>
              <p className="ant-upload-hint">
                支持 .jsonl, .json, .csv, .zip 格式（压缩文件会自动解压）
              </p>
            </div>
          )}
        </Dragger>

        {importedData && (
          <div style={{ marginTop: 24 }}>
            <Alert
              message={`文件: ${importedData.filename}`}
              description={`大小: ${importedData.size} | 总行数: ${importedData.totalLines.toLocaleString()}`}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Title level={5}>数据预览（前10条）</Title>
            <Table
              size="small"
              pagination={false}
              columns={[
                { title: '字段', dataIndex: '0', key: 'f0', width: 150 },
                { title: '值', dataIndex: '1', key: 'f1', ellipsis: true }
              ]}
              dataSource={
                importedData.preview.length > 0 && typeof importedData.preview[0] === 'object'
                  ? Object.entries(importedData.preview[0]).slice(0, 10).map(([k, v], i) => ({
                      key: i,
                      '0': k,
                      '1': typeof v === 'object' ? JSON.stringify(v).substring(0, 100) : String(v).substring(0, 100)
                    }))
                  : importedData.preview.map((item, i) => ({
                      key: i,
                      '0': `行 ${i + 1}`,
                      '1': typeof item === 'object' ? JSON.stringify(item).substring(0, 100) : item.substring(0, 100)
                    }))
              }
            />
          </div>
        )}
      </Card>

      {/* Nitter 抓取 */}
      <Card
        title={
          <span>
            <GlobalOutlined style={{ marginRight: 8 }} />
            Nitter 免费抓取
          </span>
        }
        style={{ marginBottom: 24 }}
      >
        <Alert
          message="Nitter 是什么？"
          description={
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                Nitter 是一个开源的 Twitter 镜像项目，可以免费获取公开的推文内容。
                但它依赖公开实例，可能不稳定或被封禁。
              </Paragraph>
              <Button
                size="small"
                onClick={async () => {
                  message.loading('正在检测实例状态...')
                  for (const inst of NITTER_INSTANCES) {
                    await checkNitterStatus(inst.url)
                  }
                  message.success('检测完成')
                }}
              >
                检测所有实例状态
              </Button>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 实例列表 */}
        <Collapse defaultActiveKey={['instances']} style={{ marginBottom: 16 }}>
          <Panel header="可用 Nitter 实例" key="instances">
            <List
              size="small"
              dataSource={NITTER_INSTANCES}
              renderItem={(inst) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Badge
                        status={
                          nitterStatus[inst.url] === 'online' ? 'success' :
                          nitterStatus[inst.url] === 'offline' ? 'error' : 'default'
                        }
                      />
                    }
                    title={<span>{inst.name}</span>}
                    description={inst.note}
                  />
                  <Tag color={nitterStatus[inst.url] === 'online' ? 'green' : 'default'}>
                    {nitterStatus[inst.url] === 'online' ? '在线' :
                     nitterStatus[inst.url] === 'offline' ? '离线' : '未检测'}
                  </Tag>
                </List.Item>
              )}
            />
          </Panel>
        </Collapse>

        {/* 抓取配置 */}
        <Row gutter={16}>
          <Col span={8}>
            <Text strong>选择实例</Text>
            <Select
              value={config.instance}
              onChange={(val) => setConfig(prev => ({ ...prev, instance: val }))}
              style={{ width: '100%', marginTop: 4 }}
              options={NITTER_INSTANCES.map(inst => ({
                value: inst.url,
                label: inst.name
              }))}
            />
          </Col>
          <Col span={12}>
            <Text strong>Twitter 用户名</Text>
            <Input
              placeholder="输入用户名（不含@）"
              value={config.userInput}
              onChange={(e) => setConfig(prev => ({ ...prev, userInput: e.target.value }))}
              onPressEnter={fetchFromNitter}
              style={{ marginTop: 4 }}
              prefix="@"
            />
          </Col>
          <Col span={4}>
            <Text>&nbsp;</Text>
            <Button
              type="primary"
              icon={<CloudDownloadOutlined />}
              onClick={fetchFromNitter}
              loading={fetchingNitter}
              block
              style={{ marginTop: 4 }}
            >
              抓取
            </Button>
          </Col>
        </Row>

        {/* 结果 */}
        {nitterResults.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <Title level={5}>抓取结果</Title>
            <List
              size="small"
              dataSource={nitterResults}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<DatabaseOutlined />}
                    title={
                      <span>
                        <Tag color="blue">@{item.username}</Tag>
                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{item.date}</Text>
                      </span>
                    }
                    description={
                      <div>
                        <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 4 }}>
                          {item.text}
                        </Paragraph>
                        <a href={item.link} target="_blank" rel="noopener">查看原文 →</a>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Card>

      {/* RSS Bridge */}
      <Card
        title={
          <span>
            <FileTextOutlined style={{ marginRight: 8 }} />
            RSS Bridge 自建方案
          </span>
        }
      >
        <Row gutter={[24, 24]} align="middle">
          <Col span={16}>
            <Title level={5}>RSS Bridge</Title>
            <Paragraph>
              RSS Bridge 是一个开源工具，可以为 Twitter、微博、Instagram 等平台生成 RSS 订阅源。
              部署在自己的服务器上，不依赖第三方，永久免费。
            </Paragraph>
            <Space>
              <Tag icon={<CheckCircleOutlined />} color="green">永久免费</Tag>
              <Tag color="blue">自托管</Tag>
              <Tag color="purple">支持多平台</Tag>
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<GlobalOutlined />}
              href="https://github.com/RSS-Bridge/rss-bridge"
              target="_blank"
            >
              访问项目主页
            </Button>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                需要自己部署，但完全免费
              </Text>
            </div>
          </Col>
        </Row>

        <Divider />

        <Title level={5}>部署步骤</Title>
        <ol style={{ paddingLeft: 20, color: '#666' }}>
          <li>在服务器上安装 Docker</li>
          <li>运行: <code>docker run -d -p 8080:80 rssbridge/rss-bridge</code></li>
          <li>访问 http://your-server:8080</li>
          <li>选择 Twitter Bridge，输入用户名即可生成 RSS</li>
          <li>将 RSS URL 配置到本系统的定时抓取中</li>
        </ol>
      </Card>
    </div>
  )
}
