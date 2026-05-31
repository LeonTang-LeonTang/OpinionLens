import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Table, Tag, Progress, Spin, Timeline, Alert, Collapse, Button, Badge, Divider, Tooltip } from 'antd'
import ReactECharts from 'echarts-for-react'
import {
  fetchBurstEvents,
  fetchSuspiciousAccounts,
  fetchCoordinatedBehavior,
  fetchPropagationChains,
  fetchAnomalies
} from '../api'
import { QuestionCircleOutlined, SafetyCertificateOutlined, WarningOutlined } from '@ant-design/icons'

const { Panel } = Collapse

// 术语词典
const GLOSSARY = {
  suspicious_accounts: {
    title: '可疑账号检测 - 术语解释',
    terms: [
      {
        term: '风险评分',
        desc: '综合多维度特征计算的0-1之间的分数，越高表示账号越可疑。计算权重：回复比例过高(30%) + 高发帖量(20%) + 粉丝/发帖比异常(25%) + 互动率低(15%) + 日均发帖异常(20%)。',
        threshold: '≥0.6为高风险，0.3-0.6为中风险'
      },
      {
        term: '高发帖量',
        desc: '账号在短时间内发布大量推文（>100条），超出正常用户行为范围，可能是自动化操作或水军活动。',
        normal: '普通用户平均每天发5-20条推文'
      },
      {
        term: '回复比例过高',
        desc: '账号的推文中超过90%是回复他人，而非原创内容。这种"被动传播"模式常见于水军账号，用于扩大特定话题的传播声量。',
        pattern: '正常讨论中原创与回复比例约为3:7'
      },
      {
        term: '粉丝/发帖比异常',
        desc: '粉丝数除以发帖数小于1，表明账号发帖多但关注者少。这是僵尸粉和刷量账号的典型特征。',
        normal: '正常账号该比值通常>10'
      },
      {
        term: '互动率低',
        desc: '账号的获赞和转发数量远低于发帖数量，表明内容缺乏吸引力，可能是为了发帖而发帖的机器账号。',
        formula: '互动率 = (获赞+转发) / 发帖数'
      },
      {
        term: '日均发帖异常',
        desc: '账号活跃天数很短但日均发帖量极高（如1天发100条），可能是定时脚本或协同操纵的批量操作。',
        threshold: '日均>50条为异常'
      }
    ]
  },
  coordinated_behavior: {
    title: '协同传播检测 - 术语解释',
    terms: [
      {
        term: '协同传播',
        desc: '多个账号在短时间内发布高度相似或相同的内容，可能是预先策划的群体行为。常见于舆论引导、水军活动或话题营销。',
        indicator: '识别信号：内容相似度>80% + 时间窗口<30分钟 + 账号关联性'
      },
      {
        term: '内容相似度',
        desc: '通过比较推文前50个字符判断内容重复程度。相似度高+同时发布=协同操纵的强信号。',
        threshold: '≥80%相似度视为可疑'
      },
      {
        term: '时间窗口',
        desc: '检测"短时间内发布相似内容"的窗口期，设置为30分钟内。窗口越短，协同操纵的可能性越高。',
        interpretation: '30分钟内3个以上账号发布相同内容=强协同信号'
      }
    ]
  },
  anomalies: {
    title: '异常波动检测 - 术语解释',
    terms: [
      {
        term: '热度突增',
        desc: '某日推文数量远超历史平均水平（超过3个标准差），可能对应重大事件、热点话题或人为推动。',
        formula: 'Z-score = (当日数量 - 7日均值) / 7日标准差，Z>3为突增'
      },
      {
        term: '热度骤降',
        desc: '与突增相反，某日活跃度突然下降，可能是话题冷却、平台干预或外部事件影响。',
        interpretation: '连续骤降可能表明话题被压制或热度自然消退'
      },
      {
        term: '变化率',
        desc: '当日与前一日的推文数量变化百分比，正值表示增长，负值表示下降。',
        threshold: '变化率绝对值>200%视为显著异常'
      }
    ]
  }
}

