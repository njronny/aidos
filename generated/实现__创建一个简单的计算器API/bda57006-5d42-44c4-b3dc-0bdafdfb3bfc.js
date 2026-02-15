/**
 * 简单计算器 API
 * 基于 Express.js 的 RESTful API
 * 支持加减乘除四种基本运算
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * 计算器服务类
 */
class CalculatorService {
  /**
   * 加法
   */
  static add(a, b) {
    return a + b;
  }

  /**
   * 减法
   */
  static subtract(a, b) {
    return a - b;
  }

  /**
   * 乘法
   */
  static multiply(a, b) {
    return a * b;
  }

  /**
   * 除法
   */
  static divide(a, b) {
    if (b === 0) {
      throw new Error('除数不能为零');
    }
    return a / b;
  }

  /**
   * 通用计算方法
   */
  static calculate(operator, a, b) {
    const operations = {
      '+': this.add,
      '-': this.subtract,
      '*': this.multiply,
      '/': this.divide
    };

    const operation = operations[operator];
    if (!operation) {
      throw new Error(`不支持的操作: ${operator}`);
    }

    return operation(a, b);
  }
}

/**
 * 通用计算接口
 * POST /api/calculate
 * Body: { "operator": "+", "a": 10, "b": 5 }
 */
app.post('/api/calculate', (req, res) => {
  try {
    const { operator, a, b } = req.body;

    // 验证输入
    if (a === undefined || b === undefined || !operator) {
      return res.status(400).json({
        error: '缺少必要参数',
        required: { operator: '操作符 (+, -, *, /)', a: '数字', b: '数字' }
      });
    }

    if (typeof a !== 'number' || typeof b !== 'number') {
      return res.status(400).json({
        error: '参数必须是数字'
      });
    }

    const result = CalculatorService.calculate(operator, a, b);

    res.json({
      success: true,
      operator,
      a,
      b,
      result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// 各操作独立接口
app.post('/api/add', (req, res) => {
  const { a, b } = req.body;
  res.json({ result: CalculatorService.add(a, b) });
});

app.post('/api/subtract', (req, res) => {
  const { a, b } = req.body;
  res.json({ result: CalculatorService.subtract(a, b) });
});

app.post('/api/multiply', (req, res) => {
  const { a, b } = req.body;
  res.json({ result: CalculatorService.multiply(a, b) });
});

app.post('/api/divide', (req, res) => {
  try {
    const { a, b } = req.body;
    res.json({ result: CalculatorService.divide(a, b) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 启动服务器
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`计算器 API 服务已启动，端口: ${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/health`);
    console.log(`计算接口: POST http://localhost:${PORT}/api/calculate`);
  });
}

module.exports = { app, CalculatorService };
