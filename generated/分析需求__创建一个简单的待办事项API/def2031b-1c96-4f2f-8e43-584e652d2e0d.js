/**
 * 待办事项 API
 * 一个简单的 Express RESTful API
 * 
 * Endpoints:
 * GET    /todos          - 获取所有待办事项
 * POST   /todos          - 创建新待办事项
 * PUT    /todos/:id      - 更新待办事项
 * DELETE /todos/:id      - 删除待办事项
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 内存存储（生产环境建议使用数据库）
let todos = [
  { id: '1', title: '学习 Node.js', completed: false, createdAt: new Date().toISOString() },
  { id: '2', title: '完成项目', completed: true, createdAt: new Date().toISOString() }
];

/**
 * GET /todos
 * 获取所有待办事项
 */
app.get('/todos', (req, res) => {
  res.json({
    success: true,
    data: todos,
    total: todos.length
  });
});

/**
 * GET /todos/:id
 * 获取单个待办事项
 */
app.get('/todos/:id', (req, res) => {
  const { id } = req.params;
  const todo = todos.find(t => t.id === id);
  
  if (!todo) {
    return res.status(404).json({
      success: false,
      message: '待办事项不存在'
    });
  }
  
  res.json({
    success: true,
    data: todo
  });
});

/**
 * POST /todos
 * 创建新待办事项
 */
app.post('/todos', (req, res) => {
  const { title, completed = false } = req.body;
  
  // 验证标题
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      success: false,
      message: '标题不能为空'
    });
  }
  
  const newTodo = {
    id: uuidv4(),
    title: title.trim(),
    completed,
    createdAt: new Date().toISOString()
  };
  
  todos.push(newTodo);
  
  res.status(201).json({
    success: true,
    message: '待办事项创建成功',
    data: newTodo
  });
});

/**
 * PUT /todos/:id
 * 更新待办事项
 */
app.put('/todos/:id', (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;
  
  const todoIndex = todos.findIndex(t => t.id === id);
  
  if (todoIndex === -1) {
    return res.status(404).json({
      success: false,
      message: '待办事项不存在'
    });
  }
  
  // 更新字段
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '标题不能为空'
      });
    }
    todos[todoIndex].title = title.trim();
  }
  
  if (completed !== undefined) {
    todos[todoIndex].completed = Boolean(completed);
  }
  
  todos[todoIndex].updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    message: '待办事项更新成功',
    data: todos[todoIndex]
  });
});

/**
 * DELETE /todos/:id
 * 删除待办事项
 */
app.delete('/todos/:id', (req, res) => {
  const { id } = req.params;
  const todoIndex = todos.findIndex(t => t.id === id);
  
  if (todoIndex === -1) {
    return res.status(404).json({
      success: false,
      message: '待办事项不存在'
    });
  }
  
  const deletedTodo = todos.splice(todoIndex, 1)[0];
  
  res.json({
    success: true,
    message: '待办事项删除成功',
    data: deletedTodo
  });
});

/**
 * PATCH /todos/:id/toggle
 * 切换待办事项完成状态
 */
app.patch('/todos/:id/toggle', (req, res) => {
  const { id } = req.params;
  const todo = todos.find(t => t.id === id);
  
  if (!todo) {
    return res.status(404).json({
      success: false,
      message: '待办事项不存在'
    });
  }
  
  todo.completed = !todo.completed;
  todo.updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    message: '状态切换成功',
    data: todo
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 待办事项 API 服务运行在 http://localhost:${PORT}`);
});

module.exports = app;
