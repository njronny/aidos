# AIDOS 系统扩展性设计改进分析报告

## 一、当前架构概览

### 现有组件
| 层级 | 技术栈 | 状态 |
|------|--------|------|
| API层 | Express.js | ✅ 基础完善 |
| 核心业务 | Agent/Workflow/Scheduler | ✅ 模块化 |
| 数据库 | Knex.js (SQLite/PostgreSQL) | ⚠️ 默认SQLite |
| 缓存 | L1(内存)+L2(Redis) | ✅ 已实现 |
| 消息队列 | BullMQ (Redis) | ⚠️ 基础功能 |
| 部署 | K8s (2副本) | ✅ 滚动更新 |

---

## 二、微服务架构拆分建议

### 当前问题
- 所有模块打包在单一应用中
- 扩缩容只能整体进行
- 单点故障风险

### 拆分方案

#### 1. 服务边界划分

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│                   (Kong / Nginx)                             │
└─────────────────────────────────────────────────────────────┘
           │           │           │           │
           ▼           ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Agent   │ │ Workflow │ │ Scheduler│ │  Task    │
    │ Service  │ │ Service  │ │ Service  │ │ Service  │
    └──────────┘ └──────────┘ └──────────┘ └──────────┘
           │           │           │           │
           ▼           ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Skill   │ │  Cache   │ │   DB     │ │   MQ     │
    │ Service  │ │ Service  │ │ Shard    │ │ Cluster  │
    └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

#### 2. 推荐拆分

| 服务 | 职责 | 扩展性 |
|------|------|--------|
| **API Gateway** | 路由、鉴权、限流 | 水平 |
| **Agent Service** | Agent生命周期管理、任务分配 | 水平(无状态) |
| **Workflow Service** | 工作流编排、执行 | 水平 |
| **Scheduler Service** | 定时任务调度 | 主从/集群 |
| **Task Executor** | 任务实际执行 | 水平(Worker模式) |
| **Skill Service** | 技能加载与管理 | 水平 |
| **Notification Service** | 消息通知 | 水平 |

#### 3. 实施步骤

```yaml
# k8s/service-mesh.yaml 示例
apiVersion: v1
kind: Service
metadata:
  name: aidos-agent-service
spec:
  selector:
    app: aidos
    component: agent
  ports:
    - port: 3001
      targetPort: 3000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aidos-agent
spec:
  replicas: 3  # 根据负载调整
```

---

## 三、消息队列优化建议

### 当前实现
- 使用BullMQ + Redis
- 支持重试、延迟任务
- 基本队列管理

### 改进空间

#### 1. 消息优先级

```typescript
// QueueService 扩展 - 支持优先级
enum JobPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
}

// 使用BullMQ的priority参数
await queue.add('task', data, {
  priority: JobPriority.HIGH,  // 数值越小优先级越高
});
```

#### 2. 分区/分片设计

```typescript
// 按业务类型创建独立队列
export const QUEUE_PARTITIONS = {
  AGENT_TASKS: 'aidos:agents',
  WORKFLOW: 'aidos:workflow',
  SCHEDULER: 'aidos:scheduler',
  NOTIFICATIONS: 'aidos:notifications',
} as const;
```

#### 3. 死信队列 (DLQ)

```typescript
// 配置死信队列
const deadLetterQueue = new Queue('aidos:dlq', {
  connection: redisConfig,
});

const mainQueue = new Queue('aidos:tasks', {
  connection: redisConfig,
  defaultJobOptions: {
    deadLetterExchange: 'aidos:dlq',
    deadLetterRoutingKey: 'dlq',
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});
```

#### 4. 消息持久化优化

```typescript
// 关键配置
const queueOptions = {
  connection: {
    // Redis Cluster 模式
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  },
  defaultJobOptions: {
    removeOnComplete: { count: 1000, age: 24 * 3600 },
    removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
    // 关键：确保消息不丢失
    persist: true,
  },
};
```

#### 5. 集群模式建议

```yaml
# Redis Cluster 配置
# 环境变量
REDIS_CLUSTER_NODES: "redis-1:6379,redis-2:6379,redis-3:6379"
REDIS_MODE: "cluster"
```

---

## 四、数据库扩展建议

### 当前问题
- 默认SQLite不适合高并发
- 无读写分离
- 无分库分表

### 扩展方案

#### 1. 读写分离

```typescript
// database/config.ts 扩展
export function getReadReplicas(): DatabaseConfig[] {
  return [
    {
      client: 'pg',
      connection: { /* 主库 */ },
      pool: { min: 2, max: 10 },
    },
    {
      client: 'pg', 
      connection: { /* 从库1 */ },
      pool: { min: 2, max: 10 },
    },
    {
      client: 'pg',
      connection: { /* 从库2 */ },
      pool: { min: 2, max: 10 },
    },
  ];
}

// 路由策略
class ReadWriteRouter {
  selectReplica(): Knex {
    const replicas = getReadReplicas();
    // 轮询或负载最低选择
    return replicas[Math.floor(Math.random() * replicas.length)];
  }
}
```

#### 2. 连接池优化

```typescript
// 优化连接池配置
const poolConfig = {
  min: parseInt(process.env.DB_POOL_MIN || '5'),      // 生产环境建议5+
  max: parseInt(process.env.DB_POOL_MAX || '50'),     // 根据并发调整
  acquireTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
};
```

#### 3. 分库分表策略

