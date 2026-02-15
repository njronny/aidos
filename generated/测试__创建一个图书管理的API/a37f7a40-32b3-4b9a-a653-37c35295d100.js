/**
 * 图书管理 API
 * 
 * 功能：
 * - 获取所有图书
 * - 根据ID获取图书
 * - 创建新图书
 * - 更新图书信息
 * - 删除图书
 * - 搜索图书
 */

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 模拟数据库 - 图书数据
let books = [
  { id: 1, title: 'JavaScript高级程序设计', author: 'Nicholas C. Zakas', category: '编程', price: 89.00, stock: 10, publishYear: 2020 },
  { id: 2, title: 'Python编程：从入门到实践', author: 'Eric Matthes', category: '编程', price: 79.00, stock: 15, publishYear: 2019 },
  { id: 3, title: '数据结构与算法', author: '王争', category: '计算机基础', price: 99.00, stock: 8, publishYear: 2021 },
  { id: 4, title: '算法导论', author: 'Thomas H. Cormen', category: '计算机基础', price: 128.00, stock: 5, publishYear: 2018 },
  { id: 5, title: '深入理解计算机系统', author: 'Randal E. Bryant', category: '计算机基础', price: 139.00, stock: 6, publishYear: 2015 }
];

let nextId = 6;

// ============ 路由 ============

// 获取所有图书 / 搜索图书
app.get('/api/books', (req, res) => {
  const { search, category, author, minPrice, maxPrice } = req.query;
  let result = [...books];

  // 搜索过滤
  if (search) {
    const keyword = search.toLowerCase();
    result = result.filter(book => 
      book.title.toLowerCase().includes(keyword) ||
      book.author.toLowerCase().includes(keyword)
    );
  }

  // 分类过滤
  if (category) {
    result = result.filter(book => book.category === category);
  }

  // 作者过滤
  if (author) {
    result = result.filter(book => book.author.includes(author));
  }

  // 价格范围过滤
  if (minPrice) {
    result = result.filter(book => book.price >= parseFloat(minPrice));
  }
  if (maxPrice) {
    result = result.filter(book => book.price <= parseFloat(maxPrice));
  }

  res.json({
    success: true,
    total: result.length,
    data: result
  });
});

// 获取图书分类列表
app.get('/api/books/categories', (req, res) => {
  const categories = [...new Set(books.map(book => book.category))];
  res.json({
    success: true,
    data: categories
  });
});

// 根据ID获取图书
app.get('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const book = books.find(b => b.id === id);

  if (!book) {
    return res.status(404).json({
      success: false,
      message: '图书未找到'
    });
  }

  res.json({
    success: true,
    data: book
  });
});

// 创建新图书
app.post('/api/books', (req, res) => {
  const { title, author, category, price, stock, publishYear } = req.body;

  // 验证必填字段
  if (!title || !author || !category) {
    return res.status(400).json({
      success: false,
      message: '请填写图书标题、作者和分类'
    });
  }

  // 验证价格
  if (price !== undefined && (isNaN(price) || price < 0)) {
    return res.status(400).json({
      success: false,
      message: '价格必须是正数'
    });
  }

  // 验证库存
  if (stock !== undefined && (isNaN(stock) || stock < 0 || !Number.isInteger(stock))) {
    return res.status(400).json({
      success: false,
      message: '库存必须是正整数'
    });
  }

  const newBook = {
    id: nextId++,
    title,
    author,
    category,
    price: price || 0,
    stock: stock || 0,
    publishYear: publishYear || new Date().getFullYear()
  };

  books.push(newBook);

  res.status(201).json({
    success: true,
    message: '图书创建成功',
    data: newBook
  });
});

