# AIDOS 系统架构设计

> 版本: 1.0  
> 日期: 2026-02-13  
> 架构师: AIDOS System

---

## 1. 系统架构图

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AIDOS - AI DevOps System                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                              接入层 (API Gateway)                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │   REST API  │  │  WebSocket  │  │   Web UI    │  │  CLI Tool   │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                         │
│                                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                              核心调度层 (Core)                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │   Analyzer   │  │  Scheduler   │  │   Context    │  │  Visualizer  │  │   │
│  │  │   需求分析器  │  │   任务调度器  │  │   上下文管理  │  │   可视化引擎  │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │    GitOps    │  │   AutoFix    │  │  Notifier    │  │ SkillLoader  │  │   │
│  │  │   Git管理器   │  │   错误修复    │  │    消息通知   │  │   技能加载器  │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                         │
│                                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                              代理层 (Agent Pool)                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │    PM        │  │     PO       │  │   Architect  │  │  FullStack    │  │   │
│  │  │   项目经理    │  │    产品经理   │  │    架构师     │  │   全栈开发    │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  │  ┌──────────────┐  ┌──────────────┐                                    │   │
│  │  │      QA      │  │      DBA      │                                    │   │
│  │  │   QA工程师    │  │  数据库专家    │                                    │   │
│  │  └──────────────┘  └──────────────┘                                    │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                         │
│                                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                              基础设施层 (Infrastructure)                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │  PostgreSQL  │  │    Redis     │  │    Docker    │  │    Git       │  │   │
│  │  │    数据库      │  │   缓存/队列   │  │   沙箱环境   │  │   版本控制    │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 数据流架构

```
需求输入
    │
    ▼
┌─────────────────┐
│   Analyzer      │ ──▶ PRD生成
│   (需求分析)     │     │
└─────────────────┘     │
                         ▼
                  ┌─────────────────┐
                  │   Architect     │ ──▶ 架构设计
                  │   (架构设计)     │     │
                  └─────────────────┘     │
                                            ▼
                                    ┌─────────────────┐
                                    │   Scheduler     │
                                    │   (任务拆分/DAG) │
                                    └─────────────────┘
                                            │
                        ┌───────────────────┼───────────────────┐
                        ▼                   ▼                   ▼
                 ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                 │  Task #1    │    │  Task #2    │    │  Task #3    │
                 │  FullStack  │    │     QA      │    │    DBA      │
                 └─────────────┘    └─────────────┘    └─────────────┘
                        │                   │                   │
                        └───────────────────┼───────────────────┘
                                            ▼
                                    ┌─────────────────┐
                                    │    GitOps       │
                                    │   (自动提交)     │
                                    └─────────────────┘
                                            │
                                            ▼
                                    ┌─────────────────┐
                                    │   Visualizer    │
                                    │   (流程可视化)   │
                                    └─────────────────┘
                                            │
                                            ▼
                                    ┌─────────────────┐
                                    │   Notifier      │
                                    │   (消息通知)     │
                                    └─────────────────┘
```

---

## 2. 技术选型

### 2.1 核心技术栈

| 层级 | 技术选型 | 理由 |
|------|----------|------|
| **运行时** | Node.js 20+ | 成熟的异步IO模型，丰富的生态系统 |
| **语言** | TypeScript 5.x | 强类型保证，优秀的IDE支持 |
| **API框架** | Fastify | 高性能、低开销、支持Schema验证 |
| **数据库** | PostgreSQL 15+ | 可靠的事务支持，JSON支持，生态成熟 |
| **缓存/消息队列** | Redis 7+ | 高性能缓存、发布订阅、任务队列 |
| **ORM** | Prisma | 类型安全的ORM，优秀的迁移工具 |
| **任务调度** | BullMQ | 基于Redis的分布式任务队列 |
| **WebSocket** | ws + Socket.io | 实时通信，双向通知 |
| **可视化** | Mermaid + D3.js | 流程图渲染，数据可视化 |
| **代码沙箱** | Docker | 安全的代码执行环境 |
| **Git操作** | isomorphic-git | 纯JS实现的Git，无外部依赖 |
| **AI接入** | OpenAI API / Anthropic | 主流LLM支持 |

### 2.2 开发与运维

| 类别 | 工具 |
|------|------|
| **包管理** | pnpm |
| **代码规范** | ESLint + Prettier |
| **测试** | Jest + Supertest (覆盖率 > 80%) |
| **文档** | TypeDoc + JSDoc |
| **容器化** | Docker + Docker Compose |
| **CI/CD** | GitHub Actions |

