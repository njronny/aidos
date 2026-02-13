# AI DevOps System (AIDOS)

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/TypeScript-5.3+-3178c6" alt="TypeScript">
</p>

> 全自动AI开发系统 - 输入需求 → 自动分析 → 任务拆分 → 多代理并行开发 → Git提交 → 自动测试 → 自动修复 → 可视化流程

## 项目简介

AIDOS (AI DevOps System) 是一个生产级全自动软件开发系统，旨在通过AI代理团队实现软件开发流程的完全自动化。系统支持从需求输入到代码提交的全流程自动化，大幅提升开发效率。

## 功能特性

### 🤖 智能代理团队
- **项目经理**: 整体协调、进度跟踪、里程碑通知
- **产品经理**: 需求分析、PRD输出、验收标准
- **架构师**: 系统设计、技术选型、架构图
- **全栈开发**: 代码实现、单元测试
- **QA工程师**: 测试用例、测试执行、质量评估
- **数据库专家**: 数据建模、SQL优化、迁移

### ⚡ 核心能力
- **需求分析**: 支持文本、文件、URL多种输入方式，AI自动生成结构化PRD
- **任务调度**: 大任务自动拆分DAG，支持多代理并行开发
- **Git自动化**: 自动commit、自动分支管理、必要时自动回滚
- **自动修复**: 错误智能分析、自动修复策略生成、修复后自动验证
- **上下文管理**: 智能上下文注入与清理，保持项目规范
- **技能系统**: 支持加载外部技能，版本管理，按项目选择技能集

### 📊 可视化
- 实时流程图展示
- 项目进度仪表盘
- 任务状态Timeline
- 代码质量趋势图

### 📢 消息通知
- 里程碑完成通知
- 错误告警通知
- 支持多渠道：QQ/Telegram/邮件

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### 安装

```bash
# 克隆项目
git clone https://github.com/your-org/aidos.git
cd aidos

# 安装依赖
npm install

# 构建项目
npm run build
```

### 启动服务

```bash
# 开发模式
npm run dev

# API服务
npm run api
```

### 运行测试

```bash
# 单元测试
npm test

# 覆盖率测试
npm run test:coverage

# 端到端测试
npm run test:e2e
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript 5.3+ |
| 运行时 | Node.js 18+ |
| 框架 | Fastify |
| 数据库 | SQLite / PostgreSQL |
| 构建工具 | ts-node, ts-jest |
| 测试 | Jest, Playwright |
| 代码规范 | ESLint, Prettier |

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI DevOps System                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  需求分析器   │  │  任务调度器   │  │  上下文管理  │         │
│  │  (Analyzer)  │  │  (Scheduler) │  │  (Context)   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Git管理器    │  │  错误修复    │  │  可视化引擎  │         │
│  │  (GitOps)    │  │  (AutoFix)   │  │  (Visualizer)│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  消息通知    │  │  技能加载器   │  │  代理池      │         │
│  │  (Notifier)  │  │  (SkillLoader)│  │  (AgentPool) │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## 文档链接

| 文档 | 说明 |
|------|------|
| [SPEC.md](./SPEC.md) | 项目详细规格说明 |
| [PRD.md](./docs/PRD.md) | 产品需求文档 |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 系统架构文档 |
| [DATABASE.md](./docs/DATABASE.md) | 数据库设计文档 |
| [TEST_PLAN.md](./docs/TEST_PLAN.md) | 测试计划 |

## 贡献指南

欢迎参与项目贡献！请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详细的贡献流程。

## 许可证

MIT License

---

<p align="center">Made with ❤️ by AIDOS Team</p>
