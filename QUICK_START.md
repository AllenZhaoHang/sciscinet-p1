# 快速启动指南

## ✅ 已完成

1. **数据转换**：已将你的数据文件转换为后端期望的格式
   - `backend/data/papers.csv` (200 行)
   - `backend/data/citations.csv` (98 行)
   - `backend/data/authorships.csv` (2341 行)

2. **服务启动**：后端和前端正在后台运行

## 🌐 访问可视化

打开浏览器访问：**http://localhost:5173**

你将看到三个任务的可视化：

### T1: 交互式网络图
- **论文引用网络**：显示 NU CS 论文的引用关系（力导向布局，可拖拽节点）
- **作者合作网络**：显示作者之间的合作关系

**功能**：
- ✅ 可拖拽节点
- ✅ 悬停显示详细信息（标题、年份、专利计数等）
- ✅ 清晰的标题和图例
- ✅ 可扩展性处理（节点采样、限制数量）

### T2: 协调式仪表板
- **时间线图表**：显示过去 10 年 NU CS 论文数量（条形图）
- **专利引用直方图**：显示专利引用分布

**交互**：点击时间线上的任意年份，直方图会更新显示该年份的专利引用分布

### T3: 优化的网络图
- **分层边捆绑**：引用网络使用分层边捆绑技术，使链接更易读
- **改进的布局参数**：节点聚类更清晰

## 🔧 如果服务未启动

如果浏览器无法访问，请手动启动：

### 启动后端（终端 1）
```bash
cd "/Users/allenzhao/Github Repository/sciscinet-p1"
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python backend/app.py
```
后端运行在：http://localhost:5001

### 启动前端（终端 2）
```bash
cd "/Users/allenzhao/Github Repository/sciscinet-p1/frontend"
npm install
npm run dev
```
前端运行在：http://localhost:5173

## 📊 数据来源

SciSciNet: A large-scale open data lake for the science of science research
https://www.nature.com/articles/s41597-023-02198-9

