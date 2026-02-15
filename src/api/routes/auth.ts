import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/login - 用户登录
  fastify.post('/auth/login', async (request, reply) => {
    const body = request.body as any;
    const { username, password } = body || {};
    
    if (!username || !password) {
      return reply.status(400).send({ success: false, error: '用户名和密码不能为空' });
    }
    
    if (username === 'admin' && password === 'aidos123') {
      const token = uuidv4();
      return reply.send({ success: true, data: { token, username: 'admin' } });
    }
    
    return reply.status(401).send({ success: false, error: '用户名或密码错误' });
  });

  // GET /api/auth/verify - 验证Token
  fastify.get('/auth/verify', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ success: false, valid: false });
    }
    return reply.send({ success: true, valid: true });
  });

  // POST /api/auth/logout - 用户登出
  fastify.post('/auth/logout', async (request, reply) => {
    return reply.send({ success: true, message: '已登出' });
  });
}