### 2.3 架构模式

- **微内核架构**: 核心模块（调度器、上下文）+ 插件系统（技能、代理）
- **事件驱动**: 模块间通过事件总线通信，松耦合
- **CQRS**: 命令与查询分离，优化读写性能

---

## 3. 模块划分

### 3.1 模块结构

```
src/
├── core/                    # 核心模块
│   ├── analyzer/            # 需求分析器
│   ├── scheduler/           # 任务调度器
│   ├── context/             # 上下文管理
│   ├── gitops/              # Git操作
│   ├── autofix/             # 自动修复
│   ├── visualizer/          # 可视化引擎
│   ├── notifier/            # 消息通知
│   └── skill-loader/        # 技能加载器
│
├── agents/                  # 代理模块
│   ├── base/                # 代理基类
│   ├── pm/                  # 项目经理代理
│   ├── po/                  # 产品经理代理
│   ├── architect/           # 架构师代理
│   ├── fullstack/           # 全栈开发代理
│   ├── qa/                  # QA工程师代理
│   └── dba/                 # 数据库专家代理
│
├── infrastructure/          # 基础设施层
│   ├── database/            # 数据库连接与ORM
│   ├── cache/               # Redis缓存
│   ├── queue/               # 任务队列
│   ├── sandbox/             # Docker沙箱
│   └── git/                 # Git操作封装
│
├── api/                     # API层
│   ├── routes/              # 路由定义
│   ├── controllers/         # 控制器
│   ├── middleware/          # 中间件
│   └── websocket/           # WebSocket处理
│
├── types/                   # TypeScript类型定义
├── utils/                   # 工具函数
└── config/                  # 配置文件
```

### 3.2 核心模块详细说明

#### 3.2.1 Analyzer (需求分析器)

```typescript
interface AnalyzerModule {
  // 解析需求输入，生成结构化PRD
  parse(input: RequirementInput): Promise<PRD>;
  
  // 评估技术可行性
  assessFeasibility(prd: PRD): Promise<FeasibilityReport>;
  
  // 识别风险
  identifyRisks(prd: PRD): Promise<Risk[]>;
}
```

#### 3.2.2 Scheduler (任务调度器)

```typescript
interface SchedulerModule {
  // 拆分任务为DAG
  decomposeTasks(prd: PRD): Promise<TaskDAG>;
  
  // 获取可执行任务
  getExecutableTasks(): Promise<Task[]>;
  
  // 调度任务执行
  scheduleTask(task: Task): Promise<void>;
  
  // 任务状态管理
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
  
  // 任务依赖解析
  resolveDependencies(taskId: string): Promise<Task[]>;
}
```

#### 3.2.3 Context (上下文管理)

```typescript
interface ContextModule {
  // 注入项目上下文到任务
  injectContext(projectId: string, task: Task): Promise<Context>;
  
  // 清理任务上下文
  cleanupContext(taskId: string): Promise<void>;
  
  // 压缩历史上下文
  compressHistory(projectId: string): Promise<void>;
  
  // 获取当前上下文
  getCurrentContext(projectId: string): Promise<Context>;
}
```

#### 3.2.4 GitOps (Git管理)

```typescript
interface GitOpsModule {
  // 初始化仓库
  initRepo(projectPath: string): Promise<void>;
  
  // 自动提交
  autoCommit(projectPath: string, task: Task): Promise<string>;
  
  // 创建分支
  createBranch(projectPath: string, branchName: string): Promise<void>;
  
  // 切换分支
  checkoutBranch(projectPath: string, branchName: string): Promise<void>;
  
  // 回滚
  rollback(projectPath: string, commitHash: string): Promise<void>;
  
  // 获取提交历史
  getHistory(projectPath: string, limit?: number): Promise<Commit[]>;
}
```

#### 3.2.5 AutoFix (自动修复)

```typescript
interface AutoFixModule {
  // 捕获错误
  captureError(error: Error, context: Context): Promise<ErrorRecord>;
  
  // 生成修复策略
  generateFixStrategy(error: ErrorRecord): Promise<FixStrategy>;
  
  // 执行修复
  executeFix(strategy: FixStrategy): Promise<FixResult>;
  
  // 验证修复
  verifyFix(result: FixResult): Promise<boolean>;
  
  // 回滚修复
  rollbackFix(fixId: string): Promise<void>;
}
```

#### 3.2.6 Visualizer (可视化引擎)

