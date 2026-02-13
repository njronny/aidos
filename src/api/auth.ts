import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// 环境变量
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'aidos123';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '24h') as string;
const JWT_REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as string;

// Token存储 (内存中，生产环境应该使用数据库或Redis)
const tokenStore = new Map<string, { username: string; createdAt: Date; expiresAt: Date }>();
const refreshTokenStore = new Map<string, { username: string; createdAt: Date; expiresAt: Date }>();

// 密码哈希轮数
const SALT_ROUNDS = 10;

// 初始化时哈希密码
let hashedPassword: string;

async function initializeAuth() {
  // 哈希管理员密码
  hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
  console.log('✅ 认证系统已初始化 (bcrypt哈希)');
}

// 生成Access Token
function generateAccessToken(username: string): string {
  return jwt.sign({ username, type: 'access' }, JWT_SECRET, { expiresIn: '24h' });
}

// 生成Refresh Token
function generateRefreshToken(username: string): string {
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期
  
  refreshTokenStore.set(token, { username, createdAt: new Date(), expiresAt });
  return token;
}

// 验证Access Token
function verifyAccessToken(token: string): { username: string; valid: boolean } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string; type: string };
    if (decoded.type !== 'access') {
      return { username: '', valid: false };
    }
    return { username: decoded.username, valid: true };
  } catch {
    return { username: '', valid: false };
  }
}

// 验证Refresh Token并生成新的Access Token
function verifyRefreshToken(refreshToken: string): { username: string; newAccessToken: string | null; valid: boolean } {
  const tokenData = refreshTokenStore.get(refreshToken);
  
  if (!tokenData) {
    return { username: '', newAccessToken: null, valid: false };
  }
  
  if (tokenData.expiresAt < new Date()) {
    refreshTokenStore.delete(refreshToken);
    return { username: '', newAccessToken: null, valid: false };
  }
  
  // 生成新的Access Token
  const newAccessToken = generateAccessToken(tokenData.username);
  
  return { username: tokenData.username, newAccessToken, valid: true };
}

// 验证密码
async function verifyPassword(password: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// 认证中间件 - 验证Token
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: '未提供认证Token',
    });
  }
  
  const token = authHeader.substring(7);
  const result = verifyAccessToken(token);
  
  if (!result.valid) {
    return reply.status(401).send({
      success: false,
      error: 'Token无效或已过期',
    });
  }
  
  // 将用户名附加到请求对象
  (request as any).username = result.username;
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
        
        // 验证用户名
        if (username !== ADMIN_USERNAME) {
          return reply.status(401).send({
            success: false,
            error: '用户名或密码错误',
          });
        }
        
        // 验证密码
        const isValidPassword = await verifyPassword(password);
        if (!isValidPassword) {
          return reply.status(401).send({
            success: false,
            error: '用户名或密码错误',
          });
        }
        
        // 生成Token
        const accessToken = generateAccessToken(username);
        const refreshToken = generateRefreshToken(username);
        
        return reply.send({
          success: true,
          data: {
            accessToken,
            refreshToken,
            username,
            expiresIn: '24h',
          },
        });
      }
    );

    // 刷新Token接口
    instance.post<{ Body: { refreshToken: string } }>(
      '/auth/refresh',
      async (request: FastifyRequest<{ Body: { refreshToken: string } }>, reply: FastifyReply) => {
        const { refreshToken } = request.body;
        
        if (!refreshToken) {
          return reply.status(400).send({
            success: false,
            error: 'Refresh Token不能为空',
          });
        }
        
        const result = verifyRefreshToken(refreshToken);
        
        if (!result.valid) {
          return reply.status(401).send({
            success: false,
            error: 'Refresh Token无效或已过期',
          });
        }
        
        return reply.send({
          success: true,
          data: {
            accessToken: result.newAccessToken,
            username: result.username,
            expiresIn: '24h',
          },
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
        const result = verifyAccessToken(token);
        
        return reply.send({
          success: true,
          valid: result.valid,
          username: result.username,
        });
      }
    );

    // 登出接口
    instance.post<{ Body: { refreshToken?: string }; Headers: { authorization?: string } }>(
      '/auth/logout',
      async (request: FastifyRequest<{ Body: { refreshToken?: string }; Headers: { authorization?: string } }>, reply: FastifyReply) => {
        const authHeader = request.headers.authorization;
        const { refreshToken } = request.body || {};
        
        // 删除Access Token
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          // 注意：JWT是无状态的，这里只清理Refresh Token
        }
        
        // 删除Refresh Token
        if (refreshToken) {
          refreshTokenStore.delete(refreshToken);
        }
        
        return reply.send({
          success: true,
          message: '已成功登出',
        });
      }
    );
  };
}

// 导出初始化函数
export { initializeAuth };
