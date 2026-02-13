# AIDOS 数据库设计方案

## 1. 数据库概述

### 1.1 设计目标
- 支持需求管理、任务拆分、多代理并行开发
- 记录完整的Git提交历史和代码变更
- 跟踪工作流程状态和代理执行日志
- 存储技能配置和消息通知记录

### 1.2 技术选型
- **开发/测试环境**: SQLite (轻量、零配置)
- **生产环境**: PostgreSQL (支持JSON、数组类型，适合复杂查询)

### 1.3 命名规范
- 表名: 蛇形命名 `snake_case` (如 `projects`, `task_dependencies`)
- 主键: `id` (UUID格式)
- 外键: `{表名}_id` (如 `project_id`)
- 时间戳: `created_at`, `updated_at` (ISO 8601格式)
- 索引: `idx_{表名}_{字段名}`

---

## 2. 数据模型设计

### 2.1 核心实体关系

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   projects  │────<│ requirements│────<│    tasks    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                     ┌─────────────────────────┼─────────────────────────┐
                     │                         │                         │
              ┌──────┴──────┐          ┌──────┴──────┐          ┌──────┴──────┐
              │task_deps    │          │   commits   │          │ agent_logs  │
              └─────────────┘          └─────────────┘          └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    skills   │     │   agents    │────<│notifications│
