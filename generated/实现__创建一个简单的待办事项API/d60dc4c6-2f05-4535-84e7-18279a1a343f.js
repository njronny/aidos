/**
 * 待办事项 API
 * 需求：创建一个简单的待办事项API
 * 实现：Express.js REST API
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 内存存储（生产环境应使用数据库）
let todos = [
  { id: '1', title: '学习 Node.js', completed: false, createdAt: new Date().toISOString() },
  { id: '2', title: '完成项目作业', completed: true, createdAt: new Date().toISOString() },
  { id: '3', title: '准备面试', completed: false, createdAt: new Date().toISOString() }
];

// 验证待办事项数据
function validateTodo(todo) {
  if (!todo.title || typeof todo.title !== 'string' || todo.title.trim() === '') {
    return { valid: false, error: '标题不能为空' };
  }
  if (todo.completed !== undefined && typeof todo.completed !== 'boolean') {
    return { valid: false, error: 'completed 必须是布尔值' };
  }
  return { valid: true };
}

// GET /todos - 获取所有待办事项
app.get('/todos', (req, res) => {
  const { completed } = req.query;
  
  let filteredTodos = todos;
  
  if (completed !== undefined) {
    const isCompleted = completed === 'true';
    filteredTodos = todos.filter(todo => todo.completed === isCompleted);
  }
  
  res.json({
    success: true,
    data: filteredTodos,
    total: filteredTodos.length
  });
});

// GET /todos/:id - 获取单个待办事项
app.get('/todos/:id', (req, res) => {
  const { id } = req.params;
  const todo = todos.find(t => t.id === id);
  
  if (!todo) {
    return res.status(404).json({
      success: false,
      error: '待办事项不存在'
    });
  }
  
  res.json({
    success: true,
    data: todo
  });
});

// POST /todos - 创建待办事项
app.post('/todos', (req, res) => {
  const { title, completed = false } = req.body;
  
  const validation = validateTodo({ title, completed });
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.error
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
    data: newTodo
  });
});

// PUT /todos/:id - 更新待办事项
app.put('/todos/:id', (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;
  
  const index = todos.findIndex(t => t.id === id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: '待办事项不存在'
    });
  }
  
  const updateData = {};
  if (title !== undefined) {
    const validation = validateTodo({ title, completed });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }
    updateData.title = title.trim();
  }
  if (completed !== undefined) {
    if (typeof completed !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'completed 必须是布尔值'
      });
    }
    updateData.completed = completed;
  }
  
  const updatedTodo = {
    ...todos[index],
    ...updateData,
    updatedAt: new Date().toISOString()
  };
  
  todos[index] = updatedTodo;
  
  res.json({
    success: true,
    data: updatedTodo
  });
});

// PATCH /todos/:id/toggle - 切换完成状态
app.patch('/todos/:id/toggle', (req, res) => {
  const { id } = req.params;
  
  const index = todos.findIndex(t => t.id === id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: '待办事项不存在'
    });
  }
  
  todos[index].completed = !todos[index].completed;
  todos[index].updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    data: todos[index]
  });
});

// DELETE /todos/:id - 删除待办事项
app.delete('/todos/:id', (req, res) => {
  const { id } = req.params;
  const index = todos.findIndex(t => t.id === id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: '待办事项不存在'
    });
  }
  
  const deletedTodo = todos.splice(index, 1)[0];
  
  res.json({
    success: true,
    data: deletedTodo,
    message: '待办事项已删除'
  });
});

// DELETE /todos - 清空所有待办事项
app.delete('/todos', (req, res) => {
  const { confirm } = req.query;
  
  if (confirm !== 'true') {
    return res.status(400).json({
      success: false,
      error: '请添加 ?confirm=true 参数确认删除所有待办事项'
    });
  }
  
  const count = todos.length;
  todos = [];
  
  res.json({
    success: true,
    message: `已删除 ${count} 个待办事项`
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

// 启动服务器
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ 待办事项 API 服务运行在 http://localhost:${PORT}`);
    console.log(`📋 可用的 API 端点:`);
    console.log(`   GET    /todos              - 获取所有待办事项`);
    console.log(`   GET    /todos/:id          - 获取单个待办事项`);
    console.log(`   POST   /todos              - 创建待办事项`);
    console.log(`   PUT    /todos/:id          - 更新待办事项`);
    console.log(`   PATCH  /todos/:id/toggle   - 切换完成状态`);
    console.log(`   DELETE /todos/:id          - 删除待办事项`);
  });
}

module.exports = app;
