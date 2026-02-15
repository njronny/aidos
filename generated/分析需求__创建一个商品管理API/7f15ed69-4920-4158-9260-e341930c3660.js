/**
 * 商品管理API
 * 基于Express.js的商品CRUD REST API
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());

// ===== 模拟数据库 =====
let products = [
  { id: 1, name: 'iPhone 15', price: 6999, category: '电子产品', stock: 100 },
  { id: 2, name: 'MacBook Pro', price: 12999, category: '电子产品', stock: 50 },
  { id: 3, name: 'AirPods Pro', price: 1999, category: '音频设备', stock: 200 },
];

let nextId = 4;

// ===== 工具函数 =====
const generateId = () => nextId++;

// ===== API路由 =====

/**
 * GET /api/products - 获取所有商品
 * 支持查询参数: category(分类筛选), search(搜索名称)
 */
app.get('/api/products', (req, res) => {
  const { category, search } = req.query;
  let result = [...products];

  if (category) {
    result = result.filter(p => p.category === category);
  }
  if (search) {
    result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }

  res.json({
    success: true,
    data: result,
    total: result.length
  });
});

/**
 * GET /api/products/:id - 获取单个商品
 */
app.get('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ success: false, message: '商品不存在' });
  }

  res.json({ success: true, data: product });
});

/**
 * POST /api/products - 创建商品
 */
app.post('/api/products', (req, res) => {
  const { name, price, category, stock } = req.body;

  // 验证必填字段
  if (!name || price === undefined) {
    return res.status(400).json({
      success: false,
      message: '商品名称和价格是必填项'
    });
  }

  // 验证数据类型
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({
      success: false,
      message: '价格必须是正数'
    });
  }

  const newProduct = {
    id: generateId(),
    name,
    price,
    category: category || '未分类',
    stock: stock !== undefined ? stock : 0
  };

  products.push(newProduct);

  res.status(201).json({
    success: true,
    message: '商品创建成功',
    data: newProduct
  });
});

/**
 * PUT /api/products/:id - 更新商品
 */
app.put('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = products.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: '商品不存在' });
  }

  const { name, price, category, stock } = req.body;

  // 更新字段
  if (name) products[index].name = name;
  if (price !== undefined) {
    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ success: false, message: '价格必须是正数' });
    }
    products[index].price = price;
  }
  if (category) products[index].category = category;
  if (stock !== undefined) products[index].stock = stock;

  res.json({
    success: true,
    message: '商品更新成功',
    data: products[index]
  });
});

/**
 * DELETE /api/products/:id - 删除商品
 */
app.delete('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = products.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: '商品不存在' });
  }

  const deleted = products.splice(index, 1)[0];

  res.json({
    success: true,
    message: '商品删除成功',
    data: deleted
  });
});

/**
 * PATCH /api/products/:id/stock - 更新库存
 */
app.patch('/api/products/:id/stock', (req, res) => {
  const id = parseInt(req.params.id);
  const { quantity } = req.body;
  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ success: false, message: '商品不存在' });
  }

  if (typeof quantity !== 'number') {
    return res.status(400).json({ success: false, message: '数量必须是数字' });
  }

  product.stock = Math.max(0, product.stock + quantity);

  res.json({
    success: true,
    message: quantity > 0 ? '库存增加' : '库存减少',
    data: product
  });
});

// ===== 错误处理中间件 =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// ===== 启动服务器 =====
app.listen(PORT, () => {
  console.log(`商品管理API服务已启动: http://localhost:${PORT}`);
});

module.exports = app;
