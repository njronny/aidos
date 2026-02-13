import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { projectRoutes } from './routes/projects';
import { requirementRoutes } from './routes/requirements';
import { taskRoutes } from './routes/tasks';
import { agentRoutes } from './routes/agents';
import { publicRoute, authMiddleware } from './auth';

const fastify = Fastify({
  logger: {
    level: 'info',
  },
});

async function startServer() {
  try {
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

    // Register public auth routes (no auth required)
    await fastify.register(publicRoute, { prefix: '/api' });

    // Register routes (with auth middleware for protected routes)
    await fastify.register(async (instance) => {
      instance.addHook('preHandler', authMiddleware);
      await instance.register(projectRoutes, { prefix: '/projects' });
      await instance.register(requirementRoutes, { prefix: '/requirements' });
      await instance.register(taskRoutes, { prefix: '/tasks' });
      await instance.register(agentRoutes, { prefix: '/agents' });
    }, { prefix: '/api' });

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
          auth: '/api/auth/login',
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
      fastify.log.error(error);
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
    console.log(`📋 API Endpoints:`);
    console.log(`   - POST   /api/auth/login    - 用户登录`);
    console.log(`   - GET    /api/auth/verify   - 验证Token`);
    console.log(`   - POST   /api/auth/logout   - 用户登出`);
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

// Export for testing
export { fastify, startServer };

// Start if run directly
startServer();
