/**
 * 全局错误处理
 */

import { FastifyInstance, FastifyRequest, FastifyReply, FastifyError, FastifyRequestBase } from 'fastify';

export function errorHandler() {
  return async (fastify: FastifyInstance) => {
    
    // 404 处理
    fastify.setNotFoundHandler(async (request: FastifyRequestBase, reply: FastifyReply) => {
      return reply.status(404).send({
        success: false,
        error: '路由不存在',
        path: request.url,
        method: request.method,
      });
    });

    // 错误处理
    fastify.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      
      // 验证错误
      if (error.validation) {
        return reply.status(400).send({
          success: false,
          error: '请求参数验证失败',
          details: error.validation,
        });
      }

      // JWT 错误
      if (error.message?.includes('jwt')) {
        return reply.status(401).send({
          success: false,
          error: '认证失败',
          message: error.message,
        });
      }

      // 速率限制错误
      if (error.statusCode === 429) {
        return reply.status(429).send({
          success: false,
          error: '请求过于频繁，请稍后再试',
        });
      }

      // 开发环境显示详细错误
      if (process.env.NODE_ENV !== 'production') {
        fastify.log.error(error);
        return reply.status(error.statusCode || 500).send({
          success: false,
          error: error.message || '服务器内部错误',
          stack: error.stack,
        });
      }

      // 生产环境隐藏详细错误
      fastify.log.error({ err: error }, 'Server Error');
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: '服务器内部错误',
      });
    });
  };
}
