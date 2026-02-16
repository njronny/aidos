/**
 * API 版本控制中间件
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

const API_VERSION = 'v1';
const MIN_SUPPORTED_VERSION = 'v1';

export function apiVersionMiddleware() {
  return async (fastify: FastifyInstance) => {
    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      // 检查 Accept header
      const accept = request.headers.accept;
      
      // 添加版本响应头
      reply.header('X-API-Version', API_VERSION);
      reply.header('X-API-Supported-Versions', MIN_SUPPORTED_VERSION);
      
      // 健康检查和API根路径不需要版本
      if (request.url === '/health' || 
          request.url === '/health/ready' ||
          request.url === '/health/live' ||
          request.url === '/api' ||
          request.url === '/api/docs' ||
          request.url.startsWith('/docs') ||
          request.url.startsWith('/swagger')) {
        return;
      }
      
      // API路由版本检查
      if (request.url.startsWith('/api/')) {
        // v1路由不需要额外处理
        const routeVersion = 'v1';
        if (routeVersion < MIN_SUPPORTED_VERSION) {
          return reply.status(406).send({
            success: false,
            error: 'API版本不支持',
            supportedVersion: MIN_SUPPORTED_VERSION
          });
        }
      }
    });
  };
}
