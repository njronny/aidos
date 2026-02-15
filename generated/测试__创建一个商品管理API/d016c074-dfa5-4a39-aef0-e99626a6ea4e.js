/**
 * 商品管理 API
 * 基于 Express.js 的 RESTful API
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());

// 内存存储的商品数据
let products = [
  { id: 1, name: 'iPhone 15', price: 6999, category: '电子产品', stock: 100 },
  { id: 2, name: 'MacBook Pro', price: 12999, category: '电子产品', stock: 50 },
  { id: 3, name: 'AirPods Pro', price: 1999, category: '音频设备', stock: 200 }
];

let nextId = 4;

/**
 * 获取所有商品
 * GET /api/products
 */
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    data: products,
    total: products.length
  });
});

/**
 * 获取单个商品
 * GET /api/products/:id
 */
app.get('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: '商品不存在'
    });
  }
  
  res.json({
    success: true,
    data: product
  });
});

/**
 * 创建商品
 * POST /api/products
 */
app.post('/api/products', (req, res) => {
  const { name, price, category, stock } = req.body;
  
  // 验证必填字段
  if (!name || price === undefined) {
    return res.status(400).json({
      success: false,
      message: '商品名称和价格是必填字段'
    });
  }
  
  const newProduct = {
    id: nextId++,
    name,
    price: parseFloat(price),
    category: category || '未分类',
    stock: parseInt(stock) || 0,
    createdAt: new Date().toISOString()
  };
  
  products.push(newProduct);
  
  res.status(201).json({
    success: true,
    message: '商品创建成功',
    data: newProduct
  });
});

/**
 * 更新商品
 * PUT /api/products/:id
 */
app.put('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = products.findIndex(p => p.id === id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: '商品不存在'
    });
  }
  
  const { name, price, category, stock } = req.body;
  
  products[index] = {
    ...products[index],
    name: name || products[index].name,
    price: price !== undefined ? parseFloat(price) : products[index].price,
    category: category || products[index].category,
    stock: stock !== undefined ? parseInt(stock) : products[index].stock,
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: '商品更新成功',
    data: products[index]
  });
});

/**
 * 删除商品
 * DELETE /api/products/:id
 */
app.delete('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = products.findIndex(p => p.id === id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: '商品不存在'
    });
  }
  
  const deletedProduct = products.splice(index, 1)[0];
  
  res.json({
    success: true,
    message: '商品删除成功',
    data: deletedProduct
  });
});

/**
 * 根据分类获取商品
 * GET /api/products/category/:category
 */
app.get('/api/products/category/:category', (req, res) => {
  const category = req.params.category;
  const filteredProducts = products.filter(p => p.category === category);
  
  res.json({
    success: true,
    data: filteredProducts,
    total: filteredProducts.length
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`商品管理 API 已启动，监听端口: ${PORT}`);
  console.log(`可用端点:`);
  console.log(`  GET    /api/products          - 获取所有商品`);
  console.log(`  GET    /api/products/:id      - 获取单个商品`);
  console.log(`  POST   /api/products          - 创建商品`);
  console.log(`  PUT    /api/products/:id      - 更新商品`);
  console.log(`  DELETE /api/products/:id      - 删除商品`);
  console.log(`  GET    /api/products/category/:category - 按分类获取商品`);
});

module.exports = app;
