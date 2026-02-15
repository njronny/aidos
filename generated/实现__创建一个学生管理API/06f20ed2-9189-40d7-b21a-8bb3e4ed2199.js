/**
 * 学生管理 API
 * 基于 Express.js 实现完整的 CRUD 功能
 */

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 模拟数据库 - 学生数据
let students = [
  { id: 1, name: '张三', age: 20, gender: '男', grade: '大一', major: '计算机科学', email: 'zhangsan@example.com' },
  { id: 2, name: '李四', age: 21, gender: '女', grade: '大二', major: '软件工程', email: 'lisi@example.com' },
  { id: 3, name: '王五', age: 19, gender: '男', grade: '大一', major: '数据科学', email: 'wangwu@example.com' }
];

let nextId = 4;

// 工具函数：验证学生数据
function validateStudent(student) {
  const errors = [];
  if (!student.name || typeof student.name !== 'string' || student.name.trim() === '') {
    errors.push('姓名不能为空');
  }
  if (student.age !== undefined) {
    if (typeof student.age !== 'number' || student.age < 1 || student.age > 150) {
      errors.push('年龄必须是1-150之间的数字');
    }
  }
  if (student.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) {
    errors.push('邮箱格式不正确');
  }
  return errors;
}

// ============ API 路由 ============

// 1. 获取所有学生 (支持分页和搜索)
app.get('/api/students', (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  
  let filteredStudents = students;
  
  // 搜索功能
  if (search) {
    const searchLower = search.toLowerCase();
    filteredStudents = students.filter(s => 
      s.name.toLowerCase().includes(searchLower) ||
      s.major?.toLowerCase().includes(searchLower) ||
      s.grade?.toLowerCase().includes(searchLower)
    );
  }
  
  // 分页
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedStudents,
    pagination: {
      total: filteredStudents.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(filteredStudents.length / limit)
    }
  });
});

// 2. 获取单个学生
app.get('/api/students/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const student = students.find(s => s.id === id);
  
  if (!student) {
    return res.status(404).json({ success: false, message: '学生不存在' });
  }
  
  res.json({ success: true, data: student });
});

// 3. 创建学生
app.post('/api/students', (req, res) => {
  const student = req.body;
  
  // 验证数据
  const errors = validateStudent(student);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }
  
  // 创建新学生
  const newStudent = {
    id: nextId++,
    name: student.name.trim(),
    age: student.age || 18,
    gender: student.gender || '未知',
    grade: student.grade || '',
    major: student.major || '',
    email: student.email || '',
    createdAt: new Date().toISOString()
  };
  
  students.push(newStudent);
  
  res.status(201).json({ 
    success: true, 
    message: '学生创建成功',
    data: newStudent 
  });
});

// 4. 更新学生
app.put('/api/students/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = students.findIndex(s => s.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: '学生不存在' });
  }
  
  const student = req.body;
  
  // 验证数据
  const errors = validateStudent(student);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }
  
  // 更新学生信息
  students[index] = {
    ...students[index],
    name: student.name?.trim() || students[index].name,
    age: student.age || students[index].age,
    gender: student.gender || students[index].gender,
    grade: student.grade || students[index].grade,
    major: student.major || students[index].major,
    email: student.email || students[index].email,
    updatedAt: new Date().toISOString()
  };
  
  res.json({ 
    success: true, 
    message: '学生更新成功',
    data: students[index] 
  });
});

// 5. 删除学生
app.delete('/api/students/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = students.findIndex(s => s.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: '学生不存在' });
  }
  
  const deletedStudent = students.splice(index, 1)[0];
  
  res.json({ 
    success: true, 
    message: '学生删除成功',
    data: deletedStudent
  });
});

// 6. 批量删除学生
app.post('/api/students/batch-delete', (req, res) => {
  const { ids } = req.body;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: '请提供要删除的学生ID数组' });
  }
  
  const idSet = new Set(ids.map(id => parseInt(id)));
  const initialLength = students.length;
  
  students = students.filter(s => !idSet.has(s.id));
  
  const deletedCount = initialLength - students.length;
  
  res.json({ 
    success: true, 
    message: `成功删除 ${deletedCount} 名学生`,
    deletedCount
  });
});

// 7. 获取学生统计信息
app.get('/api/students/stats', (req, res) => {
  const stats = {
    total: students.length,
    byGrade: {},
    byMajor: {},
    byGender: {},
    avgAge: 0
  };
  
  let totalAge = 0;
  
  students.forEach(s => {
    // 按年级统计
    stats.byGrade[s.grade] = (stats.byGrade[s.grade] || 0) + 1;
    // 按专业统计
    stats.byMajor[s.major] = (stats.byMajor[s.major] || 0) + 1;
    // 按性别统计
    stats.byGender[s.gender] = (stats.byGender[s.gender] || 0) + 1;
    // 年龄总和
    totalAge += s.age || 0;
  });
  
  // 计算平均年龄
  stats.avgAge = students.length > 0 ? Math.round(totalAge / students.length * 10) / 10 : 0;
  
  res.json({ success: true, data: stats });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// 启动服务器
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`学生管理 API 服务器运行在 http://localhost:${PORT}`);
    console.log('可用端点:');
    console.log('  GET    /api/students        - 获取所有学生(支持分页和搜索)');
    console.log('  GET    /api/students/:id   - 获取单个学生');
    console.log('  POST   /api/students        - 创建学生');
    console.log('  PUT    /api/students/:id   - 更新学生');
    console.log('  DELETE /api/students/:id   - 删除学生');
    console.log('  POST   /api/students/batch-delete - 批量删除');
    console.log('  GET    /api/students/stats - 获取统计信息');
  });
}

module.exports = app;
