/**
 * 配置管理模块
 */

import { FastifyInstance } from 'fastify';

interface AppConfig {
  // 应用配置
  app: {
    name: string;
    version: string;
    environment: string;
  };
  
  // API配置
  api: {
    port: number;
    host: string;
    rateLimit: {
      max: number;
      timeWindow: string;
    };
  };
  
  // 数据库配置
  database: {
    client: string;
    filename: string;
  };
  
  // 认证配置
  auth: {
    jwtExpiresIn: string;
    refreshExpiresIn: string;
  };
}

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  cachedConfig = {
    app: {
      name: 'AIDOS',
      version: process.env.AIDOS_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
    
    api: {
      port: parseInt(process.env.API_PORT || '3000'),
      host: process.env.API_HOST || '0.0.0.0',
      rateLimit: {
        max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
        timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
      },
    },
    
    database: {
      client: process.env.DB_CLIENT || 'better-sqlite3',
      filename: process.env.DB_FILENAME || './data/aidos.db',
    },
    
    auth: {
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
  };
  
  return cachedConfig;
}

export async function configRoutes(fastify: FastifyInstance) {
  
  // 获取公开配置
  fastify.get('/config/public', async (request, reply) => {
    const config = getConfig();
    
    return reply.send({
      success: true,
      data: {
        name: config.app.name,
        version: config.app.version,
        environment: config.app.environment,
      }
    });
  });

  // 获取完整配置 (仅管理员)
  fastify.get('/config', async (request, reply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    const config = getConfig();
    
    // 隐藏敏感信息
    return reply.send({
      success: true,
      data: {
        ...config,
        auth: '***', // 隐藏认证配置
      }
    });
  });
}
