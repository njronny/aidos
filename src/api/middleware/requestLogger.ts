/**
 * 请求日志中间件
 * 记录所有API请求
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface RequestLog {
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
}

export function requestLogger() {
  return async (fastify: FastifyInstance) => {
    fastify.addHook('onRequest', async (request: FastifyRequest) => {
      (request as any).startTime = Date.now();
    });

    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      const responseTime = Date.now() - ((request as any).startTime || Date.now());
      
      // 只记录API请求
      if (request.url.startsWith('/api/') || request.url.startsWith('/auth/')) {
        const log: RequestLog = {
          method: request.method,
          url: request.url,
          ip: request.ip || request.headers['x-forwarded-for'] as string || 'unknown',
          userAgent: request.headers['user-agent'] || 'unknown',
          statusCode: reply.statusCode,
          responseTime,
          timestamp: new Date().toISOString(),
        };
        
        // 根据状态码选择日志级别
        if (reply.statusCode >= 500) {
          fastify.log.error({ request: log }, 'API Error');
        } else if (reply.statusCode >= 400) {
          fastify.log.warn({ request: log }, 'API Warning');
        } else {
          fastify.log.info({ request: log }, 'API Request');
        }
      }
    });
  };
}
