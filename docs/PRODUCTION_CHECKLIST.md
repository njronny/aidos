# AIDOS 生产环境部署检查清单

## ✅ 部署前检查

### 1. 环境变量配置

| 变量 | 必须 | 默认值 | 说明 |
|------|------|--------|------|
| `NODE_ENV` | ✅ | - | 必须设为 `production` |
| `JWT_SECRET` | ✅ | - | 必须使用强随机密钥 (64+字符) |
| `ADMIN_PASSWORD_HASH` | ✅ | - | bcrypt哈希密码 |
| `LOG_LEVEL` | ✅ | `info` | 日志级别 |
| `CORS_ORIGIN` | ✅ | - | 允许的域名列表 |

### 2. 安全配置

- [ ] `JWT_SECRET` 已修改为强密钥
- [ ] `ADMIN_PASSWORD_HASH` 已重新生成
- [ ] `CORS_ORIGIN` 已配置实际域名
- [ ] Rate Limit 已启用
- [ ] Helmet 安全头已启用

### 3. 数据库

- [ ] 数据库文件已备份
- [ ] 磁盘空间充足 (>10GB)
- [ ] 定期备份脚本已配置

### 4. 性能

- [ ] PM2/Supervisor 进程管理已配置
- [ ] 优雅关闭信号已处理
- [ ] 健康检查端点已测试

## 🚀 部署命令

```bash
# 构建
npm run build

# 使用PM2运行
pm2 start dist/index.js --name aidos

# 或使用Docker
docker-compose up -d
```

## 🔍 部署后验证

```bash
# 健康检查
curl https://your-domain.com/health

# 就绪检查  
curl https://your-domain.com/health/ready

# 认证测试
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

## 📊 监控指标

- 响应时间 < 200ms (p95)
- 错误率 < 0.1%
- CPU < 70%
- 内存 < 80%
