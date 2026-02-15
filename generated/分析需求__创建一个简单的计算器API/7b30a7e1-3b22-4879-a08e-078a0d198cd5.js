/**
 * 简单计算器 API
 * 基于 Express 的计算器服务
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());

// 验证数字输入
const validateNumbers = (num1, num2) => {
  if (typeof num1 !== 'number' || typeof num2 !== 'number') {
    return '请提供有效的数字参数';
  }
  if (isNaN(num1) || isNaN(num2)) {
    return '参数不能为 NaN';
  }
  return null;
};

// 计算器类
class Calculator {
  add(a, b) {
    return a + b;
  }

  subtract(a, b) {
    return a - b;
  }

  multiply(a, b) {
    return a * b;
  }

  divide(a, b) {
    if (b === 0) {
      throw new Error('除数不能为零');
    }
    return a / b;
  }

  mod(a, b) {
    if (b === 0) {
      throw new Error('取模除数不能为零');
    }
    return a % b;
  }

  power(a, b) {
    return Math.pow(a, b);
  }

  sqrt(a) {
    if (a < 0) {
      throw new Error('不能对负数开平方根');
    }
    return Math.sqrt(a);
  }
}

const calculator = new Calculator();

// API 路由

// GET 主页
app.get('/', (req, res) => {
  res.json({
    message: '欢迎使用计算器 API',
    endpoints: {
      'POST /calculate': '执行计算操作',
      'GET /health': '健康检查'
    },
    operations: ['add', 'subtract', 'multiply', 'divide', 'mod', 'power', 'sqrt']
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 计算接口
app.post('/calculate', (req, res) => {
  try {
    const { operation, a, b } = req.body;

    if (!operation) {
      return res.status(400).json({ error: '请提供操作类型 (operation)' });
    }

    let result;
    const error = validateNumbers(a, b);
    
    // 处理单个参数的运算
    if (operation === 'sqrt') {
      if (typeof a !== 'number') {
        return res.status(400).json({ error: '请提供有效的数字参数 a' });
      }
      result = calculator.sqrt(a);
      return res.json({ operation, a, result });
    }

    // 验证两个参数的运算
    if (error) {
      return res.status(400).json({ error });
    }

    switch (operation) {
      case 'add':
        result = calculator.add(a, b);
        break;
      case 'subtract':
        result = calculator.subtract(a, b);
        break;
      case 'multiply':
        result = calculator.multiply(a, b);
        break;
      case 'divide':
        result = calculator.divide(a, b);
        break;
      case 'mod':
        result = calculator.mod(a, b);
        break;
      case 'power':
        result = calculator.power(a, b);
        break;
      default:
        return res.status(400).json({ 
          error: `不支持的操作: ${operation}`,
          supported: ['add', 'subtract', 'multiply', 'divide', 'mod', 'power', 'sqrt']
        });
    }

    res.json({ operation, a, b, result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 单独的操作路由
app.post('/add', (req, res) => {
  try {
    const { a, b } = req.body;
    const error = validateNumbers(a, b);
    if (error) return res.status(400).json({ error });
    
    res.json({ operation: 'add', a, b, result: calculator.add(a, b) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/subtract', (req, res) => {
  try {
    const { a, b } = req.body;
    const error = validateNumbers(a, b);
    if (error) return res.status(400).json({ error });
    
    res.json({ operation: 'subtract', a, b, result: calculator.subtract(a, b) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/multiply', (req, res) => {
  try {
    const { a, b } = req.body;
    const error = validateNumbers(a, b);
    if (error) return res.status(400).json({ error });
    
    res.json({ operation: 'multiply', a, b, result: calculator.multiply(a, b) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/divide', (req, res) => {
  try {
    const { a, b } = req.body;
    const error = validateNumbers(a, b);
    if (error) return res.status(400).json({ error });
    
    res.json({ operation: 'divide', a, b, result: calculator.divide(a, b) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 启动服务器
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`计算器 API 服务已启动，端口: ${PORT}`);
    console.log(`访问 http://localhost:${PORT} 查看 API 文档`);
  });
}

module.exports = { app, Calculator };
