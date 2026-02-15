/**
 * 简单计算器 API
 * 基于 Express.js
 * 支持加减乘除四种基本运算
 */

const express = require('express');
const app = express();

app.use(express.json());

// 验证数字参数
const validateNumbers = (a, b) => {
  if (typeof a !== 'number' || typeof b !== 'number') {
    return '参数必须是数字';
  }
  if (isNaN(a) || isNaN(b)) {
    return '参数不能是 NaN';
  }
  return null;
};

// 加法
app.post('/api/calculator/add', (req, res) => {
  const { a, b } = req.body;
  const error = validateNumbers(a, b);
  if (error) {
    return res.status(400).json({ error });
  }
  res.json({ result: a + b, operation: 'add' });
});

// 减法
app.post('/api/calculator/subtract', (req, res) => {
  const { a, b } = req.body;
  const error = validateNumbers(a, b);
  if (error) {
    return res.status(400).json({ error });
  }
  res.json({ result: a - b, operation: 'subtract' });
});

// 乘法
app.post('/api/calculator/multiply', (req, res) => {
  const { a, b } = req.body;
  const error = validateNumbers(a, b);
  if (error) {
    return res.status(400).json({ error });
  }
  res.json({ result: a * b, operation: 'multiply' });
});

// 除法
app.post('/api/calculator/divide', (req, res) => {
  const { a, b } = req.body;
  const error = validateNumbers(a, b);
  if (error) {
    return res.status(400).json({ error });
  }
  if (b === 0) {
    return res.status(400).json({ error: '除数不能为零' });
  }
  res.json({ result: a / b, operation: 'divide' });
});

// 通用计算接口
app.post('/api/calculator/calculate', (req, res) => {
  const { a, b, operation } = req.body;
  const error = validateNumbers(a, b);
  if (error) {
    return res.status(400).json({ error });
  }
  
  let result;
  switch (operation) {
    case 'add':
      result = a + b;
      break;
    case 'subtract':
      result = a - b;
      break;
    case 'multiply':
      result = a * b;
      break;
    case 'divide':
      if (b === 0) {
        return res.status(400).json({ error: '除数不能为零' });
      }
      result = a / b;
      break;
    default:
      return res.status(400).json({ error: '无效的操作类型' });
  }
  
  res.json({ result, operation });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

// 导出用于测试
module.exports = app;

// 如果直接运行则启动服务器
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`计算器API运行在端口 ${PORT}`);
  });
}
