import React from 'react'
import { Card, Row, Col, Alert, Typography } from 'antd'

const { Title, Paragraph, Text } = Typography

// 各页面的报告说明
export const PAGE_REPORTS = {
  dashboard: {
    title: '概览报告',
    summary: '本页面展示舆论分析的核心指标概览，帮助快速了解话题的整体传播态势。',
    sections: [
      {
        title: '数据规模',
        desc: '展示推文总数、用户规模等基础数据，反映话题的传播范围。'
      },
      {
        title: '时间跨度',
        desc: '数据覆盖的时间范围，帮助判断分析的时效性和完整性。'
      },
      {
        title: '网络结构',
        desc: '节点数表示参与传播的独立用户数，边数表示互动关系总量，密度反映用户间的连接紧密程度。'
      },
      {
        title: '情感分布',
        desc: '正面/中立/负面情感比例是判断公众态度的核心指标。'
      }
    ],
    interpretation: {
      title: '解读指南',
      tips: [
        '高节点数 + 高边数：话题传播范围广、互动频繁',
        '高密度：用户间联系紧密，可能是小圈子深度讨论',
        '低密度：用户间连接松散，可能是信息碎片化传播',
        '正面情感占比高：话题受到公众支持',
        '负面情感占比高：需要关注潜在舆情风险'
      ]
    }
  },

  sentiment: {
    title: '情感分析报告',
    summary: '情感分析是舆论研究的核心方法，通过识别文本的情感倾向，判断公众对特定话题的态度是支持、反对还是中立。',
    sections: [
      {
        title: '正面情感',
        desc: '表达支持、认同、赞扬的内容，如对政策的赞同、对人物的鼓励、对事件的积极评价。'
      },
      {
        title: '中立情感',
        desc: '客观陈述事实、转发新闻报道、不带情绪的中性内容，通常表示信息传播而非态度表达。'
      },
      {
        title: '负面情感',
        desc: '表达批评、反对、担忧、嘲讽的内容，如对政策的质疑、对人物的批评、对事件的负面评价。'
      },
      {
        title: '情感倾向指数',
        desc: '正面情感占比（0-100%），是判断整体舆论倾向的综合指标。参考标准：>60%偏正面，40-60%偏中立，<40%偏负面。'
      }
    ],
    interpretation: {
      title: '解读指南',
      tips: [
        '中立情感占比>70%：话题处于信息传播阶段，公众仍在观望',
        '正面情感突增：可能有官方或支持力量介入',
        '负面情感突增：往往是舆论危机的先兆',
        '正负比>3:1：话题有较强的支持基础',
        '情感波动剧烈：可能存在对抗性舆论'
      ]
    }
  },

  topics: {
    title: '话题分析报告',
    summary: '话题分析通过识别高频 hashtag 和关键词，发现公众讨论的核心议题及其热度排名。',
    sections: [
      {
        title: '热门话题',
        desc: '按出现频次排序的话题标签，反映当前最受关注的讨论焦点。'
      },
      {
        title: '话题关联',
        desc: '分析各话题之间的共现关系，发现话题间的内在联系。'
      }
    ],
    interpretation: {
      title: '解读指南',
      tips: [
        'TOP话题往往是舆论焦点',
        '新兴话题的增速比绝对数量更能反映舆论走向',
        '话题集中度高可能表明讨论单一化',
        '多话题并存表示舆论多元分化'
      ]
    }
  },

  timeline: {
    title: '时间趋势分析报告',
    summary: '时间序列分析揭示话题热度的动态变化，帮助识别关键时间节点和传播规律。',
    sections: [
      {
        title: '日/周/月趋势',
        desc: '不同时间粒度下的活动量变化，日粒度适合短期事件，周/月粒度适合长期趋势分析。'
      },
      {
        title: '峰值识别',
        desc: '热度显著高于平均的时间点，通常对应重大事件或话题引爆点。'
      },
      {
        title: '周期性规律',
        desc: '周末/工作日的活跃度差异、每日活跃时段分布等规律。'
      }
    ],
    interpretation: {
      title: '解读指南',
      tips: [
        '峰值往往对应重要事件发生',
        '热度的快速上升可能来自KOL推动或热点事件',
        '热度的缓慢下降表示话题自然消退',
        '热度的骤然下降可能来自平台干预或话题压制'
      ]
    }
  },

  leaders: {
    title: '意见领袖分析报告',
    summary: '意见领袖（KOL）在舆论传播中具有关键影响力，通过分析其特征识别核心传播节点。',
    sections: [
      {
        title: '影响力得分',
        desc: '综合粉丝数、互动量、传播范围计算的复合指标，反映账号的综合影响力。'
      },
      {
        title: 'PageRank',
        desc: '基于网络结构的中心性指标，衡量用户在信息传播网络中的重要程度。'
      },
      {
        title: '介数中心性',
        desc: '衡量用户作为"桥梁"连接不同群体的程度，高介数用户是信息扩散的关键节点。'
      }
    ],
    interpretation: {
      title: '解读指南',
      tips: [
        'TOP KOL 通常主导话题走向',
        '高PageRank + 低粉丝数：可能是专业信息来源',
        '高介数中心性：消息中转站，阻断他们会影响传播',
        '多个KOL立场一致：可能存在协同引导',
        'KOL之间存在分歧：舆论存在阵营对抗'
      ]
    }
  },

  network: {
    title: '传播网络分析报告',
    summary: '传播网络分析揭示信息在用户间的扩散路径，帮助理解舆论的传播结构和关键节点。',
    sections: [
      {
        title: '网络概览',
        desc: '节点数、边数、密度等基础指标，反映网络规模和连接程度。'
      },
      {
        title: '传播核心',
        desc: '被回复最多的用户，是话题讨论的核心人物或权威来源。'
      },
      {
        title: '传播链路',
        desc: '信息从源头扩散到更多用户的具体路径，展示传播链条。'
      },
      {
        title: '社区结构',
        desc: '用户群体形成的自然分组，可能代表不同立场或圈层。'
      }
    ],
    interpretation: {
      title: '解读指南',
      tips: [
        '高密度网络：用户紧密互动，可能形成回音室效应',
        '低密度网络：信息碎片化传播，难以形成统一舆论',
        '多个孤立社区：舆论分化严重',
        '单一核心结构：存在主导力量',
        '传播链路长：信息深度渗透'
      ]
    }
  },

  topic_search: {
    title: '话题深度分析报告',
    summary: '通用话题分析支持任意关键词搜索，对特定议题进行深度剖析。',
    sections: [
      {
        title: '搜索匹配',
        desc: '在所有推文中搜索包含关键词的内容，计算相关规模。'
      },
      {
        title: '参与者分析',
        desc: '识别最活跃的讨论者，分析其影响力。'
      },
      {
        title: '代表性推文',
        desc: '按互动量排序的代表性内容，反映核心观点。'
      },
      {
        title: '热度时序',
        desc: '话题随时间的热度变化，识别话题的生命周期。'
      }
    ],
    interpretation: {
      title: '解读指南',
      tips: [
        '搜索结果多不一定重要，还要看互动量',
        '核心参与者决定了话题的讨论方向',
        '代表性推文往往反映最具争议或最有传播力的观点',
        '热度持续上升表示话题仍在发酵'
      ]
    }
  },

  advanced: {
    title: '异常检测与风险评估报告',
    summary: '通过多维度特征分析，识别可能存在舆论操纵风险的账号和传播行为。',
    sections: [
      {
        title: '可疑账号',
        desc: '基于发帖频率、内容模式、互动行为等特征，识别可能的自动化账号或水军。'
      },
      {
        title: '协同传播',
        desc: '检测多个账号短时间内发布相似内容的模式，可能是预先策划的群体行为。'
      },
      {
        title: '异常波动',
        desc: '识别热度突增或骤降的时间点，可能对应重要事件或人为操纵。'
      },
      {
        title: '风险评分',
        desc: '综合多特征计算的可疑程度评分，帮助快速筛选重点关注对象。'
      }
    ],
    interpretation: {
      title: '解读指南',
      tips: [
        '高风险账号应降低其在分析中的权重',
        '协同传播事件表明可能存在组织行为',
        '异常波动时间点需要进一步调查原因',
        '多个异常信号叠加 = 高操纵风险'
      ]
    }
  }
}