// 更新图书信息
app.put('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const bookIndex = books.findIndex(b => b.id === id);

  if (bookIndex === -1) {
    return res.status(404).json({
      success: false,
      message: '图书未找到'
    });
  }

  const { title, author, category, price, stock, publishYear } = req.body;

  // 验证价格
  if (price !== undefined && (isNaN(price) || price < 0)) {
    return res.status(400).json({
      success: false,
      message: '价格必须是正数'
    });
  }

  // 验证库存
  if (stock !== undefined && (isNaN(stock) || stock < 0 || !Number.isInteger(stock))) {
    return res.status(400).json({
      success: false,
      message: '库存必须是正整数'
    });
  }

  // 更新图书信息
  books[bookIndex] = {
    ...books[bookIndex],
    title: title || books[bookIndex].title,
    author: author || books[bookIndex].author,
    category: category || books[bookIndex].category,
    price: price !== undefined ? price : books[bookIndex].price,
    stock: stock !== undefined ? stock : books[bookIndex].stock,
    publishYear: publishYear || books[bookIndex].publishYear
  };

  res.json({
    success: true,
    message: '图书更新成功',
    data: books[bookIndex]
  });
});

// 部分更新图书
app.patch('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const bookIndex = books.findIndex(b => b.id === id);

  if (bookIndex === -1) {
    return res.status(404).json({
      success: false,
      message: '图书未找到'
    });
  }

  const updates = req.body;

  // 验证价格
  if (updates.price !== undefined && (isNaN(updates.price) || updates.price < 0)) {
    return res.status(400).json({
      success: false,
      message: '价格必须是正数'
    });
  }

  // 验证库存
  if (updates.stock !== undefined && (isNaN(updates.stock) || updates.stock < 0 || !Number.isInteger(updates.stock))) {
    return res.status(400).json({
      success: false,
      message: '库存必须是正整数'
    });
  }

  // 应用部分更新
  books[bookIndex] = { ...books[bookIndex], ...updates };

  res.json({
    success: true,
    message: '图书更新成功',
    data: books[bookIndex]
  });
});

// 删除图书
app.delete('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const bookIndex = books.findIndex(b => b.id === id);

  if (bookIndex === -1) {
    return res.status(404).json({
      success: false,
      message: '图书未找到'
    });
  }

  const deletedBook = books.splice(bookIndex, 1)[0];

  res.json({
    success: true,
    message: '图书删除成功',
    data: deletedBook
  });
});

// 批量删除图书
app.post('/api/books/batch-delete', (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供要删除的图书ID数组'
    });
  }

  const idSet = new Set(ids.map(id => parseInt(id)));
  const initialLength = books.length;
  books = books.filter(book => !idSet.has(book.id));
  const deletedCount = initialLength - books.length;

  res.json({
    success: true,
    message: `成功删除 ${deletedCount} 本图书`,
    data: { deletedCount }
  });
});

// 获取图书统计信息
app.get('/api/books/stats/summary', (req, res) => {
  const totalBooks = books.length;
  const totalValue = books.reduce((sum, book) => sum + (book.price * book.stock), 0);
  const totalStock = books.reduce((sum, book) => sum + book.stock, 0);
  const categoryCount = new Set(books.map(book => book.category)).size;
  const lowStockBooks = books.filter(book => book.stock < 5);

  res.json({
    success: true,
    data: {
      totalBooks,
      totalValue: totalValue.toFixed(2),
      totalStock,
      categoryCount,
      lowStockCount: lowStockBooks.length,
      lowStockBooks: lowStockBooks.map(b => ({ id: b.id, title: b.title, stock: b.stock }))
    }
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

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的路由不存在'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`📚 图书管理API服务器运行在 http://localhost:${PORT}`);
  console.log(`可用端点:`);
  console.log(`  GET    /api/books              - 获取所有图书/搜索`);
  console.log(`  GET    /api/books/:id          - 获取单个图书`);
  console.log(`  GET    /api/books/categories   - 获取分类列表`);
  console.log(`  GET    /api/books/stats/summary - 获取统计信息`);
  console.log(`  POST   /api/books              - 创建图书`);
  console.log(`  PUT    /api/books/:id          - 更新图书`);
  console.log(`  PATCH  /api/books/:id          - 部分更新图书`);
  console.log(`  DELETE /api/books/:id          - 删除图书`);
  console.log(`  POST   /api/books/batch-delete - 批量删除`);
});

module.exports = app;