└─────────────┘     └─────────────┘     └─────────────┘
```

### 2.2 详细表结构

#### 2.2.1 projects - 项目表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 项目唯一标识 |
| name | VARCHAR(255) | NOT NULL | 项目名称 |
| description | TEXT | | 项目描述 |
| repository_url | VARCHAR(500) | | Git仓库地址 |
| default_branch | VARCHAR(100) | DEFAULT 'main' | 默认分支 |
| status | ENUM | NOT NULL | 状态: active/archived/completed |
| config | JSONB | | 项目配置 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 2.2.2 requirements - 需求表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 需求唯一标识 |
| project_id | UUID | FK NOT NULL | 所属项目 |
| title | VARCHAR(500) | NOT NULL | 需求标题 |
| content | TEXT | NOT NULL | 需求内容(原始输入) |
| parsed_content | JSONB | | AI解析后的结构化内容 |
| status | ENUM | NOT NULL | 状态: pending/analyzing/analyzed/rejected |
| priority | ENUM | DEFAULT 'medium' | 优先级: low/medium/high/critical |
| risk_level | ENUM | | 风险等级: low/medium/high |
| risk_notes | TEXT | | 风险说明 |
| ai_model | VARCHAR(100) | | 使用的AI模型 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 2.2.3 tasks - 任务表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 任务唯一标识 |
| project_id | UUID | FK NOT NULL | 所属项目 |
| requirement_id | UUID | FK | 关联需求 |
| title | VARCHAR(500) | NOT NULL | 任务标题 |
| description | TEXT | | 任务描述 |
| status | ENUM | NOT NULL | 状态: pending/running/waiting/completed/failed/skipped |
| priority | INTEGER | DEFAULT 0 | 优先级(越大越优先) |
| estimated_duration | INTEGER | | 预估耗时(分钟) |
| actual_duration | INTEGER | | 实际耗时(分钟) |
| agent_type | VARCHAR(50) | | 分配给哪种代理 |
| assignee | VARCHAR(100) | | 具体代理ID |
| result | JSONB | | 执行结果 |
| error_log | TEXT | | 错误日志 |
| metadata | JSONB | | 额外元数据 |
| started_at | TIMESTAMP | | 开始时间 |
| completed_at | TIMESTAMP | | 完成时间 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 2.2.4 task_dependencies - 任务依赖表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 依赖唯一标识 |
| task_id | UUID | FK NOT NULL | 任务ID |
| depends_on_id | UUID | FK NOT NULL | 依赖的任务ID |
| dependency_type | ENUM | DEFAULT 'finish_to_start' | 依赖类型 |

#### 2.2.5 agents - 代理表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 代理唯一标识 |
| name | VARCHAR(100) | NOT NULL | 代理名称 |
| role | VARCHAR(50) | NOT NULL | 角色: PM/PO/Architect/Dev/QA/DBA |
| status | ENUM | NOT NULL | 状态: idle/busy/offline |
| capabilities | JSONB | | 能力列表 |
| config | JSONB | | 代理配置 |
| current_task_id | UUID | FK | 当前执行的任务 |
| total_tasks | INTEGER | DEFAULT 0 | 总完成任务数 |
| success_rate | DECIMAL(5,2) | | 成功率(%) |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 2.2.6 agent_logs - 代理执行日志表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 日志唯一标识 |
| agent_id | UUID | FK NOT NULL | 代理ID |
| task_id | UUID | FK | 关联任务 |
| log_level | ENUM | NOT NULL | 日志级别: debug/info/warn/error |
| message | TEXT | NOT NULL | 日志消息 |
| metadata | JSONB | | 额外数据 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |

#### 2.2.7 skills - 技能表

| 字段 | 类型 | 约束 |说明 |
|------|------|------|------|
| id | UUID | PK | 技能唯一标识 |
| name | VARCHAR(100) | NOT NULL | 技能名称 |
| version | VARCHAR(50) | NOT NULL | 版本号 |
| description | TEXT | | 技能描述 |
| source | VARCHAR(500) | | 来源(GitHub URL或本地路径) |
| content | TEXT | | 技能内容/配置 |
| config_schema | JSONB | | 配置Schema |
| is_builtin | BOOLEAN | DEFAULT FALSE | 是否内置技能 |
| project_id | UUID | FK | 关联项目(为空则为全局) |
| enabled | BOOLEAN | DEFAULT TRUE | 是否启用 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 2.2.8 commits - Git提交表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 提交唯一标识 |
| project_id | UUID | FK NOT NULL | 所属项目 |
| task_id | UUID | FK | 关联任务 |
| commit_hash | VARCHAR(40) | NOT NULL | Git提交哈希 |
| parent_hashes | VARCHAR[] | | 父提交哈希 |
| branch | VARCHAR(100) | NOT NULL | 分支名 |
| message | TEXT | NOT NULL | 提交信息 |
| author | VARCHAR(100) | NOT NULL | 提交者 |
| author_email | VARCHAR(255) | | 提交者邮箱 |
| files_changed | JSONB | | 变更文件列表 |
| insertions | INTEGER | DEFAULT 0 | 新增行数 |
| deletions | INTEGER | DEFAULT 0 | 删除行数 |
| is_rollback | BOOLEAN | DEFAULT FALSE | 是否回滚提交 |
| rolled_back_by_id | UUID | FK | 被哪个提交回滚 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |

#### 2.2.9 notifications - 通知记录表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 通知唯一标识 |
| project_id | UUID | FK | 所属项目 |
| task_id | UUID | FK | 关联任务 |
| type | VARCHAR(50) | NOT NULL | 类型: milestone/completion/error/progress |
| channel | VARCHAR(50) | NOT NULL | 渠道: qq/telegram/email/webhook |
| recipient | VARCHAR(255) | NOT NULL | 接收者 |
| title | VARCHAR(500) | | 标题 |
| content | TEXT | NOT NULL | 内容 |
| status | ENUM | NOT NULL | 状态: pending/sent/failed |
| response | JSONB | | 发送响应 |
| sent_at | TIMESTAMP | | 发送时间 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |

#### 2.2.10 users - 用户表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 用户唯一标识 |
| username | VARCHAR(100) | NOT NULL UNIQUE | 用户名 |
| email | VARCHAR(255) | UNIQUE | 邮箱 |
| display_name | VARCHAR(255) | | 显示名称 |
| role | ENUM | NOT NULL | 角色: admin/developer/viewer |
| notification_preferences | JSONB | | 通知偏好 |
| config | JSONB | | 用户配置 |
| last_login_at | TIMESTAMP | | 最后登录时间 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 2.2.11 workflows - 工作流表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 工作流唯一标识 |
| project_id | UUID | FK NOT NULL | 所属项目 |
| name | VARCHAR(200) | NOT NULL | 工作流名称 |
| status | ENUM | NOT NULL | 状态: pending/running/paused/completed/failed |
| progress | DECIMAL(5,2) | DEFAULT 0 | 完成进度(%) |
| config | JSONB | | 工作流配置 |
| result | JSONB | | 执行结果 |
| started_at | TIMESTAMP | | 开始时间 |
| completed_at | TIMESTAMP | | 完成时间 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 2.2.12 workflow_steps - 工作流步骤表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 步骤唯一标识 |
| workflow_id | UUID | FK NOT NULL | 所属工作流 |
| step_order | INTEGER | NOT NULL | 步骤顺序 |
| name | VARCHAR(200) | NOT NULL | 步骤名称 |
| type | VARCHAR(50) | NOT NULL | 类型: analyze/design/coding/testing/deploy |
| status | ENUM | NOT NULL | 状态 |
| result | JSONB | | 步骤结果 |
| started_at | TIMESTAMP | | 开始时间 |
| completed_at | TIMESTAMP | | 完成时间 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

---

## 3. SQL 建表脚本

### 3.1 PostgreSQL 版本

```sql
-- =====================================================
-- AIDOS Database Schema (PostgreSQL)
-- =====================================================