```typescript
interface VisualizerModule {
  // 生成流程图
  generateFlowchart(projectId: string): Promise<MermaidDiagram>;
  
  // 获取项目进度
  getProjectProgress(projectId: string): Promise<Progress>;
  
  // 生成Timeline
  generateTimeline(projectId: string): Promise<Timeline>;
  
  // 生成质量趋势图
  generateQualityTrend(projectId: string): Promise<QualityChart>;
  
  // WebSocket实时推送
  broadcastUpdate(projectId: string, update: ProjectUpdate): void;
}
```

#### 3.2.7 Notifier (消息通知)

```typescript
interface NotifierModule {
  // 发送里程碑通知
  notifyMilestone(milestone: Milestone): Promise<void>;
  
  // 发送错误告警
  notifyError(error: ErrorRecord): Promise<void>;
  
  // 发送进度摘要
  notifyProgressSummary(projectId: string): Promise<void>;
  
  // 注册通知渠道
  registerChannel(channel: NotificationChannel): void;
}
```

#### 3.2.8 SkillLoader (技能加载器)

```typescript
interface SkillLoaderModule {
  // 加载技能
  loadSkill(skillPath: string): Promise<Skill>;
  
  // 加载远程技能
  loadRemoteSkill(skillRepo: string): Promise<Skill>;
  
  // 获取可用技能列表
  listSkills(projectId: string): Promise<Skill[]>;
  
  // 卸载技能
  unloadSkill(skillId: string): Promise<void>;
  
  // 技能版本管理
  getSkillVersion(skillId: string): Promise<string>;
}
```

---

## 4. API 设计

### 4.1 REST API

#### 4.1.1 项目管理

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/v1/projects | 创建项目 |
| GET | /api/v1/projects | 获取项目列表 |
| GET | /api/v1/projects/:id | 获取项目详情 |
| DELETE | /api/v1/projects/:id | 删除项目 |
| PATCH | /api/v1/projects/:id | 更新项目 |

#### 4.1.2 需求管理

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/v1/projects/:id/requirements | 提交需求 |
| GET | /api/v1/projects/:id/requirements | 获取需求列表 |
| GET | /api/v1/requirements/:id | 获取需求详情 |
| POST | /api/v1/requirements/:id/analyze | 触发需求分析 |

#### 4.1.3 任务管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/projects/:id/tasks | 获取任务列表 |
| GET | /api/v1/tasks/:id | 获取任务详情 |
| POST | /api/v1/tasks/:id/start | 开始任务 |
| POST | /api/v1/tasks/:id/complete | 完成任务 |
| POST | /api/v1/tasks/:id/fail | 任务失败 |
| POST | /api/v1/tasks/:id/retry | 重试任务 |

#### 4.1.4 Git操作

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/v1/projects/:id/git/init | 初始化Git仓库 |
| GET | /api/v1/projects/:id/git/commits | 获取提交历史 |
| POST | /api/v1/projects/:id/git/rollback | 回滚到指定提交 |
| GET | /api/v1/projects/:id/git/diff | 获取Diff |

#### 4.1.5 可视化

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/projects/:id/flowchart | 获取流程图(Mermaid) |
| GET | /api/v1/projects/:id/progress | 获取项目进度 |
| GET | /api/v1/projects/:id/timeline | 获取时间线 |
| GET | /api/v1/projects/:id/quality | 获取质量数据 |

#### 4.1.6 技能管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/skills | 获取可用技能列表 |
| POST | /api/v1/projects/:id/skills | 为项目添加技能 |
| DELETE | /api/v1/projects/:id/skills/:skillId | 移除技能 |

#### 4.1.7 通知配置

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/v1/notifications/channels | 添加通知渠道 |
| GET | /api/v1/notifications/channels | 获取通知渠道列表 |
| DELETE | /api/v1/notifications/channels/:id | 删除通知渠道 |
| PATCH | /api/v1/notifications/channels/:id | 更新通知渠道 |

### 4.2 WebSocket API

#### 4.2.1 连接

```
WS /api/v1/ws?projectId={projectId}&token={token}
```

#### 4.2.2 事件列表

| 事件名 | 方向 | 描述 |
|--------|------|------|
| task:created | Server → Client | 新任务创建 |
| task:started | Server → Client | 任务开始 |
| task:completed | Server → Client | 任务完成 |
| task:failed | Server → Client | 任务失败 |
| project:progress | Server → Client | 项目进度更新 |
| project:milestone | Server → Client | 里程碑达成 |
| error:occurred | Server → Client | 错误发生 |
| commit:created | Server → Client | Git提交创建 |

