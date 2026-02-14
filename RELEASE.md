# Aidos AI DevOps 系统发布说明

## 版本信息

- **版本**: v1.1.0
- **发布日期**: 2026-02-14
- **GitHub**: https://github.com/njronny/aidos

---

## 系统概述

Aidos 是一个 AI 驱动的 DevOps 自动化系统，能够自动执行软件开发任务，包括需求分析、代码生成、测试、部署等。

---

## v1.1.0 新增功能

### P0 自动化 CI/CD
- ✅ GitHub Actions 完整流水线
  - Lint 代码检查
  - 单元测试 (Jest)
  - E2E 测试 (Playwright)
  - Docker 镜像构建
  - 自动部署
  - Release 发布
- ✅ 定时 E2E 测试

### P1 代码质量把控
- ✅ CodeQualityService
  - ESLint 代码规范检查
  - TypeScript 类型检查
  - 安全扫描 (检测硬编码密码/API Key)
  - 未使用代码检测
- ✅ 质量分数计算 (0-100)

### P2 生产监控
- ✅ MonitoringService
  - CPU/内存/磁盘监控
  - Redis 连接检查
  - 告警系统 (阈值监控)
  - 自定义指标记录

### P3 需求自动分解
- ✅ RequirementsAnalyzer
  - 需求自动拆分为任务
  - 工作量估算
  - 复杂度评估
  - 优先级建议
  - 风险识别

### P4 反馈闭环
- ✅ FeedbackService
  - 用户反馈收集
  - 失败案例记录
  - 失败模式分析
  - Prompt 学习优化

### P5 模板系统
- ✅ TemplateService
  - 项目模板 (Express API, React, Next.js, Node CLI)
  - 任务模板 (CRUD, 组件, 数据库, Docker, 测试)
  - 自定义模板支持

### WebSocket 实时推送
- ✅ 任务状态变更推送
- ✅ 代理状态变更推送

---

## 核心能力
- ✅ **任务管理** - 项目 → 需求 → 任务层级管理
- ✅ **6 专业代理** - PM、架构师、开发、测试、数据库专家
- ✅ **自动执行** - 任务自动分配给空闲代理执行
- ✅ **自愈机制** - 任务超时自动恢复
- ✅ **代码生成** - AI 自动生成代码、测试
- ✅ **Git 自动化** - 代码自动提交推送
- ✅ **AutoFix** - 失败自动修复

---

## API 端点

### 认证
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/verify` - 验证 Token
- `POST /api/auth/logout` - 用户登出

### 资源管理
- `GET/POST /api/projects` - 项目 CRUD
- `GET/POST /api/requirements` - 需求 CRUD
- `GET/POST /api/tasks` - 任务 CRUD
- `GET /api/agents` - 代理列表

### 统计分析
- `GET /api/analytics/summary` - 综合统计
- `GET /api/analytics/tasks` - 任务趋势
- `GET /api/analytics/performance` - 性能指标

### 批量操作
- `POST /api/batch/tasks` - 批量创建任务
- `PUT /api/batch/tasks/status` - 批量更新状态
- `DELETE /api/batch/tasks` - 批量删除任务
- `POST /api/batch/projects` - 批量创建项目

### 数据导出
- `GET /api/export` - 通用导出
- `GET /api/export/tasks` - 导出任务 (JSON/CSV)
- `GET /api/export/projects` - 导出项目

### 代码质量
- `GET /api/quality/check` - 代码质量检查
- `GET /api/quality/summary` - 质量摘要

### 生产监控
- `GET /api/monitoring/health` - 健康检查
- `GET /api/monitoring/metrics` - 指标数据
- `GET /api/monitoring/alerts` - 告警列表
- `GET /api/monitoring/summary` - 监控摘要

### 需求分析
- `POST /api/requirements/analyze` - 分析需求生成任务
- `POST /api/requirements/estimate` - 估算工作量
- `POST /api/requirements/template` - 生成任务模板
- `GET /api/requirements/types` - 支持的类型

### 反馈管理
- `POST /api/feedback` - 提交反馈
- `GET /api/feedback/stats` - 反馈统计
- `POST /api/feedback/failure` - 记录失败
- `GET /api/feedback/failures` - 失败模式分析
- `POST /api/feedback/learn` - Prompt 学习

### 模板系统
- `GET /api/templates/projects` - 项目模板列表
- `GET /api/templates/tasks` - 任务模板列表
- `POST /api/templates/projects` - 根据模板创建项目
- `POST /api/templates/tasks` - 生成任务

### WebSocket
- `ws://host:80/ws` - 实时推送

