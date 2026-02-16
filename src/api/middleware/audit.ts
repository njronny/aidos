/**
 * 审计日志模块
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  username?: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  statusCode: number;
  details?: any;
}

// 内存审计日志存储 (生产环境应使用数据库)
const auditLogs: AuditLog[] = [];
const MAX_LOGS = 10000;

export function addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
  const entry: AuditLog = {
    ...log,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  
  auditLogs.unshift(entry);
  
  // 限制日志数量
  if (auditLogs.length > MAX_LOGS) {
    auditLogs.splice(MAX_LOGS);
  }
}

export function auditMiddleware() {
  return async (fastify: FastifyInstance) => {
    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      // 跳过不需要审计的路由
      const skipRoutes = ['/health', '/metrics', '/docs', '/swagger'];
      if (skipRoutes.some(route => request.url.startsWith(route))) {
        return;
      }
      
      const user = (request as any).user;
      
      addAuditLog({
        userId: user?.id,
        username: user?.username,
        action: reply.statusCode >= 200 && reply.statusCode < 300 ? 'success' : 'failed',
        resource: request.url.split('/').slice(2).join('/') || 'unknown',
        method: request.method,
        path: request.url,
        ip: request.ip || request.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: request.headers['user-agent'] || 'unknown',
        statusCode: reply.statusCode,
      });
    });
  };
}

export async function auditRoutes(fastify: FastifyInstance) {
  
  // 获取审计日志
  fastify.get('/audit-logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    const { action, userId, page = 1, limit = 50 } = request.query as any;
    
    let logs = [...auditLogs];
    
    // 筛选
    if (action) {
      logs = logs.filter(l => l.action === action);
    }
    if (userId) {
      logs = logs.filter(l => l.userId === userId);
    }
    
    // 分页
    const start = (page - 1) * limit;
    const paginatedLogs = logs.slice(start, start + limit);
    
    return reply.send({
      success: true,
      data: paginatedLogs,
      pagination: {
        page,
        limit,
        total: logs.length,
        totalPages: Math.ceil(logs.length / limit),
      }
    });
  });
}
