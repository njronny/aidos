# AIDOS 开发计划 - Milestone 1: OpenClaw 集成

## 目标
实现 AIDOS 调用 OpenClaw 执行任务的核心能力

## 架构

```
AIDOS → OpenClawExecutor → OpenClaw CLI/API
                        ↓
                   返回结果

```

## 任务清单

### 1.1 OpenClawExecutor ✅
- [x] 调用本地 OpenClaw 执行任务
- [x] 任务状态跟踪
- [x] 结果回收
- [x] 测试用例 (18 tests)

### 1.2 TaskDistributor ✅
- [x] 任务分发到 OpenClaw
- [x] 负载均衡
- [x] 故障转移
- [x] 测试用例 (9 tests)

### 1.3 NodeRegistry ✅
- [x] 节点注册
- [x] 心跳检测
- [x] 能力描述
- [x] 测试用例 (17 tests)

---

## M2: 错误自动恢复 ✅

| 模块 | 测试数 | 状态 |
|------|--------|------|
| ErrorClassifier | 11 | ✅ |
| FixStrategyEngine | 11 | ✅ |
| AutoRetry | 6 | ✅ |
| **小计** | **28** | ✅ |

---

## 开始时间
2026-02-15

## 进度

| 里程碑 | 测试 | 状态 |
|--------|------|------|
| M1: OpenClaw 集成 | 44 | ✅ |
| M2: 错误自动恢复 | 28 | ✅ |
| M3: 数据持久化 | - | 🔲 |
| M4: 可视化 | - | 🔲 |
| **总计** | **72** | |
