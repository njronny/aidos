#!/usr/bin/env ts-node
/**
 * Aidos API Server Startup Script
 * 
 * Usage:
 *   npm run api          - Run API server
 *   npm run api:dev      - Run with hot reload
 */

import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { projectRoutes } from '../src/api/routes/projects';
import { requirementRoutes } from '../src/api/routes/requirements';
import { taskRoutes } from '../src/api/routes/tasks';
import { agentRoutes } from '../src/api/routes/agents';
import { authMiddleware } from '../src/api/middleware/auth';

const fastify = Fastify({
  logger: {
    level: 'info',
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

    // Register routes
    await fastify.register(projectRoutes, { prefix: '/api' });
    await fastify.register(requirementRoutes, { prefix: '/api' });
    await fastify.register(taskRoutes, { prefix: '/api' });
    await fastify.register(agentRoutes, { prefix: '/api' });

    // Register auth middleware (global)
    await fastify.register(authMiddleware);

    // Health check
    fastify.get('/health', async (request, reply) => {
      return {
        success: true,
        message: 'Aidos API Server is running',
        timestamp: new Date().toISOString(),
      };
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

console.log('🌟 Starting Aidos API Server...');
console.log(`📅 Started at: ${new Date().toISOString()}`);
console.log('');

main();
