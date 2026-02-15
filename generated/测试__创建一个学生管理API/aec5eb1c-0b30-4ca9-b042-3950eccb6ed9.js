/**
 * 学生管理 API
 * 基于 Express.js 的 RESTful API
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());

// 模拟数据库 - 学生数据
let students = [
  { id: 1, name: '张三', age: 20, gender: '男', grade: '大二', major: '计算机科学' },
  { id: 2, name: '李四', age: 19, gender: '女', grade: '大一', major: '软件工程' },
  { id: 3, name: '王五', age: 21, gender: '男', grade: '大三', major: '数据科学' }
];

let nextId = 4;

// ==================== API 路由 ====================

/**
 * GET /students
 * 获取所有学生列表
 */
app.get('/students', (req, res) => {
  res.json({
    success: true,
    data: students,
    total: students.length
  });
});

/**
 * GET /students/:id
 * 获取单个学生信息
 */
app.get('/students/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const student = students.find(s => s.id === id);
  
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

/**
 * POST /students
 * 创建新学生
 */
app.post('/students', (req, res) => {
  const { name, age, gender, grade, major } = req.body;
  
  // 验证必填字段
  if (!name || !age || !gender || !grade || !major) {
    return res.status(400).json({
      success: false,
      message: '请填写所有必填字段: name, age, gender, grade, major'
    });
  }
  
  const newStudent = {
    id: nextId++,
    name,
    age: parseInt(age),
    gender,
    grade,
    major
  };
  
  students.push(newStudent);
  
  res.status(201).json({
    success: true,
    message: '学生创建成功',
    data: newStudent
  });
});

/**
 * PUT /students/:id
 * 更新学生信息
 */
app.put('/students/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const studentIndex = students.findIndex(s => s.id === id);
  
  if (studentIndex === -1) {
    return res.status(404).json({
      success: false,
      message: '学生不存在'
    });
  }
  
  const { name, age, gender, grade, major } = req.body;
  
  // 更新学生信息（保留原id）
  students[studentIndex] = {
    id,
    name: name || students[studentIndex].name,
    age: age ? parseInt(age) : students[studentIndex].age,
    gender: gender || students[studentIndex].gender,
    grade: grade || students[studentIndex].grade,
    major: major || students[studentIndex].major
  };
  
  res.json({
    success: true,
    message: '学生信息更新成功',
    data: students[studentIndex]
  });
});

/**
 * DELETE /students/:id
 * 删除学生
 */
app.delete('/students/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const studentIndex = students.findIndex(s => s.id === id);
  
  if (studentIndex === -1) {
    return res.status(404).json({
      success: false,
      message: '学生不存在'
    });
  }
  
  const deletedStudent = students.splice(studentIndex, 1)[0];
  
  res.json({
    success: true,
    message: '学生删除成功',
    data: deletedStudent
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 学生管理API服务已启动: http://localhost:${PORT}`);
    console.log(`📋 可用端点:`);
    console.log(`   GET    /students        - 获取所有学生`);
    console.log(`   GET    /students/:id    - 获取单个学生`);
    console.log(`   POST   /students        - 创建学生`);
    console.log(`   PUT    /students/:id    - 更新学生`);
    console.log(`   DELETE /students/:id   - 删除学生`);
  });
}

module.exports = app;
