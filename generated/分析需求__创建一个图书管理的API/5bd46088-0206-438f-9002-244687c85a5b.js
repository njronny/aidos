/**
 * 图书管理 API - Book Management API
 * 
 * 功能概述：
 * - 图书的增删改查 (CRUD)
 * - 按书名、作者、ISBN 搜索
 * - 分页查询
 * - 输入验证与错误处理
 * 
 * 技术栈：Express.js + 内存存储（可替换为数据库）
 */

const express = require('express');
const { randomUUID } = require('crypto');

const app = express();
app.use(express.json());

// ============================================================
// 数据层 - 内存存储（生产环境请替换为 MongoDB / PostgreSQL）
// ============================================================
const books = new Map();

// 预置示例数据
const seedData = [
  { title: '深入理解计算机系统', author: 'Randal E. Bryant', isbn: '978-7-111-54493-7', category: '计算机科学', price: 139.00, stock: 12 },
  { title: 'JavaScript高级程序设计', author: 'Matt Frisbie', isbn: '978-7-115-54508-4', category: '前端开发', price: 129.00, stock: 25 },
  { title: '设计模式：可复用面向对象软件的基础', author: 'Erich Gamma', isbn: '978-7-111-07511-4', category: '软件工程', price: 69.90, stock: 8 },
];

seedData.forEach(book => {
  const id = randomUUID();
  books.set(id, { id, ...book, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
});

// ============================================================
// 工具函数
// ============================================================

/** 验证图书字段 */
function validateBook(data, partial = false) {
  const errors = [];
  const requiredFields = ['title', 'author', 'isbn'];

  if (!partial) {
    requiredFields.forEach(field => {
      if (!data[field] || String(data[field]).trim() === '') {
        errors.push(`缺少必填字段: ${field}`);
      }
    });
  }

  if (data.title !== undefined && typeof data.title !== 'string') {
    errors.push('title 必须是字符串');
  }
  if (data.price !== undefined && (typeof data.price !== 'number' || data.price < 0)) {
    errors.push('price 必须是非负数');
  }
  if (data.stock !== undefined && (!Number.isInteger(data.stock) || data.stock < 0)) {
    errors.push('stock 必须是非负整数');
  }
  if (data.isbn !== undefined) {
    const isbnClean = String(data.isbn).replace(/[-\s]/g, '');
    if (!/^\d{10}(\d{3})?$/.test(isbnClean)) {
      errors.push('isbn 格式无效（应为 10 位或 13 位数字）');
    }
  }

  return errors;
}

/** 统一响应格式 */
function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function fail(res, message, statusCode = 400) {
  return res.status(statusCode).json({ success: false, error: message });
}

// ============================================================
// 路由
// ============================================================

/**
 * GET /api/books
 * 获取图书列表（支持分页和搜索）
 * 
 * Query 参数：
 *   page     - 页码（默认 1）
 *   limit    - 每页数量（默认 10，最大 100）
 *   search   - 搜索关键词（匹配 title / author / isbn）
 *   category - 按分类筛选
 *   sortBy   - 排序字段：title | price | createdAt（默认 createdAt）
 *   order    - 排序方向：asc | desc（默认 desc）
 */
app.get('/api/books', (req, res) => {
  let { page = 1, limit = 10, search, category, sortBy = 'createdAt', order = 'desc' } = req.query;

  page = Math.max(1, parseInt(page) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit) || 10));

  let result = Array.from(books.values());

  // 搜索过滤
  if (search) {
    const keyword = search.toLowerCase();
    result = result.filter(b =>
      b.title.toLowerCase().includes(keyword) ||
      b.author.toLowerCase().includes(keyword) ||
      b.isbn.includes(keyword)
    );
  }

  // 分类过滤
  if (category) {
    result = result.filter(b => b.category === category);
  }

  // 排序
  const allowedSortFields = ['title', 'price', 'createdAt', 'stock'];
  if (allowedSortFields.includes(sortBy)) {
    result.sort((a, b) => {
      const valA = a[sortBy], valB = b[sortBy];
      const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
      return order === 'asc' ? cmp : -cmp;
    });
  }

  // 分页
  const total = result.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const items = result.slice(offset, offset + limit);

  success(res, {
    items,
    pagination: { page, limit, total, totalPages },
  });
});

/**
 * GET /api/books/:id
 * 获取单本图书详情
 */
app.get('/api/books/:id', (req, res) => {
  const book = books.get(req.params.id);
  if (!book) return fail(res, '图书不存在', 404);
  success(res, book);
});