-- 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    display_name VARCHAR(255),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'developer', 'viewer')),
    notification_preferences JSONB DEFAULT '{}',
    config JSONB DEFAULT '{}',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 项目表
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    repository_url VARCHAR(500),
    default_branch VARCHAR(100) DEFAULT 'main',
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'archived', 'completed')),
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 需求表
CREATE TABLE requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    parsed_content JSONB,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'analyzing', 'analyzed', 'rejected')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    risk_level VARCHAR(20),
    risk_notes TEXT,
    ai_model VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 任务表
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'waiting', 'completed', 'failed', 'skipped')),
    priority INTEGER DEFAULT 0,
    estimated_duration INTEGER,
    actual_duration INTEGER,
    agent_type VARCHAR(50),
    assignee VARCHAR(100),
    result JSONB,
    error_log TEXT,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 任务依赖表
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) DEFAULT 'finish_to_start',
    CONSTRAINT unique_task_dependency UNIQUE (task_id, depends_on_id)
);

-- 代理表
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('PM', 'PO', 'Architect', 'Dev', 'QA', 'DBA')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('idle', 'busy', 'offline')),
    capabilities JSONB DEFAULT '[]',
    config JSONB DEFAULT '{}',
    current_task_id UUID REFERENCES tasks(id),
    total_tasks INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 代理日志表
CREATE TABLE agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    log_level VARCHAR(10) NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 技能表
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    source VARCHAR(500),
    content TEXT,
    config_schema JSONB,
    is_builtin BOOLEAN DEFAULT FALSE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Git提交表