// 案例分析
const CASE_STUDIES = {
  case1: {
    title: '案例1：社交机器人识别',
    scenario: '某政治话题讨论中，突然出现一批高活跃度账号，发帖频率远高于正常用户。',
    analysis: {
      risk_factors: ['日均发帖>100条', '粉丝/发帖比<1', '回复比例>90%', '互动率为0'],
      conclusion: '这些特征符合社交机器人的典型模式：高自动化、低影响力、被动传播。'
    },
    recommendation: '建议将此类账号标记为"可疑传播源"，在后续分析中降低其权重或排除。'
  },
  case2: {
    title: '案例2：协同传播识别',
    scenario: '某政策发布后，短时间内多个账号发布完全相同的内容，配图也一致。',
    analysis: {
      risk_factors: ['内容相似度>95%', '发布时间差<5分钟', '账号间存在转发关联'],
      conclusion: '这是典型的协同传播模式，可能是官方或特定组织的有组织宣传行为。'
    },
    recommendation: '建议区分"原创传播者"与"协同扩散者"，分析协同行为对整体舆论的影响程度。'
  },
  case3: {
    title: '案例3：舆论操纵检测',
    scenario: '某话题热度在某日突然爆发，但主要由少数高影响力账号驱动，普通用户参与度低。',
    analysis: {
      risk_factors: ['热度突增Z-score>5', 'Top10账号贡献>60%热度', '新增参与者数量少'],
      conclusion: '可能是"KOL驱动型"操纵，通过收买大V或协同放大多方观点来影响舆论走向。'
    },
    recommendation: '建议追踪高影响力账号的背景和利益关联，分析其推动话题的真实动机。'
  }
}

