import React from 'react'
import { Modal, Tag, Avatar, Typography, Button, Divider, Tooltip } from 'antd'
import { HeartOutlined, RetweetOutlined, MessageOutlined, CalendarOutlined, UserOutlined, LinkOutlined } from '@ant-design/icons'

const { Text, Paragraph } = Typography

export default function TweetDetailModal({ visible, tweet, onClose }) {
  if (!tweet) return null

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar size={48} style={{ backgroundColor: '#667eea' }}>
            {tweet.screen_name?.[0]?.toUpperCase() || 'U'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>@{tweet.screen_name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>用户 ID: {tweet.user_id || tweet.user_id_str || 'N/A'}</Text>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>关闭</Button>
      ]}
      width={680}
      centered
    >
      <Divider style={{ margin: '12px 0' }} />

      {/* 帖子内容 */}
      <div style={{ marginBottom: 16 }}>
        <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
          {tweet.full_text || tweet.text || '（内容不可用）'}
        </Paragraph>
      </div>

      {/* 媒体链接 */}
      {tweet.media_urls && tweet.media_urls.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">附件媒体: </Text>
          {tweet.media_urls.map((url, i) => (
            <Tag key={i} icon={<LinkOutlined />}>
              <a href={url} target="_blank" rel="noopener noreferrer">媒体 {i + 1}</a>
            </Tag>
          ))}
        </div>
      )}

      {/* 推文元信息 */}
      <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <Text type="secondary"><CalendarOutlined /> 发布时间</Text>
            <div style={{ fontWeight: 500 }}>
              {tweet.created_at ? new Date(tweet.created_at).toLocaleString('zh-CN') : 'N/A'}
            </div>
          </div>
          <div>
            <Text type="secondary"><LinkOutlined /> 推文 ID</Text>
            <div style={{ fontWeight: 500 }}>{tweet.tweet_id || tweet.id_str || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* 互动数据 */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        <Tooltip title="点赞数">
          <span style={{ color: '#ff4d4f' }}>
            <HeartOutlined /> {tweet.favorite_count?.toLocaleString() || 0}
          </span>
        </Tooltip>
        <Tooltip title="转发数">
          <span style={{ color: '#52c41a' }}>
            <RetweetOutlined /> {tweet.retweet_count?.toLocaleString() || 0}
          </span>
        </Tooltip>
        <Tooltip title="回复数">
          <span style={{ color: '#1890ff' }}>
            <MessageOutlined /> {tweet.reply_count?.toLocaleString() || 0}
          </span>
        </Tooltip>
      </div>

      {/* 转发/回复关系 */}
      {tweet.in_reply_to_screen_name && (
        <div style={{ marginBottom: 16, padding: 12, background: '#e6f7ff', borderRadius: 8 }}>
          <Text type="secondary">
            回复 @<strong>{tweet.in_reply_to_screen_name}</strong>
            {tweet.in_reply_to_status_id && (
              <span style={{ marginLeft: 8 }}>（推文ID: {tweet.in_reply_to_status_id}）</span>
            )}
          </Text>
        </div>
      )}

      {tweet.is_quote_status && (
        <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 8 }}>
          <Text type="secondary">这是引用推文</Text>
          {tweet.quoted_status_id && (
            <div>引用源ID: {tweet.quoted_status_id}</div>
          )}
        </div>
      )}

      {tweet.retweeted_status_id && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 8 }}>
          <Text type="secondary">这是转推</Text>
          <div>原始推文ID: {tweet.retweeted_status_id}</div>
        </div>
      )}

      {/* 话题标签 */}
      {tweet.hashtags && tweet.hashtags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>话题标签:</Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tweet.hashtags.map((tag, i) => (
              <Tag key={i} color="blue">#{tag}</Tag>
            ))}
          </div>
        </div>
      )}

      {/* 用户信息 */}
      <Divider style={{ margin: '12px 0' }} />
      <div style={{ background: '#fafafa', padding: 12, borderRadius: 8 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          <UserOutlined /> 用户信息
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
          <div>粉丝数: {tweet.followers_count?.toLocaleString() || 'N/A'}</div>
          <div>关注数: {tweet.friends_count?.toLocaleString() || 'N/A'}</div>
          <div>发帖数: {tweet.statuses_count?.toLocaleString() || 'N/A'}</div>
          <div>账户创建: {tweet.account_created_at ? new Date(tweet.account_created_at).toLocaleDateString('zh-CN') : 'N/A'}</div>
        </div>
      </div>
    </Modal>
  )
}
