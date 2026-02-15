/**
 * 用户管理 Express API
 * 功能：用户注册、登录、CRUD操作、JWT认证
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// ============ 模拟数据库 (生产环境请使用真实数据库) ============
const users = new Map();

// JWT密钥 (生产环境应使用环境变量)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

// ============ 中间件 ============

// JWT认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '访问令牌 required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '无效的令牌' });
    }
    req.user = user;
    next();
  });
};

// ============ 工具函数 ============

// 生成Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// 验证邮箱格式
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ============ API路由 ============

/**
 * POST /api/users/register - 用户注册
 * 请求体: { username, email, password }
 */
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码为必填项' });
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: '邮箱格式无效' });
    }

    // 验证密码强度
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    // 检查用户是否已存在
    for (const user of users.values()) {
      if (user.username === username) {
        return res.status(409).json({ error: '用户名已存在' });
      }
      if (user.email === email) {
        return res.status(409).json({ error: '邮箱已被注册' });
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.set(user.id, user);

    // 生成Token
    const token = generateToken(user);

    // 返回用户信息（不含密码）
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
      message: '用户注册成功',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/users/login - 用户登录
 * 请求体: { email, password }
 */
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 验证必填字段
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码为必填项' });
    }

    // 查找用户
    let foundUser = null;
    for (const user of users.values()) {
      if (user.email === email) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, foundUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 生成Token
    const token = generateToken(foundUser);

    // 返回用户信息（不含密码）
    const { password: _, ...userWithoutPassword } = foundUser;
    res.json({
      message: '登录成功',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/users - 获取所有用户（需认证）
 */
app.get('/api/users', authenticateToken, (req, res) => {
  try {
    const userList = Array.from(users.values()).map(({ password, ...user }) => user);
    res.json({ users: userList, total: userList.length });
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/users/:id - 获取指定用户（需认证）
 */
app.get('/api/users/:id', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * PUT /api/users/:id - 更新用户信息（需认证）
 * 请求体: { username?, email?, password? }
 */
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password } = req.body;

    const user = users.get(id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 检查权限（只能修改自己的信息）
    if (req.user.id !== id) {
      return res.status(403).json({ error: '无权限修改此用户信息' });
    }

    // 检查用户名是否已存在
    if (username && username !== user.username) {
      for (const u of users.values()) {
        if (u.username === username && u.id !== id) {
          return res.status(409).json({ error: '用户名已存在' });
        }
      }
    }

    // 检查邮箱是否已存在
    if (email && email !== user.email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: '邮箱格式无效' });
      }
      for (const u of users.values()) {
        if (u.email === email && u.id !== id) {
          return res.status(409).json({ error: '邮箱已被注册' });
        }
      }
    }

    // 更新用户信息
    const updatedUser = {
      ...user,
      username: username || user.username,
      email: email || user.email,
      password: password ? await bcrypt.hash(password, 10) : user.password,
      updatedAt: new Date().toISOString()
    };

    users.set(id, updatedUser);

    // 返回更新后的用户信息（不含密码）
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json({
      message: '用户信息更新成功',
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * DELETE /api/users/:id - 删除用户（需认证）
 */
app.delete('/api/users/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const user = users.get(id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 检查权限（只能删除自己的账号）
    if (req.user.id !== id) {
      return res.status(403).json({ error: '无权限删除此用户' });
    }

    users.delete(id);
    res.json({ message: '用户删除成功' });
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/users/me - 获取当前登录用户信息
 */
app.get('/api/users/me', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ============ 健康检查 ============
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ 启动服务器 ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`用户管理API服务已启动，端口: ${PORT}`);
});

module.exports = app;
