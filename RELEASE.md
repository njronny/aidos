# Aidos AI DevOps 系统发布说明

## 版本信息

- **版本**: v1.0.0
- **发布日期**: 2026-02-14
- **GitHub**: https://github.com/njronny/aidos

---

## 系统概述

Aidos 是一个 AI 驱动的 DevOps 自动化系统，能够自动执行软件开发任务，包括需求分析、代码生成、测试、部署等。

---

## 主要功能

### 核心能力
- ✅ **任务管理** - 项目 → 需求 → 任务层级管理
- ✅ **6 专业代理** - PM、架构师、开发、测试、数据库专家
- ✅ **自动执行** - 任务自动分配给空闲代理执行
- ✅ **自愈机制** - 任务超时自动恢复
- ✅ **代码生成** - AI 自动生成代码、测试

### API 功能
- ✅ RESTful API (端口 80)
- ✅ 统计分析 `/api/analytics/*`
- ✅ 数据导出 `/api/export/*`
- ✅ 批量操作 `/api/batch/*`
- ✅ WebSocket 实时推送

### DevOps
- ✅ Docker/K8s 部署配置
- ✅ GitHub Actions CI/CD 流水线
- ✅ E2E 测试自动化

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
| `DATABASE_URL` | 数据库路径 | ./data/aidos.db |
| `REDIS_HOST` | Redis 地址 | localhost |
| `REDIS_PORT` | Redis 端口 | 6379 |
| `LOG_LEVEL` | 日志级别 | info |

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

### 数据导出
- `GET /api/export/tasks` - 导出任务 (JSON/CSV)
- `GET /api/export/projects` - 导出项目

### WebSocket
- `ws://host:80/ws` - 实时推送

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
│   ├── api/          # API 服务
│   ├── core/         # 核心业务逻辑
│   │   ├── agents/   # 代理池
│   │   ├── autofix/  # 自动修复
│   │   ├── executor/ # 执行器
│   │   ├── gitops/   # Git 自动化
│   │   └── worker/   # 任务worker
│   └── ui/           # Web UI
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

### v1.0.0 (2026-02-14)
- 初始版本发布
- 6 专业 AI 代理
- 任务自动执行
- CI/CD 流水线
- Docker/K8s 部署支持
