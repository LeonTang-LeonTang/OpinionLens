# OpinionLens - 舆论传播机制与意见领袖分析系统

![Netlify](https://img.shields.io/badge/Netlify-Deploy-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

**在线演示**: https://deft-cobbler-20d1c4.netlify.app

## 项目概述

基于社交媒体数据的舆论传播机制与意见领袖分析系统。研究课题以日本政治家**高市早苗**相关推文为数据源，分析舆论传播模式、情感倾向和意见领袖。

## 数据集

- **数据规模**: 271,852 条推文，50,463 个用户
- **时间范围**: 2025-10-01 ~ 2026-05-06
- **语言分布**: 日语为主（93%），包含中文、英语等

## 舆论分析维度

### 1. 传播网络分析
- 构建用户互动网络（回复、引用关系）
- 计算网络中心性指标（PageRank、介数中心性、度中心性）
- 社区检测与识别

### 2. 意见领袖识别
- 基于多维度指标的影响力评估
- 核心传播节点识别
- 用户画像分析

### 3. 情感分析
- 正面/中立/负面情感分类
- 情感分布统计
- 情感随时间变化趋势

### 4. 话题聚类
- 热门话题标签提取
- 月度话题变化追踪
- 关键词云生成

### 5. 时间序列分析
- 舆论热度时序变化
- 周内分布模式
- 高热度日识别

### 6. 用户行为分析
- 活跃度分布
- 互动模式（转发型/回复型/原创型）
- 用户分层

## 项目结构

```
AI_Society/
├── data_processed/          # 处理后的数据
│   ├── takaichi_chinese_processed.csv
│   ├── opinion_leaders.csv
│   ├── network_graph.json
│   ├── sentiment_analysis.csv
│   └── ...
├── src/                    # 数据分析脚本
│   ├── data_preprocessing.py
│   ├── network_analysis.py
│   └── sentiment_topic_analysis.py
├── backend/                # 后端API
│   ├── main.py
│   └── requirements.txt
├── frontend/               # 前端可视化
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── SentimentAnalysis.jsx
│   │   │   ├── TopicAnalysis.jsx
│   │   │   ├── Timeline.jsx
│   │   │   ├── Leaders.jsx
│   │   │   ├── NetworkGraph.jsx
│   │   │   └── Search.jsx
│   │   └── api/
│   └── dist/
├── dataset/               # 原始数据
├── start.sh              # 启动脚本
└── README.md
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18, Ant Design, ECharts, Vite |
| 后端 | FastAPI, Uvicorn |
| 数据处理 | Pandas, NumPy |
| 网络分析 | NetworkX |
| NLP | Jieba (中文分词) |

## 快速启动

### 1. 安装依赖

```bash
# Python依赖
pip install pandas networkx jieba fastapi uvicorn

# 前端依赖
cd frontend
npm install
```

### 2. 数据预处理

```bash
python src/data_preprocessing.py
python src/network_analysis.py
python src/sentiment_topic_analysis.py
```

### 3. 启动服务

```bash
# 方式一: 使用启动脚本
chmod +x start.sh
./start.sh

# 方式二: 手动启动
cd backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &
cd frontend && npm run dev
```

### 4. 访问系统

- 前端: http://localhost:3000
- 后端API: http://localhost:8000
- API文档: http://localhost:8000/docs

## API接口

| 端点 | 说明 |
|------|------|
| GET /api/overview | 获取舆论分析概览 |
| GET /api/sentiment | 情感分析结果 |
| GET /api/topics | 热门话题 |
| GET /api/timeline | 时间序列数据 |
| GET /api/leaders | 意见领袖榜单 |
| GET /api/network | 传播网络数据 |
| GET /api/communities | 社区信息 |
| GET /api/search | 推文搜索 |
| POST /api/scrape/topic | 多平台话题抓取 |
| GET /api/scrape/datasets | 抓取数据集列表 |
| GET /api/scrape/analyze/{id} | 分析抓取数据 |

## 主要分析结果

### 意见领袖 TOP 5

| 排名 | 用户 | 粉丝数 | 影响力得分 |
|------|------|--------|-----------|
| 1 | @takaichi_sanae | 2,879,488 | 0.0177 |
| 2 | @ashitawawatashi | 28,755 | 0.0091 |
| 3 | @47news_official | 84,670 | 0.0079 |
| 4 | @iloveyoulove777 | 30,401 | 0.0063 |
| 5 | @cobta | 72,773 | 0.0061 |

### 情感分布

- 正面: 16.9%
- 中立: 78.0%
- 负面: 5.1%

### 网络特征

- 节点数: 40,902
- 边数: 120,030
- 网络密度: 0.000072
- 最大连通分量: 36,427

## 项目时间线

| 阶段 | 内容 | 截止时间 |
|------|------|----------|
| 1 | 确定课题和分析维度 | ✅ 完成 |
| 2 | 数据清洗与预处理 | ✅ 完成 |
| 3 | 数据分析与模型构建 | ✅ 完成 |
| 4 | 系统前后端开发 | ✅ 完成 |
| 5 | 系统完善 | 进行中 |
| 6 | 撰写报告 | 待完成 |
| 7 | 制作PPT | 待完成 |

## 作者

AI Society Research Team

## 许可

MIT License
