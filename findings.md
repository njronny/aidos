# OpenClaw 集成 - 研究发现

## 1. OpenClaw sessions_spawn API

### 可用工具
- `sessions_spawn` - 在隔离会话中生成后台子代理任务
- 参数:
  - `agentId`: 代理ID
  - `task`: 任务提示
  - `timeoutSeconds`: 超时
  - `label`: 会话标签

### 返回值
- `sessionKey`: 会话标识
- `runId`: 运行ID

## 2. OpenClaw Gateway HTTP API

**发现关键 API: `/tools/invoke`**

可在 AIDOS 中通过 HTTP 调用 OpenClaw 工具：

```bash
curl -X POST http://localhost:3456/tools/invoke \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "sessions_spawn",
    "args": {
      "task": "生成一个用户管理系统",
      "agentId": "main",
      "timeoutSeconds": 120
    }
  }'
```

## 3. 集成方案

### 方案 A: HTTP API 调用 (推荐)
```typescript
// AIDOS 调用 Gateway API
const result = await fetch('http://localhost:3456/tools/invoke', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tool: 'sessions_spawn',
    args: {
      task: `生成一个${entity}管理系统`,
      agentId: 'main',
      timeoutSeconds: 120
    }
  })
});
```

### 方案 B: AIDOS 运行在 OpenClaw 内部
- 直接调用 sessions_spawn 工具
- 更紧密的集成

## 4. 推荐集成路径

1. AIDOS 通过 HTTP API 调用 `/tools/invoke`
2. 传入 sessions_spawn + 任务描述
3. OpenClaw Agent 执行并写文件到 workspace
4. AIDOS 读取结果

## 5. 待验证
- [x] Gateway 端口: 18789
- [x] 认证方式: token
- [ ] 如何获取执行结果 (轮询/回调)

---
*Updated: 2026-02-15*
*Status: Phase 1 complete*
