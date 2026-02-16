import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// 从环境变量获取密码哈希
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Token黑名单（生产环境应使用Redis）
const tokenBlacklist = new Set<string>();

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/login - 用户登录
  fastify.post('/auth/login', async (request, reply) => {
    const body = request.body as any;
    const { username, password } = body || {};
    
    if (!username || !password) {
      return reply.status(400).send({ success: false, error: '用户名和密码不能为空' });
    }
    
    // 验证用户名
    if (username !== ADMIN_USERNAME) {
      return reply.status(401).send({ success: false, error: '用户名或密码错误' });
    }
    
    // 使用bcrypt验证密码
    if (ADMIN_PASSWORD_HASH) {
      const validPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
      if (validPassword) {
        // 生成 JWT token
        const token = jwt.sign(
          { username, role: 'admin' },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );
        
        return reply.send({ 
          success: true, 
          data: { 
            token, 
            username: ADMIN_USERNAME,
            expiresIn: JWT_EXPIRES_IN
          } 
        });
      }
    }
    
    return reply.status(401).send({ success: false, error: '用户名或密码错误' });
  });

  // POST /api/auth/refresh - 刷新Token
  fastify.post('/auth/refresh', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ success: false, error: '未提供token' });
    }
    
    const oldToken = authHeader.substring(7);
    
    // 检查是否在黑名单中
    if (tokenBlacklist.has(oldToken)) {
      return reply.status(401).send({ success: false, error: 'token已失效' });
    }
    
    try {
      // 验证旧token
      const decoded = jwt.verify(oldToken, JWT_SECRET) as any;
      
      // 生成新token
      const newToken = jwt.sign(
        { username: decoded.username, role: decoded.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      // 将旧token加入黑名单
      tokenBlacklist.add(oldToken);
      
      // 清理过期的黑名单token（简化处理）
      if (tokenBlacklist.size > 100) {
        const oldTokens = Array.from(tokenBlacklist).slice(0, 50);
        oldTokens.forEach(t => tokenBlacklist.delete(t));
      }
      
      return reply.send({ 
        success: true, 
        data: { 
          token: newToken,
          expiresIn: JWT_EXPIRES_IN
        } 
      });
    } catch (error) {
      return reply.status(401).send({ success: false, error: 'token无效或已过期' });
    }
  });

  // GET /api/auth/verify - 验证Token
  fastify.get('/auth/verify', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ success: false, valid: false });
    }
    
    const token = authHeader.substring(7);
    
    // 检查黑名单
    if (tokenBlacklist.has(token)) {
      return reply.status(401).send({ success: false, valid: false, error: 'token已失效' });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return reply.send({ success: true, valid: true, user: decoded });
    } catch (error) {
      return reply.status(401).send({ success: false, valid: false, error: 'token无效或已过期' });
    }
  });

  // POST /api/auth/logout - 用户登出（加入黑名单）
  fastify.post('/auth/logout', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      tokenBlacklist.add(token);
    }
    return reply.send({ success: true, message: '已登出' });
  });
}