// 报告说明组件
export default function AnalysisReport({ pageKey }) {
  const report = PAGE_REPORTS[pageKey]

  if (!report) return null

  return (
    <Card
      title={report.title}
      size="small"
      style={{ marginBottom: 16, background: '#fafafa' }}
    >
      <Paragraph>
        <Text strong>分析概述：</Text> {report.summary}
      </Paragraph>

      <Row gutter={[16, 8]}>
        {report.sections?.map((section, i) => (
          <Col xs={24} sm={12} key={i}>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ color: '#667eea' }}>{section.title}：</Text>
              <Text type="secondary">{section.desc}</Text>
            </div>
          </Col>
        ))}
      </Row>

      {report.interpretation && (
        <>
          <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', borderRadius: 8 }}>
            <Text strong style={{ color: '#1890ff' }}>{report.interpretation.title}：</Text>
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              {report.interpretation.tips?.map((tip, i) => (
                <li key={i} style={{ color: '#666', marginBottom: 4 }}>{tip}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </Card>
  )
}

// 迷你报告提示
export function MiniReportTip({ pageKey }) {
  const report = PAGE_REPORTS[pageKey]
  if (!report || !report.interpretation) return null

  return (
    <Alert
      message={report.interpretation.title}
      description={
        <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
          {report.interpretation.tips?.slice(0, 2).map((tip, i) => (
            <li key={i} style={{ color: '#666' }}>{tip}</li>
          ))}
        </ul>
      }
      type="info"
      showIcon
      style={{ marginBottom: 16 }}
    />
  )
}
