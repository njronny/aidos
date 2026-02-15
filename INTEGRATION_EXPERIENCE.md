# AIDOS 项目开发经验总结

**日期**: 2026-02-15
**项目**: AIDOS + OpenClaw 集成

---

## 一、核心经验

### 1. 使用 planning-with-files 技能

复杂任务必须用规划文件：
- `task_plan.md` - 阶段规划
- `findings.md` - 研究发现
- `progress.md` - 进度日志

### 2. OpenClaw Gateway 集成关键点

| 经验 | 说明 |
|------|------|
| **API 端点** | `POST /tools/invoke` |
| **认证** | Bearer token |
| **响应格式** | `result.content[0].text` 是 JSON 字符串 |
| **agentId** | sessions_spawn 不允许传 agentId |
| **端口** | 默认 18789 |

### 3. 调试技巧

1. 先用 curl 测试 Gateway API
2. 打印原始响应避免猜测
3. 用 sessions_list 追踪子代理

---

## 二、技术架构

### 旧架构 (child_process)
```
AIDOS -> 生成代码 -> child_process -> 写文件
```

### 新架构 (Gateway API)
```
AIDOS -> Gateway /tools/invoke -> sessions_spawn -> 
OpenClaw Agent -> write 工具 -> 文件
```

---

## 三、代码示例

### GatewayClient.ts 核心代码
```typescript
async spawnSubAgent(options: SpawnOptions): Promise<SpawnResult> {
  const response = await this.invoke('sessions_spawn', {
    task: options.task,
    timeoutSeconds: options.timeoutSeconds || 120,
    label: options.label,
  });
  
  // 解析响应
  const contentObj = response.result?.content?.[0];
  const content = typeof contentObj === 'string' ? contentObj : contentObj?.text;
  const parsed = JSON.parse(content);
  
  return {
    status: parsed.status,
    runId: parsed.runId,
    sessionKey: parsed.childSessionKey,
  };
}
```

### 环境变量
```bash
OPENCLAW_GATEWAY=true
OPENCLAW_GATEWAY_TOKEN=<token>
```

---

## 四、后续待办

### P0 - 核心功能
- [ ] 等待 Agent 完成并获取结果（非阻塞问题）
- [ ] 任务结果同步到前端

### P1 - 质量保障
- [ ] 测试执行 + 覆盖率报告
- [ ] 代码审查集成

### P2 - 自动化
- [ ] 自动部署 (Docker/K8s)
- [ ] CI/CD 流水线

---

## 五、文件位置

| 文件 | 路径 |
|------|------|
| 任务规划 | `/root/.openclaw/workspace/aidos/task_plan.md` |
| 研究发现 | `/root/.openclaw/workspace/aidos/findings.md` |
| 进度日志 | `/root/.openclaw/workspace/aidos/progress.md` |
| 生成的代码 | `/root/.openclaw/workspace/aidos/generated/` |

---

## 六、关键教训

1. **不要假设** - 先测试 API 响应格式
2. **逐步验证** - curl -> 代码 -> 集成
3. **记录决策** - 方便后续维护
4. **容错处理** - sessions_spawn 是非阻塞的

---
*Last updated: 2026-02-15*
