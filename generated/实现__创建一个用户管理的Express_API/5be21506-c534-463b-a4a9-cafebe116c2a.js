/**
 * 用户管理 Express API
 * 
 * 功能：
 * - GET /api/users - 获取所有用户
 * - GET /api/users/:id - 获取单个用户
 * - POST /api/users - 创建新用户
 * - PUT /api/users/:id - 更新用户
 * - DELETE /api/users/:id - 删除用户
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 内存存储（生产环境建议使用数据库）
const users = new Map();

// 初始化一些示例数据
const sampleUsers = [
  { id: '1', name: '张三', email: 'zhangsan@example.com', role: 'admin', createdAt: new Date().toISOString() },
  { id: '2', name: '李四', email: 'lisi@example.com', role: 'user', createdAt: new Date().toISOString() },
  { id: '3', name: '王五', email: 'wangwu@example.com', role: 'user', createdAt: new Date().toISOString() }
];
sampleUsers.forEach(user => users.set(user.id, user));

// 工具函数：生成UUID
function generateId() {
  return crypto.randomUUID();
}

// 工具函数：验证邮箱格式
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 工具函数：验证用户数据
function validateUser(data, isUpdate = false) {
  const errors = [];
  
  if (!isUpdate) {
    if (!data.name || data.name.trim() === '') {
      errors.push('用户名不能为空');
    }
    if (!data.email || data.email.trim() === '') {
      errors.push('邮箱不能为空');
    } else if (!isValidEmail(data.email)) {
      errors.push('邮箱格式不正确');
    }
  } else {
    if (data.email !== undefined && data.email !== '' && !isValidEmail(data.email)) {
      errors.push('邮箱格式不正确');
    }
  }
  
  if (data.role && !['admin', 'user', 'guest'].includes(data.role)) {
    errors.push('角色必须是 admin、user 或 guest');
  }
  
  return errors;
}

// 统一响应格式
function successResponse(data, message = 'success') {
  return { success: true, message, data };
}

function errorResponse(message, errors = []) {
  return { success: false, message, errors };
}

// ============ API 路由 ============

// GET /api/users - 获取所有用户
app.get('/api/users', (req, res) => {
  const userList = Array.from(users.values());
  res.json(successResponse(userList));
});

// GET /api/users/:id - 获取单个用户
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const user = users.get(id);
  
  if (!user) {
    return res.status(404).json(errorResponse('用户不存在'));
  }
  
  res.json(successResponse(user));
});

// POST /api/users - 创建新用户
app.post('/api/users', (req, res) => {
  const { name, email, role = 'user' } = req.body;
  
  // 验证数据
  const errors = validateUser({ name, email, role });
  if (errors.length > 0) {
    return res.status(400).json(errorResponse('数据验证失败', errors));
  }
  
  // 检查邮箱是否已存在
  const existingUser = Array.from(users.values()).find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json(errorResponse('邮箱已被使用'));
  }
  
  // 创建用户
  const newUser = {
    id: generateId(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    createdAt: new Date().toISOString()
  };
  
  users.set(newUser.id, newUser);
  
  res.status(201).json(successResponse(newUser, '用户创建成功'));
});

// PUT /api/users/:id - 更新用户
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;
  
  // 检查用户是否存在
  const existingUser = users.get(id);
  if (!existingUser) {
    return res.status(404).json(errorResponse('用户不存在'));
  }
  
  // 验证数据
  const errors = validateUser({ name, email, role }, true);
  if (errors.length > 0) {
    return res.status(400).json(errorResponse('数据验证失败', errors));
  }
  
  // 检查邮箱是否已被其他用户使用
  if (email && email.trim() !== '') {
    const emailExists = Array.from(users.values()).find(
      u => u.email === email.trim().toLowerCase() && u.id !== id
    );
    if (emailExists) {
      return res.status(400).json(errorResponse('邮箱已被其他用户使用'));
    }
  }
  
  // 更新用户
  const updatedUser = {
    ...existingUser,
    name: name !== undefined ? name.trim() : existingUser.name,
    email: email !== undefined ? email.trim().toLowerCase() : existingUser.email,
    role: role !== undefined ? role : existingUser.role,
    updatedAt: new Date().toISOString()
  };
  
  users.set(id, updatedUser);
  
  res.json(successResponse(updatedUser, '用户更新成功'));
});

// DELETE /api/users/:id - 删除用户
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  
  // 检查用户是否存在
  const existingUser = users.get(id);
  if (!existingUser) {
    return res.status(404).json(errorResponse('用户不存在'));
  }
  
  users.delete(id);
  
  res.json(successResponse(null, '用户删除成功'));
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json(errorResponse('接口不存在'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json(errorResponse('服务器内部错误'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 用户管理 API 服务已启动: http://localhost:${PORT}`);
  console.log(`📋 可用接口:`);
  console.log(`   GET    /api/users        - 获取所有用户`);
  console.log(`   GET    /api/users/:id    - 获取单个用户`);
  console.log(`   POST   /api/users        - 创建用户`);
  console.log(`   PUT    /api/users/:id    - 更新用户`);
  console.log(`   DELETE /api/users/:id    - 删除用户`);
  console.log(`   GET    /health           - 健康检查`);
});

module.exports = app;
