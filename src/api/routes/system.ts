import { FastifyInstance } from 'fastify';

export async function systemRoutes(fastify: FastifyInstance) {
  
  // 获取缓存状态
  fastify.get('/system/cache', async (request, reply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    return reply.send({
      success: true,
      data: {
        size: fastify.cache.size(),
        ttl: '30000ms',
      }
    });
  });

  // 清除缓存
  fastify.post('/system/cache/clear', async (request, reply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    fastify.cache.clear();
    
    return reply.send({
      success: true,
      message: '缓存已清除'
    });
  });

  // 获取系统信息
  fastify.get('/system/info', async (request, reply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    return reply.send({
      success: true,
      data: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      }
    });
  });
}
