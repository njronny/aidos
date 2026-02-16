/**
 * API 使用统计
 */

import { FastifyInstance } from 'fastify';

interface ApiStats {
  totalRequests: number;
  totalErrors: number;
  avgResponseTime: number;
  requestsByEndpoint: Record<string, number>;
  requestsByMethod: Record<string, number>;
  requestsByStatus: Record<string, number>;
  topUsers: Array<{ username: string; count: number }>;
  responseTimes: number[];
}

const stats: ApiStats = {
  totalRequests: 0,
  totalErrors: 0,
  avgResponseTime: 0,
  requestsByEndpoint: {},
  requestsByMethod: {},
  requestsByStatus: {},
  topUsers: [],
  responseTimes: [],
};

const MAX_RESPONSE_TIMES = 1000;

export function statsMiddleware() {
  return async (fastify: FastifyInstance) => {
    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      const responseTime = reply.getResponseTime();
      
      // 基础统计
      stats.totalRequests++;
      
      if (reply.statusCode >= 400) {
        stats.totalErrors++;
      }
      
      // 响应时间
      stats.responseTimes.push(responseTime);
      if (stats.responseTimes.length > MAX_RESPONSE_TIMES) {
        stats.responseTimes.shift();
      }
      stats.avgResponseTime = stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length;
      
      // 按端点统计
      const endpoint = request.url.split('?')[0];
      stats.requestsByEndpoint[endpoint] = (stats.requestsByEndpoint[endpoint] || 0) + 1;
      
      // 按方法统计
      stats.requestsByMethod[request.method] = (stats.requestsByMethod[request.method] || 0) + 1;
      
      // 按状态码统计
      const statusGroup = Math.floor(reply.statusCode / 100) + 'xx';
      stats.requestsByStatus[statusGroup] = (stats.requestsByStatus[statusGroup] || 0) + 1;
      
      // 用户统计
      const user = (request as any).user;
      if (user?.username) {
        const userStat = stats.topUsers.find(u => u.username === user.username);
        if (userStat) {
          userStat.count++;
        } else {
          stats.topUsers.push({ username: user.username, count: 1 });
        }
        // 保持 top 10
        stats.topUsers.sort((a, b) => b.count - a.count);
        if (stats.topUsers.length > 10) {
          stats.topUsers = stats.topUsers.slice(0, 10);
        }
      }
    });
  };
}

export function statsRoutes(fastify: FastifyInstance) {
  
  // 获取统计信息
  fastify.get('/stats', async (request, reply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    return reply.send({
      success: true,
      data: {
        ...stats,
        errorRate: stats.totalRequests > 0 
          ? (stats.totalErrors / stats.totalRequests * 100).toFixed(2) + '%'
          : '0%',
      }
    });
  });

  // 重置统计
  fastify.post('/stats/reset', async (request, reply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    stats.totalRequests = 0;
    stats.totalErrors = 0;
    stats.avgResponseTime = 0;
    stats.requestsByEndpoint = {};
    stats.requestsByMethod = {};
    stats.requestsByStatus = {};
    stats.topUsers = [];
    stats.responseTimes = [];
    
    return reply.send({
      success: true,
      message: '统计已重置'
    });
  });
}
