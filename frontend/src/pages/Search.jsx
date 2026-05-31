import React, { useState } from 'react'
import { Card, Input, Button, List, Avatar, Tag, Spin, Empty, Drawer, Typography, Divider } from 'antd'
import { SearchOutlined, HeartOutlined, RetweetOutlined, MessageOutlined } from '@ant-design/icons'
import { searchTweets } from '../api'

const { Text, Paragraph } = Typography

export default function Search() {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [searched, setSearched] = useState(false)
  const [selectedTweet, setSelectedTweet] = useState(null)
  const [drawerVisible, setDrawerVisible] = useState(false)

  const handleSearch = async () => {
    if (!keyword.trim()) return

    setLoading(true)
    setSearched(true)
    try {
      const res = await searchTweets(keyword, 30)
      setResults(res.data)
    } catch (error) {
      console.error('搜索失败:', error)
    }
    setLoading(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const showTweetDetail = (tweet) => {
    setSelectedTweet(tweet)
    setDrawerVisible(true)
  }

  return (
    <div>
      <Card title="话题搜索">
        <div style={{ display: 'flex', gap: 12 }}>
          <Input
            size="large"
            placeholder="输入关键词搜索推文..."
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            size="large"
            onClick={handleSearch}
            loading={loading}
            icon={<SearchOutlined />}
          >
            搜索
          </Button>
        </div>

        <div style={{ marginTop: 16 }}>
          <span style={{ color: '#888' }}>热门搜索: </span>
          {['高市早苗', '統一教会', '自民党', '总理', '支持', '反对'].map(kw => (
            <Tag
              key={kw}
              style={{ cursor: 'pointer', margin: '4px' }}
              onClick={() => {
                setKeyword(kw)
                setLoading(true)
                searchTweets(kw, 30).then(res => {
                  setResults(res.data)
                  setSearched(true)
                }).finally(() => setLoading(false))
              }}
            >
              {kw}
            </Tag>
          ))}
        </div>
      </Card>

      {loading && (
        <div className="loading-container" style={{ marginTop: 24 }}>
          <Spin size="large" />
        </div>
      )}

      {searched && !loading && results && (
        <Card title={`搜索结果: "${results.keyword}"`} style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 16, color: '#888' }}>
            共找到 {results.total_matches?.toLocaleString() || 0} 条相关推文
          </div>

          {results.results?.length > 0 ? (
            <List
              dataSource={results.results}
              renderItem={(item) => (
                <List.Item
                  onClick={() => showTweetDetail(item)}
                  style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  actions={[
                    <span key="fav" onClick={(e) => e.stopPropagation()}>
                      <HeartOutlined style={{ color: '#ff4d4f' }} /> {item.favorite_count || 0}
                    </span>,
                    <span key="rt" onClick={(e) => e.stopPropagation()}>
                      <RetweetOutlined style={{ color: '#52c41a' }} /> {item.retweet_count || 0}
                    </span>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ backgroundColor: '#667eea' }}>
                        {item.screen_name?.[0]?.toUpperCase() || 'U'}
                      </Avatar>
                    }
                    title={<span>@{item.screen_name}</span>}
                    description={
                      <div>
                        <div style={{ margin: '8px 0', lineHeight: 1.6 }}>
                          {item.full_text?.length > 200
                            ? item.full_text.slice(0, 200) + '...'
                            : item.full_text}
                        </div>
                        <div style={{ fontSize: 12, color: '#888' }}>
                          {item.created_at?.split('T')[0] || item.created_at}
                          <Text type="secondary" style={{ marginLeft: 16, fontSize: 12 }}>
                            点击查看详情 →
                          </Text>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="未找到相关推文" />
          )}
        </Card>
      )}

      {/* 推文详情抽屉 */}
      <Drawer
        title={
          <div>
            <Avatar style={{ backgroundColor: '#667eea', marginRight: 8 }}>
              {selectedTweet?.screen_name?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            @{selectedTweet?.screen_name}
          </div>
        }
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={520}
      >
        {selectedTweet && (
          <div>
            <Paragraph style={{ fontSize: 16, lineHeight: 1.8, marginBottom: 24 }}>
              {selectedTweet.full_text}
            </Paragraph>

            <Divider />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <Text type="secondary">发布时间</Text>
                <div style={{ fontWeight: 500 }}>
                  {selectedTweet.created_at ? new Date(selectedTweet.created_at).toLocaleString('zh-CN') : 'N/A'}
                </div>
              </div>
              <div>
                <Text type="secondary">推文ID</Text>
                <div style={{ fontWeight: 500, fontSize: 12 }}>{selectedTweet.tweet_id}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
              <span style={{ color: '#ff4d4f' }}>
                <HeartOutlined /> 点赞: {selectedTweet.favorite_count?.toLocaleString() || 0}
              </span>
              <span style={{ color: '#52c41a' }}>
                <RetweetOutlined /> 转发: {selectedTweet.retweet_count?.toLocaleString() || 0}
              </span>
              <span style={{ color: '#1890ff' }}>
                <MessageOutlined /> 回复: {selectedTweet.reply_count?.toLocaleString() || 0}
              </span>
            </div>

            {selectedTweet.in_reply_to_screen_name && (
              <div style={{ marginBottom: 16, padding: 12, background: '#e6f7ff', borderRadius: 8 }}>
                <Text type="secondary">回复 @<strong>{selectedTweet.in_reply_to_screen_name}</strong></Text>
              </div>
            )}

            {selectedTweet.hashtags && selectedTweet.hashtags.length > 0 && (
              <div>
                <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>话题标签:</Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedTweet.hashtags.map((tag, i) => (
                    <Tag key={i} color="blue">#{tag}</Tag>
                  ))}
                </div>
              </div>
            )}

            <Divider />

            <div style={{ background: '#fafafa', padding: 12, borderRadius: 8 }}>
              <Text type="secondary">用户信息</Text>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, fontSize: 13 }}>
                <div>粉丝: {selectedTweet.followers_count?.toLocaleString() || 'N/A'}</div>
                <div>关注: {selectedTweet.friends_count?.toLocaleString() || 'N/A'}</div>
                <div>发帖: {selectedTweet.statuses_count?.toLocaleString() || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
