# ============================================
# Stage 1: Builder - 编译TypeScript
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源码并构建
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ============================================
# Stage 2: Production - 运行镜像
# ============================================
FROM node:20-alpine AS production

# 安全配置：非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production \
    PORT=80 \
    LOG_LEVEL=info

# 创建必要的目录并设置权限
RUN mkdir -p /app/dist /app/data /app/logs && \
    chown -R nodejs:nodejs /app

# 从builder阶段复制构建产物
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# 复制配置文件
COPY --chown=nodejs:nodejs tsconfig.json ./

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:80/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# 启动命令
CMD ["node", "dist/index.js"]
