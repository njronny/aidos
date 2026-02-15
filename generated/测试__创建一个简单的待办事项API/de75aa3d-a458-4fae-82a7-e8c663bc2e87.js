const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());

// 内存存储的待办事项数组
let todos = [
  { id: 1, title: '学习 Node.js', completed: false },
  { id: 2, title: '完成项目', completed: true }
];
let nextId = 3;

// GET /todos - 获取所有待办事项
app.get('/todos', (req, res) => {
  res.json(todos);
});

// GET /todos/:id - 获取单个待办事项
app.get('/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const todo = todos.find(t => t.id === id);
  
  if (!todo) {
    return res.status(404).json({ error: '待办事项不存在' });
  }
  
  res.json(todo);
});

// POST /todos - 创建新待办事项
app.post('/todos', (req, res) => {
  const { title, completed = false } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: '标题不能为空' });
  }
  
  const newTodo = {
    id: nextId++,
    title,
    completed
  };
  
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

// PUT /todos/:id - 更新待办事项
app.put('/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const todo = todos.find(t => t.id === id);
  
  if (!todo) {
    return res.status(404).json({ error: '待办事项不存在' });
  }
  
  const { title, completed } = req.body;
  
  if (title !== undefined) todo.title = title;
  if (completed !== undefined) todo.completed = completed;
  
  res.json(todo);
});

// DELETE /todos/:id - 删除待办事项
app.delete('/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = todos.findIndex(t => t.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: '待办事项不存在' });
  }
  
  const deleted = todos.splice(index, 1)[0];
  res.json({ message: '删除成功', todo: deleted });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`待办事项 API 服务已启动，端口: ${PORT}`);
});

module.exports = app;