/**
 * POST /api/books
 * 新增图书
 */
app.post('/api/books', (req, res) => {
  const errors = validateBook(req.body);
  if (errors.length) return fail(res, errors);

  // ISBN 唯一性检查
  const duplicate = Array.from(books.values()).find(b => b.isbn === req.body.isbn);
  if (duplicate) return fail(res, `ISBN ${req.body.isbn} 已存在`, 409);

  const id = randomUUID();
  const now = new Date().toISOString();
  const book = {
    id,
    title: req.body.title.trim(),
    author: req.body.author.trim(),
    isbn: req.body.isbn.trim(),
    category: req.body.category || '未分类',
    price: req.body.price || 0,
    stock: req.body.stock || 0,
    description: req.body.description || '',
    createdAt: now,
    updatedAt: now,
  };

  books.set(id, book);
  success(res, book, 201);
});

/**
 * PUT /api/books/:id
 * 更新图书（全量更新）
 */
app.put('/api/books/:id', (req, res) => {
  const existing = books.get(req.params.id);
  if (!existing) return fail(res, '图书不存在', 404);

  const errors = validateBook(req.body);
  if (errors.length) return fail(res, errors);

  // ISBN 唯一性检查（排除自身）
  if (req.body.isbn !== existing.isbn) {
    const dup = Array.from(books.values()).find(b => b.isbn === req.body.isbn);
    if (dup) return fail(res, `ISBN ${req.body.isbn} 已存在`, 409);
  }

  const updated = {
    ...existing,
    title: req.body.title.trim(),
    author: req.body.author.trim(),
    isbn: req.body.isbn.trim(),
    category: req.body.category || existing.category,
    price: req.body.price ?? existing.price,
    stock: req.body.stock ?? existing.stock,
    description: req.body.description ?? existing.description,
    updatedAt: new Date().toISOString(),
  };

  books.set(req.params.id, updated);
  success(res, updated);
});

/**
 * PATCH /api/books/:id
 * 部分更新图书
 */
app.patch('/api/books/:id', (req, res) => {
  const existing = books.get(req.params.id);
  if (!existing) return fail(res, '图书不存在', 404);

  const errors = validateBook(req.body, true);
  if (errors.length) return fail(res, errors);

  if (req.body.isbn && req.body.isbn !== existing.isbn) {
    const dup = Array.from(books.values()).find(b => b.isbn === req.body.isbn);
    if (dup) return fail(res, `ISBN ${req.body.isbn} 已存在`, 409);
  }

  const updated = {
    ...existing,
    ...req.body,
    id: existing.id,               // 防止 id 被覆盖
    createdAt: existing.createdAt,  // 防止 createdAt 被覆盖
    updatedAt: new Date().toISOString(),
  };

  books.set(req.params.id, updated);
  success(res, updated);
});

/**
 * DELETE /api/books/:id
 * 删除图书
 */
app.delete('/api/books/:id', (req, res) => {
  if (!books.has(req.params.id)) return fail(res, '图书不存在', 404);
  const deleted = books.get(req.params.id);
  books.delete(req.params.id);
  success(res, { message: '删除成功', book: deleted });
});

/**
 * GET /api/books/stats/summary
 * 获取统计摘要
 */
app.get('/api/stats/summary', (_req, res) => {
  const all = Array.from(books.values());
  const totalBooks = all.length;
  const totalStock = all.reduce((sum, b) => sum + (b.stock || 0), 0);
  const categories = [...new Set(all.map(b => b.category))];
  const avgPrice = totalBooks ? (all.reduce((sum, b) => sum + (b.price || 0), 0) / totalBooks).toFixed(2) : 0;

  success(res, { totalBooks, totalStock, totalCategories: categories.length, categories, avgPrice: Number(avgPrice) });
});

// ============================================================
// 全局错误处理
// ============================================================
app.use((err, _req, res, _next) => {
  console.error('[Error]', err);
  fail(res, '服务器内部错误', 500);
});

// ============================================================
// 启动服务
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📚 图书管理 API 已启动: http://localhost:${PORT}`);
  console.log(`   GET    /api/books          - 图书列表（分页/搜索）`);
  console.log(`   GET    /api/books/:id      - 图书详情`);
  console.log(`   POST   /api/books          - 新增图书`);
  console.log(`   PUT    /api/books/:id      - 全量更新`);
  console.log(`   PATCH  /api/books/:id      - 部分更新`);
  console.log(`   DELETE /api/books/:id      - 删除图书`);
  console.log(`   GET    /api/stats/summary  - 统计摘要`);
});

module.exports = app;
