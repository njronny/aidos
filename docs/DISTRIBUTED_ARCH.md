# Aidos 分布式 Agent 执行架构

## 目标
- 基于 OpenClaw 实现真正的任务执行
- 支持未来多服务器 OpenClaw 集群扩展
- 高可用、负载均衡

## 架构设计

```
                    ┌─────────────────┐
                    │   Aidos API     │  (调度中心)
                    │   (本服务器)     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼─────────┐    │    ┌─────────▼─────────┐
    │  OpenClaw Node 1 │    │    │  OpenClaw Node 2 │
    │  (当前服务器)     │    │    │  (未来扩展)       │
    │  - coding-agent  │    │    │  - coding-agent  │
    │  - browser       │    │    │  - browser       │
    └─────────────────┘    │    └─────────────────┘
                          │
              ┌────────────┼────────────┐
              │                          │
    ┌─────────▼─────────┐    ┌─────────▼─────────┐
    │  OpenClaw Node 3  │    │  OpenClaw Node N  │
    │  (未来扩展)       │    │  (未来扩展)       │
    └───────────────────┘    └───────────────────┘
```

## 核心组件

### 1. NodeRegistry - 节点注册中心
- 管理所有 OpenClaw 节点
- 节点心跳检测
- 能力描述（有哪些 agent）

### 2. TaskDistributor - 任务分发器
- 根据负载分配任务
- 支持亲和性（特定任务分配到特定节点）
- 故障转移

### 3. OpenClawExecutor - 执行器
- 调用本地 OpenClaw 执行任务
- 任务状态跟踪
- 结果回收

## API 设计

```typescript
// 注册节点
POST /api/nodes
{
  "name": "openclaw-node-1",
  "host": "10.0.0.1",
  "port": 3000,
  "capabilities": ["coding", "browser", "exec"]
}

// 分发任务
POST /api/tasks/execute
{
  "taskId": "xxx",
  "agentType": "developer",
  "prompt": "实现用户登录功能",
  "context": { ... }
}
```

---

*设计完成，开始实现*
