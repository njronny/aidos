# AIDOS 性能优化指南

## 1. 数据库优化

### 索引优化
```sql
-- 项目查询优化
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created ON projects(created_at DESC);

-- 任务查询优化  
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_requirement ON tasks(requirement_id);

-- 需求查询优化
CREATE INDEX idx_requirements_project ON requirements(project_id);
```

### 查询优化
- 使用 SQL 分页替代内存分页
- 添加复合索引覆盖常见查询
- 定期 `VACUUM` SQLite 数据库

### 连接池
```javascript
// knex 配置优化
pool: {
  min: 2,
  max: 10,
  afterCreate: (conn, done) => {
    conn.run('PRAGMA foreign_keys = ON', done);
  }
}
```

---

## 2. 缓存策略

### 热数据缓存
- 项目列表 (TTL: 30s)
- 用户会话 (TTL: 24h)
- 系统配置 (TTL: 1h)

### 缓存实现
```javascript
// 使用 Redis 缓存
const cache = new Map();

async function getCached(key, fn, ttl = 30000) {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.value;
  }
  
  const value = await fn();
  cache.set(key, { value, expiry: Date.now() + ttl });
  return value;
}
```

---

## 3. API 性能

### 分页优化
```javascript
// 默认分页限制
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

// 使用游标分页替代偏移分页
async function getProjects(cursor, limit) {
  return db('projects')
    .where('id', '>', cursor)
    .limit(limit)
    .orderBy('id');
}
```

### 响应压缩
```javascript
// 启用 gzip 压缩
await fastify.register(require('@fastify/compress'));
```

---

## 4. 前端优化

### 代码分割
```javascript
// 路由懒加载
const Dashboard = () => import('./Dashboard.js');
const Projects = () => import('./Projects.js');
```

### 资源优化
- 启用 HTTP/2
- 静态资源 CDN
- 图片压缩 (WebP)

---

## 5. 监控指标

### 关键指标
| 指标 | 目标值 |
|------|--------|
| API 响应时间 (p95) | < 200ms |
| API 响应时间 (p99) | < 500ms |
| 错误率 | < 0.1% |
| CPU 使用率 | < 70% |
| 内存使用率 | < 80% |

### 监控告警
- 响应时间 > 1s 持续 5min
- 错误率 > 1%
- 内存使用 > 90%

---

## 6. 扩展建议

### 水平扩展
- 使用 PM2 集群模式
- Nginx 负载均衡
- Redis 会话共享

### 数据库升级
- SQLite → PostgreSQL (高并发)
- 读写分离
- 分库分表
