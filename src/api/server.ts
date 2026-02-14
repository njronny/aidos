import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { projectRoutes } from './routes/projects';
import { requirementRoutes } from './routes/requirements';
import { taskRoutes } from './routes/tasks';
import { agentRoutes } from './routes/agents';
import { analyticsRoutes } from './routes/analytics';
import { exportRoutes } from './routes/export';
import { batchRoutes } from './routes/batch';
import { qualityRoutes } from './routes/quality';
import { publicRoute, authMiddleware } from './auth';
import { getWorkflowService } from '../core/workflow';
import { dataStore } from './store';
import { initializeDatabase } from '../infrastructure/database';
import { getMetricsService, CoreMetricName } from '../core/monitoring';
import { TaskWorker } from '../core/worker/TaskWorker';
import { SelfHealingService, HealingStrategy, AlertSeverity, AlertCondition } from '../core/monitoring';

// Extend FastifyRequest to include startTime
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

const fastify = Fastify({
  logger: {
    level: 'info',
  },
});

// Request timing hook for metrics
fastify.addHook('onRequest', async (request: FastifyRequest) => {
  request.startTime = Date.now();
});

fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
  if (request.startTime) {
    const responseTime = Date.now() - request.startTime;
    const metricsService = getMetricsService();
    metricsService.incrementApiRequest();
    metricsService.recordApiResponseTime(responseTime);
    
    // Track error rate for non-2xx responses
    if (reply.statusCode >= 400) {
      metricsService.incrementApiError();
    }
  }
});

