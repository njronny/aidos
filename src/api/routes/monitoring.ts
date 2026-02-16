import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import promClient from 'prom-client';

// Schema 定义
const monitoringSchemas = {
  query: {
    querystring: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['json', 'prometheus'], default: 'json' },
      },
    },
  },
};

// 创建收集器
const register = new promClient.Registry();

// 添加默认指标
promClient.collectDefaultMetrics({ register });

// HTTP请求计数器
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// HTTP请求延迟直方图
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export function monitoringMiddleware(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.startTime = process.hrtime.bigint();
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.url === '/metrics') return; // 跳过metrics端点
    
    const duration = Number(process.hrtime.bigint() - (request as any).startTime) / 1e9;
    const route = request.routeOptions?.url || request.url;
    
    httpRequestsTotal.inc({
      method: request.method,
      route,
      status: reply.statusCode,
    });
    
    httpRequestDuration.observe({
      method: request.method,
      route,
      status: reply.statusCode,
    }, duration);
  });
}

export async function monitoringRoutes(fastify: FastifyInstance) {
  // Prometheus metrics 端点
  fastify.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  // 简单监控数据
  fastify.get('/monitoring/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return reply.send({
      success: true,
      data: {
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        uptime: process.uptime(),
        pid: process.pid,
        platform: process.platform,
      }
    });
  });
}

export { register };
