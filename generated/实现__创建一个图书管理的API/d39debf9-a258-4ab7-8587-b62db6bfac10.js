/**
 * 图书管理 API
 * 基于 Express.js 的 RESTful API
 * 
 * 功能：
 * - GET /api/books - 获取所有图书
 * - GET /api/books/:id - 获取单个图书
 * - POST /api/books - 创建新图书
 * - PUT /api/books/:id - 更新图书
 * - DELETE /api/books/:id - 删除图书
 */

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 模拟数据库 - 内存存储
let books = [
  { id: 1, title: 'JavaScript高级程序设计', author: 'Nicholas C. Zakas', category: '编程', year: 2020, available: true },
  { id: 2, title: 'Python编程从入门到实践', author: 'Eric Matthes', category: '编程', year: 2019, available: true },
  { id: 3, title: '数据结构与算法', author: '王争', category: '计算机基础', year: 2021, available: false },
  { id: 4, title: '深入理解计算机系统', author: 'Randal E. Bryant', category: '计算机基础', year: 2018, available: true },
  { id: 5, title: '红楼梦', author: '曹雪芹', category: '文学', year: 2005, available: true }
];

let nextId = 6;

// 工具函数：生成响应
const successResponse = (data, message = 'success') => ({
  success: true,
  message,
  data
});

const errorResponse = (message, status = 400) => ({
  success: false,
  message,
  status
});

// ============ 路由 ============

// GET /api/books - 获取所有图书（支持筛选）
app.get('/api/books', (req, res) => {
  const { category, author, available, search } = req.query;
  
  let filteredBooks = [...books];
  
  // 按分类筛选
  if (category) {
    filteredBooks = filteredBooks.filter(book => 
      book.category.toLowerCase().includes(category.toLowerCase())
    );
  }
  
  // 按作者筛选
  if (author) {
    filteredBooks = filteredBooks.filter(book => 
      book.author.toLowerCase().includes(author.toLowerCase())
    );
  }
  
  // 按可用性筛选
  if (available !== undefined) {
    const isAvailable = available === 'true';
    filteredBooks = filteredBooks.filter(book => book.available === isAvailable);
  }
  
  // 搜索（标题或作者）
  if (search) {
    const searchLower = search.toLowerCase();
    filteredBooks = filteredBooks.filter(book => 
      book.title.toLowerCase().includes(searchLower) ||
      book.author.toLowerCase().includes(searchLower)
    );
  }
  
  res.json(successResponse(filteredBooks, `获取到 ${filteredBooks.length} 本图书`));
});

// GET /api/books/:id - 获取单个图书
app.get('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const book = books.find(b => b.id === id);
  
  if (!book) {
    return res.status(404).json(errorResponse('图书不存在', 404));
  }
  
  res.json(successResponse(book));
});

// POST /api/books - 创建新图书
app.post('/api/books', (req, res) => {
  const { title, author, category, year, available } = req.body;
  
  // 验证必填字段
  if (!title || !author) {
    return res.status(400).json(errorResponse('标题和作者为必填字段'));
  }
  
  // 验证数据类型
  if (year && typeof year !== 'number') {
    return res.status(400).json(errorResponse('出版年份必须是数字'));
  }
  
  const newBook = {
    id: nextId++,
    title: title.trim(),
    author: author.trim(),
    category: category?.trim() || '未分类',
    year: year || new Date().getFullYear(),
    available: available !== undefined ? Boolean(available) : true
  };
  
  books.push(newBook);
  
  res.status(201).json(successResponse(newBook, '图书创建成功'));
});

// PUT /api/books/:id - 更新图书
app.put('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const bookIndex = books.findIndex(b => b.id === id);
  
  if (bookIndex === -1) {
    return res.status(404).json(errorResponse('图书不存在', 404));
  }
  
  const { title, author, category, year, available } = req.body;
  
  // 验证数据类型
  if (year && typeof year !== 'number') {
    return res.status(400).json(errorResponse('出版年份必须是数字'));
  }
  
  // 更新图书信息
  books[bookIndex] = {
    ...books[bookIndex],
    title: title?.trim() || books[bookIndex].title,
    author: author?.trim() || books[bookIndex].author,
    category: category?.trim() || books[bookIndex].category,
    year: year || books[bookIndex].year,
    available: available !== undefined ? Boolean(available) : books[bookIndex].available
  };
  
  res.json(successResponse(books[bookIndex], '图书更新成功'));
});

// DELETE /api/books/:id - 删除图书
app.delete('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const bookIndex = books.findIndex(b => b.id === id);
  
  if (bookIndex === -1) {
    return res.status(404).json(errorResponse('图书不存在', 404));
  }
  
  const deletedBook = books.splice(bookIndex, 1)[0];
  
  res.json(successResponse(deletedBook, '图书删除成功'));
});

// GET /api/books/stats - 获取统计信息
app.get('/api/books/stats', (req, res) => {
  const stats = {
    total: books.length,
    available: books.filter(b => b.available).length,
    borrowed: books.filter(b => !b.available).length,
    categories: [...new Set(books.map(b => b.category))],
    authors: [...new Set(books.map(b => b.author))]
  };
  
  res.json(successResponse(stats));
});

// 404 处理
app.use((req, res) => {
  res.status(404).json(errorResponse('接口不存在', 404));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json(errorResponse('服务器内部错误', 500));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`📚 图书管理 API 已启动: http://localhost:${PORT}`);
  console.log(`可用端点:`);
  console.log(`  GET    /api/books        - 获取所有图书`);
  console.log(`  GET    /api/books/:id    - 获取单个图书`);
  console.log(`  POST   /api/books        - 创建图书`);
  console.log(`  PUT    /api/books/:id    - 更新图书`);
  console.log(`  DELETE /api/books/:id    - 删除图书`);
  console.log(`  GET    /api/books/stats   - 获取统计信息`);
});

module.exports = app;
