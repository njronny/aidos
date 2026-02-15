/**
 * 商品管理API
 * 基于Express的RESTful API
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// ============ 数据存储（内存） ============
let products = [
  {
    id: '1',
    name: 'iPhone 15 Pro',
    price: 999.99,
    category: '电子产品',
    description: 'Apple iPhone 15 Pro 256GB',
    stock: 50,
    image: 'https://example.com/iphone15.jpg',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    name: 'MacBook Pro 14',
    price: 1999.99,
    category: '电子产品',
    description: 'Apple MacBook Pro 14英寸 M3芯片',
    stock: 30,
    image: 'https://example.com/macbook.jpg',
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z'
  },
  {
    id: '3',
    name: 'AirPods Pro',
    price: 249.99,
    category: '音频设备',
    description: 'Apple AirPods Pro 第二代',
    stock: 100,
    image: 'https://example.com/airpods.jpg',
    createdAt: '2024-01-17T10:00:00Z',
    updatedAt: '2024-01-17T10:00:00Z'
  }
];

// ============ 工具函数 ============
const findProductById = (id) => products.find(p => p.id === id);

const validateProduct = (data) => {
  const errors = [];
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('商品名称不能为空');
  }
  
  if (data.price === undefined || typeof data.price !== 'number' || data.price < 0) {
    errors.push('商品价格必须是大于等于0的数字');
  }
  
  if (!data.category || typeof data.category !== 'string') {
    errors.push('商品分类不能为空');
  }
  
  if (data.stock !== undefined && (typeof data.stock !== 'number' || data.stock < 0 || !Number.isInteger(data.stock))) {
    errors.push('商品库存必须是大于等于0的整数');
  }
  
  return errors;
};

// ============ 路由 ============

// 获取所有商品（支持分页和筛选）
app.get('/api/products', (req, res) => {
  try {
    const { page = 1, limit = 10, category, keyword, minPrice, maxPrice } = req.query;
    
    let filteredProducts = [...products];
    
    // 按分类筛选
    if (category) {
      filteredProducts = filteredProducts.filter(p => p.category === category);
    }
    
    // 按关键词搜索（名称或描述）
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(lowerKeyword) || 
        (p.description && p.description.toLowerCase().includes(lowerKeyword))
      );
    }
    
    // 按价格范围筛选
    if (minPrice) {
      filteredProducts = filteredProducts.filter(p => p.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      filteredProducts = filteredProducts.filter(p => p.price <= parseFloat(maxPrice));
    }
    
    // 分页
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredProducts.length,
        totalPages: Math.ceil(filteredProducts.length / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 获取单个商品
app.get('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const product = findProductById(id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }
    
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 创建商品
app.post('/api/products', (req, res) => {
  try {
    const errors = validateProduct(req.body);
    
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: '验证失败', errors });
    }
    
    const now = new Date().toISOString();
    const newProduct = {
      id: uuidv4(),
      name: req.body.name.trim(),
      price: parseFloat(req.body.price),
      category: req.body.category,
      description: req.body.description || '',
      stock: req.body.stock !== undefined ? parseInt(req.body.stock) : 0,
      image: req.body.image || '',
      createdAt: now,
      updatedAt: now
    };
    
    products.push(newProduct);
    
    res.status(201).json({
      success: true,
      message: '商品创建成功',
      data: newProduct
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 更新商品
app.put('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const productIndex = products.findIndex(p => p.id === id);
    
    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }
    
    // 验证数据
    const updateData = { ...req.body };
    const errors = validateProduct({ ...products[productIndex], ...updateData });
    
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: '验证失败', errors });
    }
    
    const updatedProduct = {
      ...products[productIndex],
      name: updateData.name ? updateData.name.trim() : products[productIndex].name,
      price: updateData.price !== undefined ? parseFloat(updateData.price) : products[productIndex].price,
      category: updateData.category || products[productIndex].category,
      description: updateData.description !== undefined ? updateData.description : products[productIndex].description,
      stock: updateData.stock !== undefined ? parseInt(updateData.stock) : products[productIndex].stock,
      image: updateData.image !== undefined ? updateData.image : products[productIndex].image,
      updatedAt: new Date().toISOString()
    };
    
    products[productIndex] = updatedProduct;
    
    res.json({
      success: true,
      message: '商品更新成功',
      data: updatedProduct
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 删除商品
app.delete('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const productIndex = products.findIndex(p => p.id === id);
    
    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }
    
    const deletedProduct = products.splice(productIndex, 1)[0];
    
    res.json({
      success: true,
      message: '商品删除成功',
      data: deletedProduct
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 获取商品分类列表
app.get('/api/products/categories/list', (req, res) => {
  try {
    const categories = [...new Set(products.map(p => p.category))];
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 批量更新商品库存
app.patch('/api/products/batch/stock', (req, res) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: '请求数据格式错误' });
    }
    
    const results = [];
    
    items.forEach(item => {
      const { id, stock } = item;
      const productIndex = products.findIndex(p => p.id === id);
      
      if (productIndex === -1) {
        results.push({ id, success: false, message: '商品不存在' });
      } else if (typeof stock !== 'number' || stock < 0) {
        results.push({ id, success: false, message: '库存值无效' });
      } else {
        products[productIndex].stock = stock;
        products[productIndex].updatedAt = new Date().toISOString();
        results.push({ id, success: true, stock: products[productIndex].stock });
      }
    });
    
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// ============ 错误处理中间件 ============
app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// ============ 启动服务器 ============
app.listen(PORT, () => {
  console.log(`商品管理API服务已启动，端口: ${PORT}`);
  console.log(`可用端点:`);
  console.log(`  GET    /api/products              - 获取商品列表（支持分页和筛选）`);
  console.log(`  GET    /api/products/:id          - 获取单个商品`);
  console.log(`  POST   /api/products              - 创建商品`);
  console.log(`  PUT    /api/products/:id          - 更新商品`);
  console.log(`  DELETE /api/products/:id          - 删除商品`);
  console.log(`  GET    /api/products/categories/list - 获取分类列表`);
  console.log(`  PATCH  /api/products/batch/stock  - 批量更新库存`);
});

module.exports = app;
