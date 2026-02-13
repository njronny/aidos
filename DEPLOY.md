# Aidos 部署指南

## 目录

- [本地开发 (Docker Compose)](#本地开发-docker-compose)
- [生产环境 (Kubernetes)](#生产环境-kubernetes)
- [Docker 构建](#docker-构建)
- [环境变量配置](#环境变量配置)
- [健康检查与监控](#健康检查与监控)
- [滚动更新](#滚动更新)
- [故障排查](#故障排查)

---

## 本地开发 (Docker Compose)

### 前置要求

- Docker >= 20.10
- Docker Compose >= 2.0

### 启动步骤

```bash
# 1. 复制环境变量配置
cp .env.example .env

# 2. 构建并启动容器
docker-compose up -d

# 3. 查看日志
docker-compose logs -f

# 4. 停止服务
docker-compose down
```

### 访问服务

- API: http://localhost:3000
- 健康检查: http://localhost:3000/health

---

## 生产环境 (Kubernetes)

### 前置要求

- Kubernetes >= 1.24
- kubectl 已配置
- Nginx Ingress Controller 已安装

### 部署步骤

```bash
# 1. 创建命名空间
kubectl create namespace aidos

# 2. 创建 ConfigMap
kubectl apply -f kubernetes/configmap.yaml

# 3. 创建 PersistentVolumeClaim (用于持久化数据)
# 注意: 需要根据你的存储类型创建合适的 PVC
kubectl apply -f kubernetes/pvc.yaml

# 4. 部署应用
kubectl apply -f kubernetes/deployment.yaml

# 5. 创建 Service
kubectl apply -f kubernetes/service.yaml

# 6. 创建 Ingress (可选)
kubectl apply -f kubernetes/ingress.yaml

# 7. 验证部署
kubectl get pods -n aidos
kubectl get svc -n aidos
kubectl get ingress -n aidos
```

### 扩缩容

```bash
# 扩缩容
kubectl scale deployment aidos-api --replicas=3 -n aidos

# 自动扩缩容 (HPA)
kubectl autoscale deployment aidos-api --min=2 --max=10 --cpu-percent=80 -n aidos
```

---

## Docker 构建

### 构建镜像

```bash
# 构建生产镜像
docker build -t aidos/api:latest .

# 带版本标签
docker build -t aidos/api:1.0.0 -t aidos/api:latest .
```

### 推送镜像到仓库

```bash
# 登录镜像仓库
docker login

# 推送镜像
docker push aidos/api:1.0.0
docker push aidos/api:latest
```

### 本地运行

```bash
# 使用环境变量
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=/app/data/aidos.db \
  -v ./data:/app/data \
  aidos/api:latest

# 使用 .env 文件
docker run -d --env-file .env -p 3000:3000 aidos/api:latest
```

---

## 环境变量配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NODE_ENV` | `production` | 运行环境 |
| `API_PORT` | `3000` | API 服务端口 |
| `API_HOST` | `0.0.0.0` | API 监听地址 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `DATABASE_URL` | `./data/aidos.db` | SQLite 数据库路径 |
| `CORS_ORIGIN` | `*` | CORS 允许的来源 |
| `HEALTH_CHECK_PATH` | `/health` | 健康检查路径 |
| `TZ` | `UTC` | 时区 |

---

## 健康检查与监控

### Kubernetes 健康检查

部署已配置以下探针:

- **Liveness Probe**: 检查容器是否存活 (30s 延迟, 10s 周期)
- **Readiness Probe**: 检查容器是否就绪 (5s 延迟, 5s 周期)

### 手动检查

```bash
# 检查 Pod 状态
kubectl describe pod <pod-name> -n aidos

# 查看健康检查日志
kubectl logs <pod-name> -n aidos --previous

# 端口转发进行测试
kubectl port-forward svc/aidos-api 3000:80 -n aidos
curl http://localhost:3000/health
```

---

## 滚动更新

### 使用 kubectl 更新

```bash
# 更新镜像版本
kubectl set image deployment/aidos-api aidos=aidos/api:1.1.0 -n aidos

# 查看更新进度
kubectl rollout status deployment/aidos-api -n aidos

# 回滚到上一版本
kubectl rollout undo deployment/aidos-api -n aidos

# 回滚到指定版本
kubectl rollout undo deployment/aidos-api --to-revision=2 -n aidos
```

### 使用 Helm (可选)

```bash
# 添加 Helm 仓库
helm repo add aidos https://charts.example.com

# 安装
helm install aidos aidos/aidos -n aidos

# 更新
helm upgrade aidos aidos/aidos -n aidos
```

---

## 故障排查

### 常见问题

#### 1. Pod 无法启动

```bash
# 查看事件
kubectl describe pod <pod-name> -n aidos

# 常见原因: 镜像拉取失败、资源不足、配置错误
```

#### 2. 健康检查失败

```bash
# 检查应用日志
kubectl logs <pod-name> -n aidos

# 检查网络连通性
kubectl exec -it <pod-name> -n aidos -- wget -qO- http://localhost:3000/health
```

#### 3. 数据库连接失败

```bash
# 检查 PVC 状态
kubectl get pvc -n aidos

# 检查数据目录权限
kubectl exec -it <pod-name> -n aidos -- ls -la /app/data
```

#### 4. Ingress 无法访问

```bash
# 检查 Ingress 状态
kubectl describe ingress aidos-api-ingress -n aidos

# 检查 Nginx Ingress Controller
kubectl get pods -n ingress-nginx
```

### 日志收集

```bash
# 应用日志
kubectl logs -l app=aidos -n aidos --tail=100

# 收集所有 Pod 日志到一个文件
kubectl logs -n aidos --all-containers=true > aidos-logs.txt
```

---

## 安全建议

1. **不要在生产环境使用 root 用户** - 已配置非root用户运行
2. **启用 TLS** - 在 Ingress 中配置 TLS 证书
3. **限制资源** - 已配置 CPU/内存限制
4. **定期更新** - 关注安全补丁和更新
5. **Secrets 管理** - 使用 Kubernetes Secrets 存储敏感信息

---

## 快速参考

```bash
# 完整部署命令
kubectl create namespace aidos && \
kubectl apply -f kubernetes/configmap.yaml && \
kubectl apply -f kubernetes/deployment.yaml && \
kubectl apply -f kubernetes/service.yaml && \
kubectl apply -f kubernetes/ingress.yaml

# 查看服务状态
kubectl get all -n aidos

# 进入容器调试
kubectl exec -it <pod-name> -n aidos -- sh
```

---

## 文档版本

- 版本: 1.0.0
- 更新日期: 2024