```typescript
// 按 tenant_id 或时间分片
function getShardingKey(tenantId: string): number {
  return parseInt(tenantId.slice(-4), 16) % 4;
}

function getShardConnection(tenantId: string): Knex {
  const shard = getShardingKey(tenantId);
  return knex({
    client: 'pg',
    connection: {
      host: `db-shard-${shard}.aidos-db.svc.cluster.local`,
      // ...
    },
  });
}
```

#### 4. 索引优化建议

```sql
-- 关键查询添加索引
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX idx_tasks_tenant_created ON tasks(tenant_id, created_at);
CREATE INDEX idx_agents_type_status ON agents(type, status);
CREATE INDEX idx_workflow_tenant_status ON workflows(tenant_id, status);
```

#### 5. PostgreSQL升级检查清单

```yaml
# docker-compose.prod.yml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_MAX_CONNECTIONS: 200
      POSTGRES_SHARED_BUFFERS: 256MB
      POSTGRES_EFFECTIVE_CACHE_SIZE: 1GB
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

---

## 五、缓存策略优化建议

### 当前实现
- L1: 内存缓存 (Map)
- L2: Redis
- 支持命名空间

### 改进空间

#### 1. 缓存预热

```typescript
// 启动时预热热点数据
class CacheWarmer {
  async warmUp(cache: CacheService): Promise<void> {
    // 预加载常用配置
    const configs = await db.select('*').from('configs');
    await cache.setMany(
      configs.reduce((acc, c) => ({...acc, [c.key]: c.value}), {}),
      3600,
      CacheNamespace.CONFIG
    );

    // 预加载活跃Agent状态
    const agents = await db.select('*').from('agents').where('status', 'active');
    await cache.setMany(
      agents.reduce((acc, a) => ({...acc, [a.id]: a}), {}),
      300,
      CacheNamespace.AGENT
    );
  }
}
```

#### 2. 缓存失效策略

```typescript
// Write-Through 策略
async function updateTaskWithCache(taskId: string, data: TaskUpdate): Promise<Task> {
  // 1. 更新数据库
  const task = await db('tasks').where({ id: taskId }).update(data).returning('*');
  
  // 2. 更新缓存
  await cache.set(`task:${taskId}`, task[0], 300);
  
  // 3. 清除相关列表缓存
  await cache.deleteMany([
    `tasks:project:${task[0].project_id}`,
    `tasks:status:${task[0].status}`,
  ], CacheNamespace.TASK);
  
  return task[0];
}
```

#### 3. 分布式缓存集群

```typescript
// Redis Cluster 配置
const redisCluster = new Redis.Cluster([
  { host: 'redis-1', port: 6379 },
  { host: 'redis-2', port: 6379 },
  { host: 'redis-3', port: 6379 },
  { host: 'redis-4', port: 6379 },
  { host: 'redis-5', port: 6379 },
  { host: 'redis-6', port: 6379 },
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
  },
});
```

#### 4. 热点数据识别

```typescript
// 自动热点发现
class HotKeyDetector {
  private accessCounts = new Map<string, number>();
  private readonly HOT_KEY_THRESHOLD = 1000; // 访问1000次/分钟

  track(key: string): void {
    const count = (this.accessCounts.get(key) || 0) + 1;
    this.accessCounts.set(key, count);

    if (count >= this.HOT_KEY_THRESHOLD) {
      // 提升为热点，延长TTL
      this.promoteToHotKey(key);
    }
  }

  private async promoteToHotKey(key: string): Promise<void> {
    const value = await this.cache.get(key);
    if (value) {
      // 热点数据设置更长缓存时间
      await this.cache.set(key, value, 3600); // 1小时
    }
  }
}
```

#### 5. 缓存分层架构

```
┌─────────────────────────────────────┐
│         Application Layer          │
└─────────────┬───────────────────────┘
              │
    ┌─────────▼─────────┐
    │   L1: Local Cache  │  ◄── 热点数据 (<1ms)
    │   (In-Memory)      │
    └─────────┬─────────┘
              │
    ┌─────────▼─────────┐
    │   L2: Redis       │  ◄── 共享缓存 (1-5ms)
    │   Cluster         │
    └─────────┬─────────┘
              │
    ┌─────────▼─────────┐
    │   L3: Database    │  ◄── 持久化 (>10ms)
    │   (PostgreSQL)    │
    └───────────────────┘
```

---

## 六、实施优先级建议

| 优先级 | 改进项 | 复杂度 | 收益 |
|--------|--------|--------|------|
| 🔴 P0 | 数据库迁移到PostgreSQL | 低 | 高 |
| 🔴 P0 | Redis Cluster部署 | 中 | 高 |
| 🟠 P1 | 消息队列DLQ实现 | 低 | 中 |
| 🟠 P1 | 缓存预热机制 | 中 | 高 |
| 🟡 P2 | 微服务拆分(首批) | 高 | 高 |
| 🟡 P2 | 数据库读写分离 | 中 | 高 |

---

## 七、关键配置示例

### 环境变量模板

```bash
# .env.production

# Database (PostgreSQL)
DB_CLIENT=pg
DB_HOST=postgres-master
DB_PORT=5432
DB_NAME=aidos
DB_USER=aidos
DB_PASSWORD=secure_password
DB_POOL_MIN=5
DB_POOL_MAX=50

# Redis Cluster
REDIS_MODE=cluster
REDIS_CLUSTER_NODES=redis-1:6379,redis-2:6379,redis-3:6379

# Queue
QUEUE_CONCURRENCY=10
QUEUE_MAX_ATTEMPTS=3

# Cache
CACHE_L1_ENABLED=true
CACHE_L1_MAX_SIZE=1000
CACHE_L1_TTL=5000
CACHE_DEFAULT_TTL=300
```

---

*报告生成时间: 2026-02-13*