CREATE TABLE commits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    commit_hash VARCHAR(40) NOT NULL,
    parent_hashes TEXT[],
    branch VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    author VARCHAR(100) NOT NULL,
    author_email VARCHAR(255),
    files_changed JSONB DEFAULT '[]',
    insertions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    is_rollback BOOLEAN DEFAULT FALSE,
    rolled_back_by_id UUID REFERENCES commits(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 通知记录表
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
    response JSONB,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 工作流表
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
    progress DECIMAL(5,2) DEFAULT 0,
    config JSONB DEFAULT '{}',
    result JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 工作流步骤表
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    result JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### 3.2 SQLite 版本

```sql
-- =====================================================
-- AIDOS Database Schema (SQLite)
-- =====================================================

-- 用户表
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    display_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'developer', 'viewer')),
    notification_preferences TEXT DEFAULT '{}',
    config TEXT DEFAULT '{}',
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 项目表
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    repository_url TEXT,
    default_branch TEXT DEFAULT 'main',
    status TEXT NOT NULL CHECK (status IN ('active', 'archived', 'completed')),
    config TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 需求表
CREATE TABLE requirements (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    parsed_content TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'analyzing', 'analyzed', 'rejected')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    risk_level TEXT,
    risk_notes TEXT,
    ai_model TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 任务表
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    requirement_id TEXT REFERENCES requirements(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'waiting', 'completed', 'failed', 'skipped')),
    priority INTEGER DEFAULT 0,
    estimated_duration INTEGER,
    actual_duration INTEGER,
    agent_type TEXT,
    assignee TEXT,
    result TEXT,
    error_log TEXT,
    metadata TEXT DEFAULT '{}',
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 任务依赖表
CREATE TABLE task_dependencies (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type TEXT DEFAULT 'finish_to_start',
    UNIQUE(task_id, depends_on_id)
);

-- 代理表
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('PM', 'PO', 'Architect', 'Dev', 'QA', 'DBA')),
    status TEXT NOT NULL CHECK (status IN ('idle', 'busy', 'offline')),
    capabilities TEXT DEFAULT '[]',
    config TEXT DEFAULT '{}',
    current_task_id TEXT REFERENCES tasks(id),
    total_tasks INTEGER DEFAULT 0,
    success_rate REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 代理日志表
CREATE TABLE agent_logs (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    log_level TEXT NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
    message TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 技能表
CREATE TABLE skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    source TEXT,
    content TEXT,
    config_schema TEXT,
    is_builtin INTEGER DEFAULT 0,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    enabled INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Git提交表
CREATE TABLE commits (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    commit_hash TEXT NOT NULL,
    parent_hashes TEXT,
    branch TEXT NOT NULL,
    message TEXT NOT NULL,
    author TEXT NOT NULL,
    author_email TEXT,
    files_changed TEXT DEFAULT '[]',
    insertions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    is_rollback INTEGER DEFAULT 0,
    rolled_back_by_id TEXT REFERENCES commits(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 通知记录表
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    channel TEXT NOT NULL,
    recipient TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
    response TEXT,
    sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 工作流表
CREATE TABLE workflows (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
    progress REAL DEFAULT 0,
    config TEXT DEFAULT '{}',
    result TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 工作流步骤表
CREATE TABLE workflow_steps (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    result TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 4. 索引策略

### 4.1 主键索引
所有表的主键 `id` 字段默认创建唯一索引。

### 4.2 外键索引

```sql
-- 项目相关
CREATE INDEX idx_requirements_project ON requirements(project_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_requirement ON tasks(requirement_id);
CREATE INDEX idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON task_dependencies(depends_on_id);
CREATE INDEX idx_commits_project ON commits(project_id);
CREATE INDEX idx_commits_task ON commits(task_id);
CREATE INDEX idx_notifications_project ON notifications(project_id);
CREATE INDEX idx_notifications_task ON notifications(task_id);
CREATE INDEX idx_workflows_project ON workflows(project_id);
CREATE INDEX idx_workflow_steps_workflow ON workflow_steps(workflow_id);

-- 代理相关
CREATE INDEX idx_agent_logs_agent ON agent_logs(agent_id);
CREATE INDEX idx_agent_logs_task ON agent_logs(task_id);
CREATE INDEX idx_agents_current_task ON agents(current_task_id);
```

### 4.3 业务查询索引

```sql
-- 任务状态查询 (核心高频查询)
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority DESC);
CREATE INDEX idx_tasks_assignee_status ON tasks(assignee, status);

-- 需求状态查询
CREATE INDEX idx_requirements_status ON requirements(status);
CREATE INDEX idx_requirements_priority ON requirements(priority DESC);

-- Git提交查询
CREATE INDEX idx_commits_branch ON commits(branch);
CREATE INDEX idx_commits_author ON commits(author);
CREATE INDEX idx_commits_hash ON commits(commit_hash);
CREATE INDEX idx_commits_created ON commits(created_at DESC);

-- 日志查询 (按时间和级别)
CREATE INDEX idx_agent_logs_level ON agent_logs(log_level);
CREATE INDEX idx_agent_logs_created ON agent_logs(created_at DESC);
CREATE INDEX idx_agent_logs_agent_created ON agent_logs(agent_id, created_at DESC);

-- 通知查询
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- 工作流查询
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflow_steps_status ON workflow_steps(status);
CREATE INDEX idx_workflow_steps_workflow_order ON workflow_steps(workflow_id, step_order);
```

### 4.4 全文搜索索引 (PostgreSQL)

```sql
-- 需求内容全文搜索
CREATE INDEX idx_requirements_content_fts ON requirements 
USING GIN (to_jsonb(content) jsonb_path_ops);

-- 任务描述全文搜索
CREATE INDEX idx_tasks_description_fts ON tasks 
USING GIN (to_jsonb(description) jsonb_path_ops);

-- 代理日志全文搜索
CREATE INDEX idx_agent_logs_message_fts ON agent_logs 
USING GIN (to_jsonb(message) jsonb_path_ops);

-- Git提交信息搜索
CREATE INDEX idx_commits_message_fts ON commits 
USING GIN (to_jsonb(message) jsonb_path_ops);
```

### 4.5 组合索引优化

| 查询场景 | 索引字段 | 说明 |
|----------|----------|------|
| 获取待执行任务 | status + priority | 按状态过滤后按优先级排序 |
| 项目任务进度 | project_id + status | 统计项目各状态任务数 |
| 代理日志追踪 | agent_id + created_at | 按时间顺序查看代理历史 |
| 提交历史查询 | project_id + branch + created_at | 分支提交历史 |

---

## 5. 视图设计

### 5.1 项目进度视图

```sql
CREATE VIEW project_progress AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as failed_tasks,
    COUNT(CASE WHEN t.status = 'running' THEN 1 END) as running_tasks,
    ROUND(COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::numeric / NULLIF(COUNT(t.id), 0) * 100, 2) as progress_percent
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
GROUP BY p.id, p.name;
```

### 5.2 任务依赖链视图

```sql
CREATE VIEW task_dependency_chain AS
WITH RECURSIVE dep_chain AS (
    SELECT 
        t.id as task_id,
        t.title as task_title,
        t.status as task_status,
        td.depends_on_id as ancestor_id,
        1 as depth
    FROM tasks t
    INNER JOIN task_dependencies td ON td.task_id = t.id
    UNION ALL
    SELECT 
        dc.task_id,
        dc.task_title,
        dc.task_status,
        td.depends_on_id,
        dc.depth + 1
    FROM dep_chain dc
    INNER JOIN task_dependencies td ON td.task_id = dc.ancestor_id
)
SELECT * FROM dep_chain;
```

### 5.3 代理性能视图

```sql
CREATE VIEW agent_performance AS
SELECT 
    a.id as agent_id,
    a.name as agent_name,
    a.role as agent_role,
    a.total_tasks as total_completed,
    a.success_rate as success_rate,
    COALESCE(AVG(t.actual_duration), 0) as avg_task_duration,
    COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as failed_count
FROM agents a
LEFT JOIN tasks t ON t.assignee = a.id
GROUP BY a.id, a.name, a.role, a.total_tasks, a.success_rate;
```

---

## 6. 数据库配置建议

### 6.1 PostgreSQL 配置

```ini
# postgresql.conf 关键参数
shared_buffers = 256MB          # 25% 内存
effective_cache_size = 1GB      # 75% 内存
maintenance_work_mem = 64MB
work_mem = 16MB
random_page_cost = 1.1          # SSD 设置
effective_io_concurrency = 200
max_worker_processes = 8
max_parallel_workers_per_gather = 4

# JSONB 优化
jsonb.optimize_bools = on
jsonb.to_ast = on
```

### 6.2 备份策略

| 备份类型 | 频率 | 保留时间 |
|----------|------|----------|
| 全量备份 | 每天 02:00 | 30天 |
| 增量备份 | 每小时 | 7天 |
| WAL归档 | 实时 | 7天 |

### 6.3 性能监控 SQL

```sql
-- 慢查询统计
SELECT 
    query,
    calls,
    mean_exec_time,
    total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 表大小统计
SELECT 
    relname as table_name,
    pg_size_pretty(pg_total_relation_size(relid)) as size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- 索引使用统计
SELECT 
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY idx_scan;
```

---

## 7. 数据迁移说明

### 7.1 版本管理
使用专用 `schema_versions` 表跟踪迁移:

```sql
CREATE TABLE schema_versions (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
    description TEXT
);
```

### 7.2 典型迁移场景
- 添加新字段: `ALTER TABLE xxx ADD COLUMN yyy;`
- 创建索引: `CREATE INDEX ...;`
- 数据清洗: `UPDATE xxx SET yyy = ... WHERE ...;`

---

## 8. ER 图 (文本版)

```
┌──────────────────┐       ┌──────────────────┐
│      users       │       │     projects     │
├──────────────────┤       ├──────────────────┤
│ * id (PK)        │       │ * id (PK)        │
│   username       │       │   name           │
│   email          │       │   description    │
│   role           │       │   repository_url │
└──────────────────┘       │   status         │
       │                   └────────┬─────────┘
       │                            │
       │         ┌─────────────────┼─────────────────┐
       │         │                 │                 │
       ▼         ▼                 ▼                 ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  requirements    │  │     skills       │  │    workflows     │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ * id (PK)        │  │ * id (PK)        │  │ * id (PK)        │
│   project_id(FK) │  │   name           │  │   project_id(FK) │
│   title          │  │   version        │  │   name           │
│   content        │  │   source         │  │   status         │
│   status         │  │   is_builtin     │  │   progress       │
│   priority       │  │   project_id(FK) │  └────────┬─────────┘
└────────┬─────────┘  └──────────────────┘           │
         │                                             │
         │  ┌──────────────────────────────────────────┼──────────────────────┐
         │  │                                          │                      │
         ▼  ▼                                          ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│      tasks       │  │     commits      │  │   notifications │  │ workflow_steps  │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ * id (PK)        │  │ * id (PK)        │  │ * id (PK)        │  │ * id (PK)        │
│   project_id(FK) │  │   project_id(FK) │  │   project_id(FK) │  │   workflow_id(FK)│
│   req_id (FK)    │  │   task_id(FK)    │  │   task_id(FK)    │  │   step_order    │
│   title          │  │   commit_hash    │  │   type           │  │   name          │
│   status         │  │   branch         │  │   channel        │  │   status        │
│   agent_type     │  │   message        │  │   recipient      │  │   result        │
│   assignee       │  │   author         │  │   status         │  └──────────────────┘
│   result         │  │   files_changed  │  │   sent_at        │
│   error_log      │  │   is_rollback    │  └──────────────────┘
└────────┬─────────┘  └────────┬─────────┘
         │                    │
         │         ┌───────────┴───────────┐
         │         │