async function startServer() {
  try {
    // 初始化数据库
    await initializeDatabase();
    console.log('Database initialized');

    // 启动后台任务执行器
    const taskWorker = new TaskWorker();
    taskWorker.start();
    console.log('[Server] TaskWorker started');

    // 初始化自愈服务
    const selfHealingService = new SelfHealingService({
      enableAutoHealing: true,
      maxRetries: 3,
      retryDelayMs: 5000,
      actionTimeoutMs: 30000,
    });
    
    // 注册编译失败自动重试策略
    const buildFailureStrategy: HealingStrategy = {
      id: 'auto-rebuild-on-failure',
      name: '编译失败自动重试',
      description: '检测到编译失败后自动重新编译',
      triggerMetric: 'build_failure',
      triggerSeverity: AlertSeverity.ERROR,
      triggerCondition: { operator: 'eq', threshold: 1 },
      actions: [
        {
          type: 'command',
          command: 'cd /root/.openclaw/workspace/aidos && npm run build',
          timeout: 120000,
          retryable: true,
        },
      ],
      enabled: true,
      cooldownMs: 60000, // 1分钟冷却
    };
    selfHealingService.registerStrategy(buildFailureStrategy);
    
    // 注册任务卡住自动恢复策略
    const stuckTaskStrategy: HealingStrategy = {
      id: 'auto-recover-stuck-tasks',
      name: '任务卡住自动恢复',
      description: '检测到任务卡住超过5分钟后自动恢复',
      triggerMetric: 'stuck_task',
      triggerSeverity: AlertSeverity.WARNING,
      triggerCondition: { operator: 'gt', threshold: 0 },
      actions: [
        {
          type: 'script',
          script: 'taskWorker.healthCheck()',
          retryable: true,
        },
      ],
      enabled: true,
      cooldownMs: 30000, // 30秒冷却
    };
    selfHealingService.registerStrategy(stuckTaskStrategy);
    
    // 定期执行健康检查
    const healthCheckInterval = setInterval(async () => {
      try {
        // 检查任务超时
        const health = await taskWorker.healthCheck();
        if (health.recovered > 0) {
          console.log(`[SelfHealing] Recovered ${health.recovered} stuck tasks`);
        }
      } catch (error) {
        console.error('[SelfHealing] Health check error:', error);
      }
    }, 30000); // 每30秒检查一次
    
    console.log('[Server] SelfHealingService initialized');

    // Register CORS
    await fastify.register(cors, {
      origin: true,
    });

    // Serve static files
    await fastify.register(fastifyStatic, {
      root: '/root/.openclaw/workspace/aidos/dist/public',
      prefix: '/',
    });

    // Register WebSocket
    await fastify.register(websocket);

    // WebSocket 客户端管理
    const wsClients = new Set();
    
    // WebSocket endpoint
    fastify.get('/ws', { websocket: true }, (socket, req) => {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`WebSocket client connected: ${clientId}`);
      wsClients.add(socket);

      socket.on('close', () => {
        console.log(`WebSocket client disconnected: ${clientId}`);
        wsClients.delete(socket);
      });

      socket.on('error', (error) => {
        console.error(`WebSocket error for ${clientId}:`, error);
        wsClients.delete(socket);
      });

      // Send welcome message
      socket.send(JSON.stringify({
        type: 'notification',
        payload: { message: 'Connected to Aidos WebSocket' },
        timestamp: new Date().toISOString(),
      }));
    });
    
    // 广播消息到所有 WebSocket 客户端
    function broadcastToClients(type: string, payload: any) {
      const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
      wsClients.forEach((client: any) => {
        try {
          if (client.readyState === 1) { // OPEN
            client.send(message);
          }
        } catch (e) {
          console.error('Broadcast error:', e);
        }
      });
    }

    // Register public auth routes (no auth required)
    fastify.post('/api/auth/login', async (request, reply) => {
      const body = request.body as any;
      const { username, password } = body || {};
      if (!username || !password) {
        return reply.status(400).send({ success: false, error: '用户名和密码不能为空' });
      }
      if (username === 'admin' && password === 'aidos123') {
        const { v4: uuidv4 } = require('uuid');
        const token = uuidv4();
        return reply.send({ success: true, data: { token, username: 'admin' } });
      }
      return reply.status(401).send({ success: false, error: '用户名或密码错误' });
    });

    fastify.get('/api/auth/verify', async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ success: false, valid: false });
      }
      return reply.send({ success: true, valid: true });
    });
    // Register routes directly
    await fastify.register(projectRoutes, { prefix: '/api' });
    await fastify.register(requirementRoutes, { prefix: '/api' });
    await fastify.register(taskRoutes, { prefix: '/api' });
    await fastify.register(agentRoutes, { prefix: '/api' });
    await fastify.register(analyticsRoutes, { prefix: '/api' });
    await fastify.register(exportRoutes, { prefix: '/api' });
    await fastify.register(batchRoutes, { prefix: '/api' });
    await fastify.register(qualityRoutes, { prefix: '/api' });
    // Health check
    fastify.get('/health', async (request, reply) => {
      return {
        success: true,
        message: 'Aidos API Server is running',
        timestamp: new Date().toISOString(),
      };
    });

    // 系统状态 API
    fastify.get('/api/status', async (request, reply) => {
      const workflowService = getWorkflowService();
      const agentPool = workflowService.getAgentPool();
      
      // 获取代理状态
      const agents = agentPool.getAllAgents().map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        status: a.status,
        currentTask: a.currentTask ? {
          id: a.currentTask.id,
          type: a.currentTask.type,
        } : null,
        completedTasksCount: a.completedTasks.length,
      }));
      
      // 获取任务统计
      const allTasks = await dataStore.getAllTasks();
      const taskStats = {
        total: allTasks?.length || 0,
        pending: allTasks?.filter(t => t.status === 'pending').length || 0,
        in_progress: allTasks?.filter(t => t.status === 'in_progress' || t.status === 'assigned').length || 0,
        completed: allTasks?.filter(t => t.status === 'completed').length || 0,
        failed: allTasks?.filter(t => t.status === 'failed').length || 0,
      };
      
      // 计算成功率
      const totalCompleted = taskStats.completed + taskStats.failed;
      const successRate = totalCompleted > 0 ? Math.round((taskStats.completed / totalCompleted) * 100) : 100;
      
      return reply.send({
        success: true,
        data: {
          agents,
          tasks: taskStats,
          successRate,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString(),
        },
      });
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
          workflows: '/api/workflows',
          websocket: '/ws',
        },
      };
    });

    // Workflow routes - 工作流路由
    const workflowService = getWorkflowService();

    // GET /api/workflows - 获取所有工作流
    fastify.get('/api/workflows', async (request, reply) => {
      const workflows = workflowService.getAllWorkflows();
      return reply.send({ success: true, data: workflows });
    });

    // GET /api/workflows/:requirementId - 获取需求对应的工作流
    fastify.get('/api/workflows/:requirementId', async (request, reply) => {
      const { requirementId } = request.params as { requirementId: string };
      const workflow = workflowService.getWorkflow(requirementId);
      if (!workflow) {
        return reply.status(404).send({ success: false, error: '工作流不存在' });
      }
      return reply.send({ success: true, data: workflow });
    });

    // GET /api/workflows-status - 获取工作流状态
    fastify.get('/api/workflows-status', async (request, reply) => {
      const status = {
        workflow: workflowService.getWorkflowStatus(),
        executor: workflowService.getExecutorStatus(),
      };
      return reply.send({ success: true, data: status });
    });

    // POST /api/workflows/trigger - 手动触发工作流
    fastify.post('/api/workflows/trigger', async (request, reply) => {
      const { requirementId } = request.body as { requirementId: string };
      if (!requirementId) {
        return reply.status(400).send({ success: false, error: '需求ID不能为空' });
      }

      const requirement = await dataStore.getRequirementById(requirementId);
      if (!requirement) {
        return reply.status(404).send({ success: false, error: '需求不存在' });
      }

      const workflow = await workflowService.processRequirement(requirement);
      return reply.send({ success: true, data: workflow });
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
    const port = Number(process.env.PORT) || Number(process.env.API_PORT) || 80;
    const host = '0.0.0.0';

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

fastify.get('/debug', async () => ({ routes: fastify.printRoutes() }));

