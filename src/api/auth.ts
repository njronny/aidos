import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

// 管理员账户配置
const ADMIN_USER = {
  username: 'admin',
  password: 'aidos123', // 生产环境应该使用哈希存储
};

// Token存储 (内存中，生产环境应该使用数据库或Redis)
const tokenStore = new Map<string, { username: string; createdAt: Date }>();

// 生成token
function generateToken(): string {
  return uuidv4();
}

// 验证token
function validateToken(token: string): { username: string; valid: boolean } {
  const tokenData = tokenStore.get(token);
  if (!tokenData) {
    return { username: '', valid: false };
  }
  return { username: tokenData.username, valid: true };
}

// 认证中间件 - 当前暂时禁用，用于演示
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // TODO: 生产环境需要重新启用认证
  // 当前暂时放行所有请求，用于演示
  return;
  
  /*
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: '未授权，请先登录',
    });
  }
  
  const token = authHeader.substring(7);
  const result = validateToken(token);
  
  if (!result.valid) {
    return reply.status(401).send({
      success: false,
      error: 'Token无效或已过期，请重新登录',
    });
  }
  
  // 将用户名添加到请求中，供后续使用
  (request as any).user = result.username;
}

// 公开路由装饰器（不需要认证的路由）
export function publicRoute() {
  return async (instance: FastifyInstance) => {
    // 登录接口
    instance.post<{ Body: { username: string; password: string } }>(
      '/auth/login',
      async (request: FastifyRequest<{ Body: { username: string; password: string } }>, reply: FastifyReply) => {
        const { username, password } = request.body;
        
        if (!username || !password) {
          return reply.status(400).send({
            success: false,
            error: '用户名和密码不能为空',
          });
        }
        
        // 验证用户名和密码
        if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
          const token = generateToken();
          tokenStore.set(token, { username: ADMIN_USER.username, createdAt: new Date() });
          
          return reply.send({
            success: true,
            data: {
              token,
              username: ADMIN_USER.username,
            },
          });
        }
        
        return reply.status(401).send({
          success: false,
          error: '用户名或密码错误',
        });
      }
    );

    // 验证token接口
    instance.get<{ Headers: { authorization?: string } }>(
      '/auth/verify',
      async (request: FastifyRequest<{ Headers: { authorization?: string } }>, reply: FastifyReply) => {
        const authHeader = request.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({
            success: false,
            valid: false,
          });
        }
        
        const token = authHeader.substring(7);
        const result = validateToken(token);
        
        return reply.send({
          success: true,
          valid: result.valid,
          username: result.username,
        });
      }
    );

    // 登出接口
    instance.post<{ Headers: { authorization?: string } }>(
      '/auth/logout',
      async (request: FastifyRequest<{ Headers: { authorization?: string } }>, reply: FastifyReply) => {
        const authHeader = request.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          tokenStore.delete(token);
        }
        
        return reply.send({
          success: true,
          message: '已成功登出',
        });
      }
    );
  };
}