---

## 快速开始

### 本地运行

```bash
# 1. 克隆项目
git clone https://github.com/njronny/aidos.git
cd aidos

# 2. 安装依赖
npm ci

# 3. 构建项目
npm run build

# 4. 启动服务
npm run api

# 5. 访问
# Web UI: http://localhost:80
# API: http://localhost:80/api
```

### Docker 运行

```bash
# 构建镜像
docker build -t aidos:latest .

# 运行容器
docker run -d -p 80:80 aidos:latest
```

### Docker Compose 运行

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ADMIN_USERNAME` | 管理员用户名 | admin |
| `ADMIN_PASSWORD` | 管理员密码 | aidos123 |
| `API_PORT` | API 端口 | 80 |
| `DATABASE_URL` | 数据库路径 | ./ |
| `REDdata/aidos.dbIS_HOST` | Redis 地址 | localhost |
| `REDIS_PORT` | Redis 端口 | 6379 |
| `LOG_LEVEL` | 日志级别 | info |

---

## 测试覆盖

| 模块 | 测试数 |
|------|--------|
| AutoFix | 23 |
| OpenClawExecutor | 18 |
| NodeRegistry | 9 |
| AgentPool | + |
| SkillLoader | 9 |
| Notifier | 15 |
| CodeQualityService | 10 |
| RequirementsAnalyzer | 10 |
| FeedbackService | 8 |
| TemplateService | 8 |

**总计: 100+ tests**

---

## 系统状态

```bash
curl http://localhost:80/api/status
```

返回示例：
```json
{
  "success": true,
  "data": {
    "agents": [...],
    "tasks": { "total": 100, "completed": 80, "failed": 0 },
    "successRate": 100
  }
}
```

---

## 默认账户

- **用户名**: admin
- **密码**: aidos123

---

## 技术栈

- **后端**: Node.js + Fastify + TypeScript
- **数据库**: SQLite
- **队列**: BullMQ + Redis
- **测试**: Jest + Playwright
- **部署**: Docker + Kubernetes

---

## 目录结构

```
aidos/
├── src/
│   ├── api/           # API 服务
│   │   └── routes/   # API 路由
│   ├── core/         # 核心业务逻辑
│   │   ├── agents/   # 代理池
│   │   ├── autofix/  # 自动修复
│   │   ├── executor/ # 执行器
│   │   ├── gitops/   # Git 自动化
│   │   ├── quality/  # 代码质量
│   │   ├── monitoring/ # 监控
│   │   ├── requirements/ # 需求分析
│   │   ├── feedback/ # 反馈
│   │   ├── templates/ # 模板
│   │   └── worker/   # 任务worker
├── .github/workflows/ # CI/CD 配置
├── k8s/              # K8s 部署配置
├── docker-compose.yml
└── Dockerfile
```

---

## 常见问题

### Q: 如何重启服务？
```bash
# Docker
docker-compose restart

# 直接运行
pkill -f "node.*api/server"
npm run api
```

### Q: 如何查看日志？
```bash
# Docker
docker-compose logs -f api

# 直接运行
tail -f /tmp/api.log
```

### Q: 如何备份数据？
```bash
# 备份数据库
cp data/aidos.db data/aidos.db.backup

# 备份整个数据目录
tar -czf aidos-data.tar.gz data/
```

### Q: 如何更新版本？
```bash
# 拉取最新代码
git pull origin master

# 重新构建
npm run build

# 重启服务
docker-compose up -d --build
```

---

## 更新日志

### v1.1.0 (2026-02-14)
- 自动化 CI/CD 流水线
- 代码质量服务 (ESLint + 安全扫描)
- 生产监控系统
- 需求自动分解
- 反馈闭环系统
- 模板系统
- WebSocket 实时推送
- 单元测试 100+

### v1.0.0 (2026-02-13)
- 初始版本发布
- 6 专业 AI 代理
- 任务自动执行
- Docker/K8s 部署支持
