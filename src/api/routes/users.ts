import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface CreateUserDto {
  username: string;
  password: string;
  email?: string;
  role?: string;
}

interface UpdateUserDto {
  email?: string;
  role?: string;
  status?: string;
}

// 获取环境变量
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

export async function userRoutes(fastify: FastifyInstance) {
  
  // 获取当前用户信息
  fastify.get('/users/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ success: false, error: '未登录' });
    }
    
    // 隐藏敏感信息
    return reply.send({
      success: true,
      data: {
        username: user.username,
        role: user.role,
      }
    });
  });

  // 获取用户列表 (仅管理员)
  fastify.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    // TODO: 从数据库获取用户列表
    // 临时返回当前用户
    return reply.send({
      success: true,
      data: [{
        id: '1',
        username: adminUser.username,
        role: adminUser.role,
        status: 'active'
      }]
    });
  });

  // 创建用户 (仅管理员)
  fastify.post<{ Body: CreateUserDto }>('/users', async (request: FastifyRequest<{ Body: CreateUserDto }>, reply: FastifyReply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    const { username, password, email, role = 'user' } = request.body;
    
    if (!username || !password) {
      return reply.status(400).send({ success: false, error: '用户名和密码必填' });
    }
    
    // 密码哈希
    const passwordHash = await bcrypt.hash(password, 10);
    
    // TODO: 保存到数据库
    
    return reply.status(201).send({
      success: true,
      data: { id: 'new-user-id', username, role },
      message: '用户创建成功'
    });
  });

  // 更新用户 (仅管理员)
  fastify.put<{ Params: { id: string }; Body: UpdateUserDto }>('/users/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateUserDto }>, reply: FastifyReply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    const { id } = request.params;
    const { email, role, status } = request.body;
    
    // TODO: 更新数据库
    
    return reply.send({
      success: true,
      data: { id, email, role, status },
      message: '用户更新成功'
    });
  });

  // 删除用户 (仅管理员)
  fastify.delete('/users/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    const { id } = request.params;
    
    // TODO: 从数据库删除
    
    return reply.send({
      success: true,
      message: '用户已删除'
    });
  });
}
