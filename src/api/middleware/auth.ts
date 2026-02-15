/**
 * 认证中间件
 * 保护需要认证的 API 路由
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  username: string;
  role: string;
}

/**
 * 认证中间件工厂
 * 返回 Fastify 插件函数
 */
export function authMiddleware() {
  return async (fastify: FastifyInstance) => {
    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      // 跳过不需要认证的路由
      const publicRoutes = [
        '/auth/login',
        '/auth/verify',
        '/health',
        '/docs',
        '/swagger',
        '/ws',
        '/api/auth/login',
        '/api/auth/verify',
        '/api'  // API 概览
      ];
      
      const isPublicRoute = publicRoutes.some(route => 
        request.url.startsWith(route)
      );
      
      if (isPublicRoute) {
        return;
      }

      // 获取 token
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          error: '未提供认证 token'
        });
      }

      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET;

      if (!jwtSecret) {
        return reply.status(500).send({
          success: false,
          error: '服务器配置错误'
        });
      }

      try {
        const decoded = jwt.verify(token, jwtSecret) as AuthUser;
        // 将用户信息附加到请求对象
        (request as any).user = decoded;
      } catch (error) {
        return reply.status(401).send({
          success: false,
          error: 'token 无效或已过期'
        });
      }
    });
  };
}

/**
 * 可选的认证中间件
 * 不会强制要求认证，但会尝试解析 token
 */
export function optionalAuthMiddleware() {
  return async (fastify: FastifyInstance) => {
    fastify.addHook('preHandler', async (request: FastifyRequest) => {
      const authHeader = request.headers.authorization;
      
      if (!authHeader?.startsWith('Bearer ')) {
        return;
      }

      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET;

      if (!jwtSecret) {
        return;
      }

      try {
        const decoded = jwt.verify(token, jwtSecret) as AuthUser;
        (request as any).user = decoded;
      } catch {
        // token 无效，忽略
      }
    });
  };
}
