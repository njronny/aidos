/**
 * 学生管理 API
 * 基于 Express.js 的 RESTful API
 * 
 * 功能：
 * - GET /api/students - 获取学生列表
 * - GET /api/students/:id - 获取单个学生
 * - POST /api/students - 创建学生
 * - PUT /api/students/:id - 更新学生
 * - DELETE /api/students/:id - 删除学生
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 内存数据库（生产环境应使用真实数据库）
let students = [
  { id: '1', name: '张三', age: 20, grade: '大一', major: '计算机科学', email: 'zhangsan@example.com' },
  { id: '2', name: '李四', age: 21, grade: '大二', major: '软件工程', email: 'lisi@example.com' },
  { id: '3', name: '王五', age: 19, grade: '大一', major: '数据科学', email: 'wangwu@example.com' }
];

// 验证学生数据
const validateStudent = (student) => {
  const errors = [];
  if (!student.name || typeof student.name !== 'string') {
    errors.push('姓名是必填项');
  }
  if (!student.age || typeof student.age !== 'number' || student.age < 1 || student.age > 150) {
    errors.push('年龄必须是有效的数字');
  }
  if (!student.grade || typeof student.grade !== 'string') {
    errors.push('年级是必填项');
  }
  if (!student.major || typeof student.major !== 'string') {
    errors.push('专业是必填项');
  }
  if (student.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) {
    errors.push('邮箱格式无效');
  }
  return errors;
};

// GET /api/students - 获取学生列表
app.get('/api/students', (req, res) => {
  const { name, major, grade } = req.query;
  let result = [...students];

  if (name) {
    result = result.filter(s => s.name.toLowerCase().includes(name.toLowerCase()));
  }
  if (major) {
    result = result.filter(s => s.major.toLowerCase().includes(major.toLowerCase()));
  }
  if (grade) {
    result = result.filter(s => s.grade === grade);
  }

  res.json({
    success: true,
    data: result,
    total: result.length
  });
});

// GET /api/students/:id - 获取单个学生
app.get('/api/students/:id', (req, res) => {
  const student = students.find(s => s.id === req.params.id);
  
  if (!student) {
    return res.status(404).json({
      success: false,
      message: '学生不存在'
    });
  }

  res.json({
    success: true,
    data: student
  });
});

// POST /api/students - 创建学生
app.post('/api/students', (req, res) => {
  const errors = validateStudent(req.body);
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: '验证失败',
      errors
    });
  }

  const newStudent = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  };

  students.push(newStudent);

  res.status(201).json({
    success: true,
    message: '学生创建成功',
    data: newStudent
  });
});

// PUT /api/students/:id - 更新学生
app.put('/api/students/:id', (req, res) => {
  const index = students.findIndex(s => s.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: '学生不存在'
    });
  }

  const errors = validateStudent(req.body);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: '验证失败',
      errors
    });
  }

  students[index] = {
    ...students[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    message: '学生更新成功',
    data: students[index]
  });
});

// DELETE /api/students/:id - 删除学生
app.delete('/api/students/:id', (req, res) => {
  const index = students.findIndex(s => s.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: '学生不存在'
    });
  }

  const deleted = students.splice(index, 1)[0];

  res.json({
    success: true,
    message: '学生删除成功',
    data: deleted
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

// 启动服务器
app.listen(PORT, () => {
  console.log(`学生管理API运行在 http://localhost:${PORT}`);
});

module.exports = app;
