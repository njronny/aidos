# OpenClaw 集成任务规划

## 目标
AIDOS 真正集成 OpenClaw，实现：
- AIDOS 调用 OpenClaw sessions_spawn 执行任务
- 用 OpenClaw Agent 生成代码
- 代码直接写入 OpenClaw workspace

## 当前状态
- ✅ GatewayClient 实现
- ✅ AIDOS 可调用 sessions_spawn
- ⚠️ 代码未写入文件

---
## 新阶段: 代码落地

### Phase 5: 完善代码落地 (complete)
- [x] 5.1 修改 prompt 让 Agent 写文件
- [x] 5.2 验证代码生成到 /root/.openclaw/workspace/aidos/generated/
- [x] 5.3 端到端测试 - 成功生成用户管理API

## 成果
- ✅ GatewayClient 支持 HTTP API 调用
- ✅ AIDOS 可调用 OpenClaw sessions_spawn
- ✅ OpenClaw Agent 真正生成代码并写入文件
- ✅ 生成的代码包含完整 CRUD 功能

## 阶段规划

### Phase 1: 调研 (complete)
- [x] 1.1 了解 OpenClaw sessions_spawn API
- [x] 1.2 了解 OpenClaw Gateway HTTP API
- [x] 1.3 确定集成方案 (HTTP API 调用 /tools/invoke)

### Phase 2: 设计 (complete)
- [x] 2.1 设计 AIDOS -> Gateway 调用流程
- [x] 2.2 设计代码读取/写入路径
- [x] 2.3 配置认证 (port: 18789, token)

### Phase 3: 实现 (complete)
- [x] 3.1 修改 OpenClawRealExecutor 调用 Gateway API
- [x] 3.2 配置 workspace 路径
- [x] 3.3 测试端到端流程

### Phase 4: 验证 (complete)
- [x] 4.1 配置环境变量 OPENCLAW_GATEWAY=true
- [x] 4.2 创建项目测试 - Gateway调用成功
- [x] 4.3 验证代码生成 - sessions_spawn 已集成

## 成果
- ✅ 创建 GatewayClient 支持 HTTP API 调用
- ✅ AIDOS 可通过 Gateway 调用 OpenClaw sessions_spawn
- ✅ 修复响应解析问题 (content是对象不是字符串)
- ✅ 移除不支持的 agentId 参数

### Phase 2: 设计
- [ ] 2.1 设计 AIDOS -> OpenClaw 调用流程
- [ ] 2.2 设计代码写入路径

### Phase 3: 实现
- [ ] 3.1 修改 OpenClawRealExecutor 调用 sessions_spawn
- [ ] 3.2 配置 workspace 路径
- [ ] 3.3 测试端到端流程

### Phase 4: 验证
- [ ] 4.1 创建项目测试
- [ ] 4.2 验证代码生成
- [ ] 4.3 验证状态同步

## 关键决策
| 决策项 | 选项 | 选择 |
|--------|------|------|
| 调用方式 | HTTP API / sessions_spawn | sessions_spawn |
| Workspace | OpenClaw workspace / Aidos目录 | OpenClaw workspace |
| 认证方式 | Token / 无 | Token |

## 依赖
- OpenClaw Gateway 运行中
- AIDOS API 运行中

## 风险
- sessions_spawn 可能有超时限制
- Workspace 权限问题

---
*Created: 2026-02-15*
*Status: in_progress*
