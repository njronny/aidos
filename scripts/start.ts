#!/usr/bin/env ts-node
/**
 * Aidos API Server Startup Script
 * 
 * Usage:
 *   npm run api          - Run API server
 *   npm run api:dev      - Run with hot reload
 */

import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import websocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { projectRoutes } from '../src/api/routes/projects';
import { requirementRoutes } from '../src/api/routes/requirements';
import { taskRoutes } from '../src/api/routes/tasks';
import { agentRoutes } from '../src/api/routes/agents';
import { authMiddleware } from '../src/api/middleware/auth';
import { rateLimit } from '../src/core/ratelimit';

const isProduction = process.env.NODE_ENV === 'production';

const fastify = Fastify({
  logger: isProduction ? {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: false,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  } : {
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

async function main() {
  try {
    // Register Swagger
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: 'AIDOS API',
          description: 'AI DevOps System - 全自动AI开发系统API',
          version: '1.0.0',
        },
        servers: [{ url: `http://localhost:${process.env.PORT || 3000}` }],
      },
    });

    // Register Swagger UI
    await fastify.register(swaggerUi, {
      routePrefix: '/api/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });

    // Register CORS
    await fastify.register(cors, {
      origin: true,
    });

    // Register Helmet (安全头)
    await fastify.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    });

    // Register Rate Limit - 100 requests per minute
    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      redis: undefined, // Use in-memory if Redis not available
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    });

    // Register WebSocket
    await fastify.register(websocket);

    // WebSocket endpoint
    fastify.get('/ws', { websocket: true }, (socket, req) => {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`WebSocket client connected: ${clientId}`);

      socket.on('close', () => {
        console.log(`WebSocket client disconnected: ${clientId}`);
      });

      socket.on('error', (error) => {
        console.error(`WebSocket error for ${clientId}:`, error);
      });

      // Send welcome message
      socket.send(JSON.stringify({
        type: 'notification',
        payload: { message: 'Connected to Aidos WebSocket' },
        timestamp: new Date().toISOString(),
      }));
    });

    // Register auth middleware (global) - 必须在路由之前注册
    await fastify.register(authMiddleware);

    // Register routes
    await fastify.register(projectRoutes, { prefix: '/api' });
    await fastify.register(requirementRoutes, { prefix: '/api' });
    await fastify.register(taskRoutes, { prefix: '/api' });
    await fastify.register(agentRoutes, { prefix: '/api' });

    // Health check (基础)
    fastify.get('/health', async (request, reply) => {
      return {
        success: true,
        message: 'Aidos API Server is running',
        timestamp: new Date().toISOString(),
      };
    });

    // Health check (详细 - 用于K8s/K8s probes)
    fastify.get('/health/ready', async (request, reply) => {
      try {
        // 检查数据库连接
        const { testConnection } = await import('../src/infrastructure/database/connection');
        const dbOk = await testConnection();
        
        if (!dbOk) {
          return reply.status(503).send({
            success: false,
            status: 'unhealthy',
            checks: { database: 'disconnected' },
            timestamp: new Date().toISOString(),
          });
        }
        
        return reply.send({
          success: true,
          status: 'healthy',
          checks: { database: 'connected' },
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        return reply.status(503).send({
          success: false,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Liveness probe (K8s)
    fastify.get('/health/live', async (request, reply) => {
      return reply.send({ success: true, status: 'alive' });
    });

    // API info
    fastify.get('/api', async (request, reply) => {
      return {
        success: true,
        message: 'Welcome to Aidos API',
        version: '1.0.0',
        endpoints: {
          projects: '/api/projects',
          requirements: '/api/requirements',
          tasks: '/api/tasks',
          agents: '/api/agents',
          websocket: '/ws',
        },
      };
    });

    // Error handler
    fastify.setErrorHandler((error: Error, request: FastifyRequest, reply: FastifyReply) => {
      console.error('Error:', error);
      reply.status(500).send({
        success: false,
        error: error.message || 'Internal Server Error',
      });
    });

    // 404 handler
    fastify.setNotFoundHandler((request, reply) => {
      reply.status(404).send({
        success: false,
        error: 'Route not found',
      });
    });

    // Start server
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`🚀 Aidos API Server running at http://${host}:${port}`);
    console.log(`📡 WebSocket available at ws://${host}:${port}/ws`);
    console.log(`📚 API Documentation at http://${host}:${port}/api/docs`);
    console.log(`📋 API Endpoints:`);
    console.log(`   - GET    /api/projects      - 项目列表`);
    console.log(`   - GET    /api/projects/:id  - 项目详情`);
    console.log(`   - POST   /api/projects       - 创建项目`);
    console.log(`   - PUT    /api/projects/:id  - 更新项目`);
    console.log(`   - DELETE /api/projects/:id  - 删除项目`);
    console.log(`   - GET    /api/requirements  - 需求列表`);
    console.log(`   - GET    /api/tasks          - 任务列表`);
    console.log(`   - GET    /api/agents         - 代理列表`);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// 优雅关闭处理
const gracefulShutdown = async (signal: string) => {
  console.log(`\n📴 收到 ${signal} 信号，开始优雅关闭...`);
  
  try {
    // 停止接收新请求
    await fastify.close();
    console.log('✅ HTTP服务器已关闭');
    
    // 关闭数据库连接
    const { closeDatabase } = await import('../src/infrastructure/database/connection');
    await closeDatabase();
    console.log('✅ 数据库连接已关闭');
    
    console.log('👋 优雅关闭完成');
    process.exit(0);
  } catch (err) {
    console.error('❌ 关闭时出错:', err);
    process.exit(1);
  }
};

// 监听终止信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

console.log('🌟 Starting Aidos API Server...');
console.log(`📅 Started at: ${new Date().toISOString()}`);
console.log('');

main();
