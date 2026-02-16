# CHANGELOG

# 更新日志

## [1.0.0] - 2026-02-16

### 新增
- **认证系统**
  - JWT + bcrypt 密码加密
  - Token 刷新机制
  - Token 黑名单登出
  - 角色权限 (admin/user/readonly)
  
- **API 功能**
  - 用户管理 CRUD
  - 项目搜索 + 状态筛选
  - 配置管理 API
  - 定时任务管理
  - 系统管理 API
  - 审计日志
  - API 使用统计
  
- **监控**
  - Prometheus 指标
  - 健康检查端点
  - 系统资源监控
  - 请求日志
  
- **生产特性**
  - Rate Limit 限流
  - Helmet 安全头
  - 优雅关闭
  - 结构化日志
  - 请求验证 Schema
  - API 版本控制
  - 全局错误处理
  - 缓存中间件
  
- **部署**
  - Docker Compose 生产配置
  - CI/CD GitHub Actions
  - 数据库备份脚本
  - 生产检查清单
  - 性能优化指南

### 改进
- 前端加载骨架屏
- 任务流程图状态颜色
- 快捷键支持 (Ctrl+N, Esc)
- Swagger API 文档增强
- README 徽章

### 修复
- Playwright 端口配置
- 数据库外键约束
- 内存分页限制
- CSS 语法错误
- 前端 API 配置化
- 工作流失败状态更新

---

## [0.9.0] - 2026-02-15

### 新增
- AI 代理团队 (6种角色)
- 需求 → 开发 → 测试 → 提交 流程
- Web UI 仪表盘
- WebSocket 实时更新
- SQLite 数据库
- E2E 测试

---

## [0.1.0] - 2026-02-13

### 新增
- 项目初始化
- 基础 API 路由
- 任务调度器