### 4.3 数据模型

#### 4.3.1 Project

```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'analyzing' | 'planning' | 'developing' | 'testing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  repositoryUrl?: string;
  skills: string[];
}
```

#### 4.3.2 Requirement

```typescript
interface Requirement {
  id: string;
  projectId: string;
  content: string;
  type: 'text' | 'file' | 'url';
  status: 'pending' | 'analyzing' | 'analyzed' | 'rejected';
  prd?: PRD;
  feasibility?: FeasibilityReport;
  risks: Risk[];
  createdAt: Date;
}
```

#### 4.3.3 Task

```typescript
interface Task {
  id: string;
  projectId: string;
  requirementId: string;
  name: string;
  description: string;
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'waiting';
  priority: number;
  assignee?: AgentType;
  dependencies: string[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: ErrorRecord;
  commitHash?: string;
}
```

#### 4.3.4 Agent

```typescript
interface Agent {
  id: string;
  type: AgentType;
  name: string;
  status: 'idle' | 'busy' | 'error';
  currentTaskId?: string;
  capabilities: string[];
  projectId?: string;
}
```

#### 4.3.5 NotificationChannel

```typescript
interface NotificationChannel {
  id: string;
  type: 'qq' | 'telegram' | 'email' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
  events: string[];
}
```

### 4.4 API 响应格式

#### 4.4.1 成功响应

```json
{
  "success": true,
  "data": {
    "id": "proj_123",
    "name": "My Project"
  },
  "meta": {
    "timestamp": "2026-02-13T06:32:00Z",
    "requestId": "req_abc"
  }
}
```

#### 4.4.2 错误响应

```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task with id 'task_123' not found",
    "details": {}
  },
  "meta": {
    "timestamp": "2026-02-13T06:32:00Z",
    "requestId": "req_abc"
  }
}
```

#### 4.4.3 分页响应

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "hasMore": true
  },
  "meta": {
    "timestamp": "2026-02-13T06:32:00Z",
    "requestId": "req_abc"
  }
}
```

---

## 5. 部署架构

### 5.1 单机部署

```
┌─────────────────────────────────────────┐
│              AIDOS Server               │
│  ┌───────────────────────────────────┐ │
│  │         Docker Container          │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│ │
│  │  │API  │ │Core │ │Agent│ │ DB  ││ │
│  │  │Server│ │     │ │Pool │ │     ││ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘│ │
│  └───────────────────────────────────┘ │
│                   │                      │
│        ┌──────────┼──────────┐           │
│        ▼          ▼          ▼           │
│   ┌────────┐  ┌────────┐  ┌────────┐     │
│   │PostgreSQL│  │ Redis │  │  Git   │     │
│   └────────┘  └────────┘  └────────┘     │
└─────────────────────────────────────────┘
```

### 5.2 分布式部署 (生产推荐)

```
┌──────────────────────────────────────────────────────────────────┐
│                         Load Balancer                            │
│                            (Nginx)                               │
└──────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌───────────────┐        ┌───────────────┐        ┌───────────────┐
│  API Server 1 │        │  API Server 2 │        │  API Server 3 │
│   (Docker)    │        │   (Docker)    │        │   (Docker)    │
└───────────────┘        └───────────────┘        └───────────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
             ┌──────────┐  ┌──────────┐  ┌──────────┐
             │PostgreSQL│  │  Redis   │  │   Git    │
             │ (Primary)│  │ Cluster  │  │  Server  │
             └──────────┘  └──────────┘  └──────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
             ┌──────────┐        ┌──────────┐
             │Worker 1  │        │Worker 2  │
             │(Agent Pool)        │(Agent Pool)
             └──────────┘        └──────────┘
```

---

## 6. 安全考虑

### 6.1 认证与授权

- JWT Token 认证
- API Key 管理
- 角色权限控制 (RBAC)

### 6.2 代码沙箱

- Docker 隔离执行
- 资源限制 (CPU/内存)
- 网络隔离
- 超时控制

### 6.3 数据安全

- 敏感信息加密存储
- Git凭证安全管理
- 审计日志

---

## 7. 监控与日志

### 7.1 指标监控

- 任务成功率
- 平均执行时间
- 代理利用率
- API响应时间

### 7.2 日志管理

- 结构化日志 (JSON)
- 日志级别: ERROR, WARN, INFO, DEBUG
- 日志聚合: ELK / Loki

---

*文档版本: 1.0*  
*最后更新: 2026-02-13*
