/**
 * 用户管理 Express API
 * 提供用户的增删改查功能
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());

// 模拟数据库 - 用户数据
const users = [
  { id: 1, name: '张三', email: 'zhangsan@example.com', age: 28 },
  { id: 2, name: '李四', email: 'lisi@example.com', age: 32 },
  { id: 3, name: '王五', email: 'wangwu@example.com', age: 25 }
];

let nextId = 4;

// 工具函数：生成响应
const resSuccess = (data, message = 'success') => ({
  success: true,
  message,
  data
});

const resError = (message = 'error', statusCode = 400) => ({
  success: false,
  message,
  statusCode
});

// ============ API 路由 ============

// 1. 获取所有用户
app.get('/api/users', (req, res) => {
  res.json(resSuccess(users));
});

// 2. 获取单个用户
app.get('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(u => u.id === id);
  
  if (!user) {
    return res.status(404).json(resError('用户不存在', 404));
  }
  
  res.json(resSuccess(user));
});

// 3. 创建用户
app.post('/api/users', (req, res) => {
  const { name, email, age } = req.body;
  
  // 验证必填字段
  if (!name || !email) {
    return res.status(400).json(resError('姓名和邮箱为必填项', 400));
  }
  
  // 检查邮箱是否已存在
  if (users.some(u => u.email === email)) {
    return res.status(400).json(resError('邮箱已被使用', 400));
  }
  
  const newUser = {
    id: nextId++,
    name,
    email,
    age: age || 18
  };
  
  users.push(newUser);
  res.status(201).json(resSuccess(newUser, '用户创建成功'));
});

// 4. 更新用户
app.put('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json(resError('用户不存在', 404));
  }
  
  const { name, email, age } = req.body;
  
  // 检查邮箱是否被其他用户使用
  if (email && users.some(u => u.email === email && u.id !== id)) {
    return res.status(400).json(resError('邮箱已被其他用户使用', 400));
  }
  
  users[userIndex] = {
    ...users[userIndex],
    name: name || users[userIndex].name,
    email: email || users[userIndex].email,
    age: age || users[userIndex].age
  };
  
  res.json(resSuccess(users[userIndex], '用户更新成功'));
});

// 5. 删除用户
app.delete('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json(resError('用户不存在', 404));
  }
  
  const deletedUser = users.splice(userIndex, 1)[0];
  res.json(resSuccess(deletedUser, '用户删除成功'));
});

// 6. 模糊搜索用户
app.get('/api/users/search', (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.json(resSuccess(users));
  }
  
  const keyword = q.toLowerCase();
  const results = users.filter(u => 
    u.name.toLowerCase().includes(keyword) || 
    u.email.toLowerCase().includes(keyword)
  );
  
  res.json(resSuccess(results));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`用户管理 API 服务器运行在 http://localhost:${PORT}`);
  console.log('可用端点:');
  console.log('  GET    /api/users        - 获取所有用户');
  console.log('  GET    /api/users/:id    - 获取单个用户');
  console.log('  POST   /api/users        - 创建用户');
  console.log('  PUT    /api/users/:id    - 更新用户');
  console.log('  DELETE /api/users/:id    - 删除用户');
  console.log('  GET    /api/users/search - 搜索用户');
});

module.exports = app;
