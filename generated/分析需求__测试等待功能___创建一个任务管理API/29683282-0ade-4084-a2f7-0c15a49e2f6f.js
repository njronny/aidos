/**
 * 任务管理 API - 测试等待功能
 * 
 * 功能：
 * - 任务的创建、查询、更新、删除
 * - 任务延迟执行（wait/delay）
 * - 任务状态轮询
 * - 模拟长时间等待操作
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 内存存储
const tasks = new Map();

// ==================== 任务模型 ====================

/**
 * @typedef {Object} Task
 * @property {string} id - 任务ID
 * @property {string} title - 任务标题
 * @property {string} description - 任务描述
 * @property {string} status - pending|running|completed|failed
 * @property {number} delay - 延迟执行时间(毫秒)
 * @property {number} createdAt - 创建时间
 * @property {number} startedAt - 开始时间
 * @property {number} completedAt - 完成时间
 * @property {string} result - 执行结果
 */

// ==================== 辅助函数 ====================

/**
 * 模拟等待/延迟执行
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 创建带超时的延迟函数
 * @param {number} ms - 延迟毫秒数
 * @param {number} timeout - 超时时间(默认60000ms)
 */
const waitWithTimeout = (ms, timeout = 60000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(`等待完成: ${ms}ms`), ms);
    setTimeout(() => {
      clearTimeout(timer);
      reject(new Error('等待超时'));
    }, timeout);
  });
};

// ==================== API 路由 ====================

// 获取所有任务
app.get('/api/tasks', (req, res) => {
  const taskList = Array.from(tasks.values());
  res.json({
    success: true,
    data: taskList,
    total: taskList.length
  });
});

// 获取单个任务
app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, message: '任务不存在' });
  }
  res.json({ success: true, data: task });
});

// 创建任务（支持延迟执行）
app.post('/api/tasks', async (req, res) => {
  const { title, description, delay: taskDelay = 0 } = req.body;
  
  if (!title) {
    return res.status(400).json({ success: false, message: '任务标题不能为空' });
  }

  const task = {
    id: uuidv4(),
    title,
    description: description || '',
    status: 'pending',
    delay: taskDelay,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    result: null
  };

  tasks.set(task.id, task);

  // 如果设置了延迟，自动开始执行
  if (taskDelay > 0) {
    executeTask(task.id, taskDelay);
  }

  res.status(201).json({ success: true, data: task });
});

// 更新任务
app.put('/api/tasks/:id', (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, message: '任务不存在' });
  }

  const { title, description, status } = req.body;
  if (title) task.title = title;
  if (description) task.description = description;
  if (status) task.status = status;

  tasks.set(task.id, task);
  res.json({ success: true, data: task });
});

// 删除任务
app.delete('/api/tasks/:id', (req, res) => {
  if (!tasks.has(req.params.id)) {
    return res.status(404).json({ success: false, message: '任务不存在' });
  }
  tasks.delete(req.params.id);
  res.json({ success: true, message: '任务已删除' });
});

// ==================== 等待功能测试接口 ====================

/**
 * 测试延迟执行
 * POST /api/test/wait
 * Body: { delay: 毫秒数 }
 */
app.post('/api/test/wait', async (req, res) => {
  const { delay: waitTime = 1000, taskId } = req.body;
  
  console.log(`[测试等待] 开始等待 ${waitTime}ms`);
  
  await delay(waitTime);
  
  console.log(`[测试等待] 等待完成`);
  
  res.json({
    success: true,
    message: `等待完成`,
    waitTime,
    completedAt: Date.now()
  });
});

/**
 * 测试带超时的等待
 * POST /api/test/wait-with-timeout
 */
app.post('/api/test/wait-with-timeout', async (req, res) => {
  const { delay: waitTime = 5000, timeout = 3000 } = req.body;
  
  try {
    const result = await waitWithTimeout(waitTime, timeout);
    res.json({ success: true, result });
  } catch (error) {
    res.status(408).json({ 
      success: false, 
      message: error.message,
      timeout,
        waitTime
    });
  }
});

/**
 * 测试轮询等待任务完成
 * GET /api/test/poll/:taskId
 */
app.get('/api/test/poll/:taskId', (req, res) => {
  const task = tasks.get(req.params.taskId);
  
  if (!task) {
    return res.status(404).json({ success: false, message: '任务不存在' });
  }

  const isCompleted = task.status === 'completed' || task.status === 'failed';
  
  res.json({
    success: true,
    data: {
      taskId: task.id,
      status: task.status,
      isCompleted,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      result: task.result
    }
  });
});

/**
 * 创建并等待任务完成
 * POST /api/test/create-and-wait
 */
app.post('/api/test/create-and-wait', async (req, res) => {
  const { title, delay: taskDelay = 2000 } = req.body;
  
  const taskId = uuidv4();
  const task = {
    id: taskId,
    title: title || `等待测试任务-${taskId}`,
    description: '测试等待功能的任务',
    status: 'pending',
    delay: taskDelay,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    result: null
  };

  tasks.set(taskId, task);

  // 异步执行任务
  executeTask(taskId, taskDelay);

  // 等待任务完成
  try {
    const completedTask = await pollTaskComplete(taskId, 100, 30000);
    res.json({ success: true, data: completedTask });
  } catch (error) {
    res.status(408).json({ success: false, message: error.message });
  }
});

// ==================== 内部函数 ====================

/**
 * 执行任务
 * @param {string} taskId 
 * @param {number} delay 
 */
function executeTask(taskId, delay) {
  const task = tasks.get(taskId);
  if (!task) return;

  task.status = 'running';
  task.startedAt = Date.now();
  tasks.set(taskId, task);

  setTimeout(() => {
    task.status = 'completed';
    task.completedAt = Date.now();
    task.result = `任务在 ${delay}ms 后完成`;
    tasks.set(taskId, task);
    console.log(`[任务执行] ${taskId} 已完成`);
  }, delay);
}

/**
 * 轮询等待任务完成
 * @param {string} taskId 
 * @param {number} interval - 轮询间隔(ms)
 * @param {number} timeout - 超时时间(ms)
 * @returns {Promise<Task>}
 */
function pollTaskComplete(taskId, interval = 100, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const poll = () => {
      const task = tasks.get(taskId);
      
      if (!task) {
        return reject(new Error('任务不存在'));
      }
      
      if (task.status === 'completed' || task.status === 'failed') {
        return resolve(task);
      }
      
      if (Date.now() - startTime > timeout) {
        return reject(new Error('轮询超时'));
      }
      
      setTimeout(poll, interval);
    };
    
    poll();
  });
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`任务管理 API 服务已启动，端口: ${PORT}`);
  console.log(`\n可用接口:`);
  console.log(`  GET  /api/tasks              - 获取所有任务`);
  console.log(`  GET  /api/tasks/:id          - 获取单个任务`);
  console.log(`  POST /api/tasks             - 创建任务`);
  console.log(`  PUT  /api/tasks/:id         - 更新任务`);
  console.log(`  DELETE /api/tasks/:id       - 删除任务`);
  console.log(`\n等待功能测试接口:`);
  console.log(`  POST /api/test/wait                - 测试延迟执行`);
  console.log(`  POST /api/test/wait-with-timeout   - 测试带超时的等待`);
  console.log(`  GET  /api/test/poll/:taskId        - 轮询任务状态`);
  console.log(`  POST /api/test/create-and-wait     - 创建并等待任务完成`);
});

module.exports = app;