export default function AdvancedAnalysis() {
  const [loading, setLoading] = useState(true)
  const [showGlossary, setShowGlossary] = useState(false)
  const [showCases, setShowCases] = useState(false)
  const [burstEvents, setBurstEvents] = useState([])
  const [suspicious, setSuspicious] = useState({})
  const [coordinated, setCoordinated] = useState({})
  const [propagation, setPropagation] = useState({})
  const [anomalies, setAnomalies] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [burstRes, suspiciousRes, coordinatedRes, propagationRes, anomalyRes] = await Promise.all([
        fetchBurstEvents(),
        fetchSuspiciousAccounts(30),
        fetchCoordinatedBehavior(20),
        fetchPropagationChains(20),
        fetchAnomalies()
      ])
      setBurstEvents(burstRes.data.events || [])
      setSuspicious(suspiciousRes.data || {})
      setCoordinated(coordinatedRes.data || {})
      setPropagation(propagationRes.data || {})
      setAnomalies(anomalyRes.data.anomalies || [])
    } catch (error) {
      console.error('加载数据失败:', error)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="loading-container"><Spin size="large" /></div>
  }

  const suspiciousColumns = [
    {
      title: '用户',
      dataIndex: 'screen_name',
      key: 'screen_name',
      render: (name) => <Tag color="blue">@{name}</Tag>
    },
    {
      title: '发帖数',
      dataIndex: 'tweet_count',
      key: 'tweet_count',
      render: (val) => val?.toLocaleString()
    },
    {
      title: '粉丝数',
      dataIndex: 'followers_count',
      key: 'followers_count',
      render: (val) => val?.toLocaleString() || '-'
    },
    {
      title: '风险评分',
      dataIndex: 'risk_score',
      key: 'risk_score',
      width: 150,
      render: (score) => (
        <Progress
          percent={score * 100}
          size="small"
          status={score >= 0.6 ? 'exception' : 'active'}
          strokeColor={score >= 0.6 ? '#ff4d4f' : '#faad14'}
        />
      )
    },
    {
      title: '风险因素',
      dataIndex: 'risk_factors',
      key: 'risk_factors',
      render: (factors) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(factors || []).map((f, i) => (
            <Tooltip key={i} title={f}>
              <Tag color="orange">{f}</Tag>
            </Tooltip>
          ))}
        </div>
      )
    },
    {
      title: '风险等级',
      dataIndex: 'risk_level',
      key: 'risk_level',
      render: (level) => (
        <Tag color={level === 'high' ? 'red' : 'gold'} icon={level === 'high' ? <WarningOutlined /> : null}>
          {level === 'high' ? '高风险' : '中风险'}
        </Tag>
      )
    }
  ]

  const coordinatedColumns = [
    {
      title: '时间窗口',
      dataIndex: 'time_window',
      key: 'time_window',
      render: (time) => <Tag color="purple">{time}</Tag>
    },
    {
      title: '内容预览',
      dataIndex: 'text_preview',
      key: 'text_preview',
      ellipsis: true,
      render: (text) => <span title={text}>{text}</span>
    },
    {
      title: '参与账号',
      dataIndex: 'account_count',
      key: 'account_count',
      render: (count) => (
        <Badge count={count} style={{ backgroundColor: '#1890ff' }} showZero />
      )
    },
    {
      title: '样本账号',
      dataIndex: 'sample_accounts',
      key: 'sample_accounts',
      render: (accounts) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(accounts || []).slice(0, 3).map((a, i) => (
            <Tag key={i}>{a}</Tag>
          ))}
          {(accounts || []).length > 3 && <Tag>+{accounts.length - 3}</Tag>}
        </div>
      )
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
      title: '目标用户',
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
      title: '内容',
      dataIndex: 'text_preview',
      key: 'text_preview',
      ellipsis: true
    }
  ]

  return (
    <div>
      {/* 功能说明 */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Alert
            message="异常检测与舆论操纵识别"
            description={
              <div>
                <p>本模块通过多维度特征分析，识别可能存在舆论操纵风险的账号和传播行为。</p>
                <p style={{ color: '#666', fontSize: 12 }}>
                  <strong>使用指南：</strong>先阅读下方"术语解释"理解各指标含义，再查看"可疑账号"和"协同传播"列表，点击具体账号可查看详细风险证据。
                </p>
              </div>
            }
            type="info"
            showIcon
            icon={<SafetyCertificateOutlined />}
          />
        </Col>
      </Row>

      {/* 辅助功能按钮 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col>
          <Button
            type={showGlossary ? 'primary' : 'default'}
            icon={<QuestionCircleOutlined />}
            onClick={() => setShowGlossary(!showGlossary)}
          >
            {showGlossary ? '收起术语解释' : '查看术语解释'}
          </Button>
        </Col>
        <Col>
          <Button
            type={showCases ? 'primary' : 'default'}
            icon={<WarningOutlined />}
            onClick={() => setShowCases(!showCases)}
          >
            {showCases ? '收起案例分析' : '查看案例分析'}
          </Button>
        </Col>
      </Row>

      {/* 术语解释面板 */}
      {showGlossary && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Collapse defaultActiveKey={['suspicious', 'coordinated', 'anomalies']}>
              <Panel header={GLOSSARY.suspicious_accounts.title} key="suspicious">
                {GLOSSARY.suspicious_accounts.terms.map((item, i) => (
                  <div key={i} style={{ marginBottom: 16, padding: '8px 0', borderBottom: i < GLOSSARY.suspicious_accounts.terms.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <div style={{ fontWeight: 600, color: '#667eea', marginBottom: 4 }}>{item.term}</div>
                    <div style={{ color: '#666' }}>{item.desc}</div>
                    {item.threshold && (
                      <Tag color="red" style={{ marginTop: 4 }}>判断标准: {item.threshold}</Tag>
                    )}
                    {item.normal && (
                      <Tag color="green" style={{ marginTop: 4 }}>正常值: {item.normal}</Tag>
                    )}
                  </div>
                ))}
              </Panel>
              <Panel header={GLOSSARY.coordinated_behavior.title} key="coordinated">
                {GLOSSARY.coordinated_behavior.terms.map((item, i) => (
                  <div key={i} style={{ marginBottom: 16, padding: '8px 0', borderBottom: i < GLOSSARY.coordinated_behavior.terms.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <div style={{ fontWeight: 600, color: '#667eea', marginBottom: 4 }}>{item.term}</div>
                    <div style={{ color: '#666' }}>{item.desc}</div>
                    {item.threshold && (
                      <Tag color="red" style={{ marginTop: 4 }}>判断标准: {item.threshold}</Tag>
                    )}
                    {item.indicator && (
                      <Tag color="blue" style={{ marginTop: 4 }}>识别信号: {item.indicator}</Tag>
                    )}
                  </div>
                ))}
              </Panel>
              <Panel header={GLOSSARY.anomalies.title} key="anomalies">
                {GLOSSARY.anomalies.terms.map((item, i) => (
                  <div key={i} style={{ marginBottom: 16, padding: '8px 0', borderBottom: i < GLOSSARY.anomalies.terms.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <div style={{ fontWeight: 600, color: '#667eea', marginBottom: 4 }}>{item.term}</div>
                    <div style={{ color: '#666' }}>{item.desc}</div>
                    {item.threshold && (
                      <Tag color="red" style={{ marginTop: 4 }}>判断标准: {item.threshold}</Tag>
                    )}
                    {item.formula && (
                      <Tag color="purple" style={{ marginTop: 4 }}>公式: {item.formula}</Tag>
                    )}
                  </div>
                ))}
              </Panel>
            </Collapse>
          </Col>
        </Row>
      )}

      {/* 案例分析 */}
      {showCases && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="案例分析 - 典型异常模式解读">
              <Row gutter={[16, 16]}>
                {Object.values(CASE_STUDIES).map((caseItem, i) => (
                  <Col xs={24} lg={8} key={i}>
                    <Card
                      size="small"
                      title={caseItem.title}
                      style={{ height: '100%' }}
                    >
                      <p style={{ marginBottom: 8 }}><strong>场景：</strong></p>
                      <p style={{ color: '#666', marginBottom: 12 }}>{caseItem.scenario}</p>
                      <Divider style={{ margin: '12px 0' }} />
                      <p style={{ marginBottom: 8 }}><strong>分析结果：</strong></p>
                      <ul style={{ color: '#666', paddingLeft: 16, marginBottom: 12 }}>
                        {caseItem.analysis.risk_factors.map((f, j) => (
                          <li key={j}>{f}</li>
                        ))}
                      </ul>
                      <Alert
                        message={caseItem.analysis.conclusion}
                        type="warning"
                        showIcon
                        style={{ marginBottom: 12 }}
                      />
                      <p style={{ marginBottom: 8 }}><strong>处置建议：</strong></p>
                      <p style={{ color: '#1890ff', fontSize: 13 }}>{caseItem.recommendation}</p>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* 统计概览 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div className="stat-card">
              <div className="label">热度突增事件</div>
              <div className="value">{burstEvents.length}</div>
              <div style={{ color: '#666', fontSize: 12 }}>可能存在舆论推动</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div className="stat-card">
              <div className="label">高风险账号</div>
              <div className="value red">{suspicious.high_risk || 0}</div>
              <div style={{ color: '#ff4d4f', fontSize: 12 }}>需重点关注</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div className="stat-card">
              <div className="label">协同传播事件</div>
              <div className="value">{coordinated.total_events || 0}</div>
              <div style={{ color: '#666', fontSize: 12 }}>可能有组织行为</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div className="stat-card">
              <div className="label">传播链路</div>
              <div className="value">{(propagation.total_chains || 0).toLocaleString()}</div>
              <div style={{ color: '#666', fontSize: 12 }}>总回复传播链</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 可疑账号 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card
            title={
              <span>
                <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                可疑账号检测
                <Tag color="gold" style={{ marginLeft: 8 }}>中风险: {suspicious.medium_risk || 0} 个</Tag>
                <Tag color="red" style={{ marginLeft: 8 }}>高风险: {suspicious.high_risk || 0} 个</Tag>
              </span>
            }
          >
            <Alert
              message="如何解读风险评分？"
              description={
                <span>
                  风险评分基于发帖频率、粉丝比例、互动模式等多维度计算。
                  <strong>高风险（≥0.6）</strong>：强烈建议标记为可疑来源。
                  <strong>中风险（0.3-0.6）</strong>：建议结合其他证据综合判断。
                  点击上方"术语解释"可查看各指标详细含义。
                </span>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Table
              columns={suspiciousColumns}
              dataSource={suspicious.accounts || []}
              rowKey="screen_name"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* 协同传播 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card
            title={
              <span>
                <WarningOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                协同传播事件
              </span>
            }
          >
            <Alert
              message="什么是协同传播？"
              description="多个账号在短时间内发布高度相似的内容，可能是预先策划的群体行为，如水军活动、话题营销或有组织的舆论引导。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Table
              columns={coordinatedColumns}
              dataSource={coordinated.events || []}
              rowKey="time_window"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* 传播链路 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card
            title={
              <span>
                <WarningOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                代表性传播链路
              </span>
            }
          >
            <Alert
              message="如何理解传播链路？"
              description={
                <span>
                  传播链路展示信息从"源用户"扩散到"目标用户"的路径。
                  高互动数的链路通常是关键传播节点，可用于追踪话题的扩散路径和识别核心传播者。
                  共 {(propagation.total_chains || 0).toLocaleString()} 条传播链路，平均长度 {propagation.avg_chain_length?.toFixed(2)}。
                </span>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Table
              columns={propagationColumns}
              dataSource={propagation.chains || []}
              rowKey={(r, i) => i}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* 异常波动时间线 */}
      {anomalies.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col span={24}>
            <Card title="异常波动时间线">
              <Alert
                message="异常波动提示"
                description="以下时间点出现显著的热度变化（突增或骤降），可能对应重要事件、舆论操纵或外部干预。"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Timeline
                items={anomalies.slice(0, 10).map(a => ({
                  color: a.type === 'surge' ? 'green' : 'red',
                  children: (
                    <div>
                      <strong>{a.date}</strong>
                      <Tag color={a.type === 'surge' ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                        {a.type === 'surge' ? '热度突增' : '热度骤降'}
                      </Tag>
                      <span style={{ marginLeft: 8 }}>
                        变化率: <strong style={{ color: a.type === 'surge' ? '#52c41a' : '#ff4d4f' }}>
                          {a.change_rate > 0 ? '+' : ''}{a.change_rate}%
                        </strong>
                      </span>
                      <span style={{ marginLeft: 8, color: '#666' }}>
                        ({a.count.toLocaleString()} 条推文)
                      </span>
                    </div>
                  )
                }))}
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  )
}
