/**
 * 任务管理API - 包含测试等待功能
 * 
 * 功能：
 * - 任务CRUD操作
 * - 任务延迟创建（测试等待功能）
 * - 任务状态轮询等待
 * - 批量任务操作
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// ==================== 内存存储 ====================
const tasks = new Map();

// ==================== 工具函数 ====================

/**
 * 延迟函数 - 用于测试等待功能
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 生成任务ID
 * @returns {string}
 */
const generateTaskId = () => uuidv4();

/**
 * 创建任务对象
 * @param {Object} taskData - 任务数据
 * @returns {Object}
 */
const createTaskObject = (taskData) => {
  const now = new Date().toISOString();
  return {
    id: generateTaskId(),
    title: taskData.title || 'Untitled Task',
    description: taskData.description || '',
    status: taskData.status || 'pending', // pending, running, completed, failed
    priority: taskData.priority || 'normal', // low, normal, high, urgent
    progress: taskData.progress || 0,
    result: taskData.result || null,
    error: taskData.error || null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    dueDate: taskData.dueDate || null,
    tags: taskData.tags || [],
    metadata: taskData.metadata || {}
  };
};

// ==================== API 路由 ====================

/**
 * GET /api/tasks - 获取所有任务
 * Query: status, priority, tag, page, limit
 */
app.get('/api/tasks', (req, res) => {
  try {
    let result = Array.from(tasks.values());
    
    // 按状态过滤
    if (req.query.status) {
      result = result.filter(t => t.status === req.query.status);
    }
    
    // 按优先级过滤
    if (req.query.priority) {
      result = result.filter(t => t.priority === req.query.priority);
    }
    
    // 按标签过滤
    if (req.query.tag) {
      result = result.filter(t => t.tags.includes(req.query.tag));
    }
    
    // 排序（按创建时间倒序）
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 分页
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const start = (page - 1) * limit;
    const end = start + limit;
    
    const paginatedResult = result.slice(start, end);
    
    res.json({
      success: true,
      data: paginatedResult,
      pagination: {
        page,
        limit,
        total: result.length,
        totalPages: Math.ceil(result.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tasks/:id - 获取单个任务
 */
app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = tasks.get(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tasks - 创建任务
 */
app.post('/api/tasks', (req, res) => {
  try {
    const task = createTaskObject(req.body);
    tasks.set(task.id, task);
    
    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/tasks/:id - 更新任务
 */
app.put('/api/tasks/:id', (req, res) => {
  try {
    const existingTask = tasks.get(req.params.id);
    
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    const updatedTask = {
      ...existingTask,
      ...req.body,
      id: existingTask.id,
      createdAt: existingTask.createdAt,
      updatedAt: new Date().toISOString()
    };
    
    tasks.set(updatedTask.id, updatedTask);
    
    res.json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/tasks/:id - 删除任务
 */
app.delete('/api/tasks/:id', (req, res) => {
  try {
    if (!tasks.has(req.params.id)) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    tasks.delete(req.params.id);
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 测试等待功能 API ====================

/**
 * POST /api/tasks/wait-create - 延迟创建任务（测试等待功能）
 * Body: { task, delayMs }
 */
app.post('/api/tasks/wait-create', async (req, res) => {
  try {
    const { task, delayMs = 1000 } = req.body;
    
    if (!task || typeof delayMs !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request. Required: task object and delayMs number'
      });
    }
    
    // 等待指定时间
    await delay(delayMs);
    
    // 创建任务
    const newTask = createTaskObject({
      ...task,
      status: 'pending'
    });
    
    tasks.set(newTask.id, newTask);
    
    res.status(201).json({
      success: true,
      data: newTask,
      meta: {
        delayMs,
        actualDelay: delayMs
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tasks/:id/wait - 等待任务完成（轮询方式）
 * Query: timeoutMs, pollIntervalMs
 * 
 * 客户端可以调用此API来等待任务状态变为 completed 或 failed
 */
app.post('/api/tasks/:id/wait', async (req, res) => {
  try {
    const taskId = req.params.id;
    const timeoutMs = parseInt(req.query.timeoutMs) || 30000; // 默认30秒超时
    const pollIntervalMs = parseInt(req.query.pollIntervalMs) || 500; // 默认500ms轮询间隔
    
    const startTime = Date.now();
    
    // 立即检查任务是否存在
    let task = tasks.get(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // 如果任务已完成或失败，直接返回
    if (task.status === 'completed' || task.status === 'failed') {
      return res.json({
        success: true,
        data: task,
        meta: {
          waited: 0,
          status: 'immediate'
        }
      });
    }
    
    // 轮询等待任务完成
    while (Date.now() - startTime < timeoutMs) {
      await delay(pollIntervalMs);
      
      task = tasks.get(taskId);
      
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task was deleted during wait'
        });
      }
      
      if (task.status === 'completed' || task.status === 'failed') {
        return res.json({
          success: true,
          data: task,
          meta: {
            waited: Date.now() - startTime,
            status: 'completed'
          }
        });
      }
    }
    
    // 超时
    task = tasks.get(taskId);
    return res.status(408).json({
      success: false,
      error: 'Wait timeout',
      data: task,
      meta: {
        waited: timeoutMs,
        status: 'timeout'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tasks/:id/execute - 模拟任务执行（带延迟）
 * Body: { durationMs }
 */
app.post('/api/tasks/:id/execute', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { durationMs = 2000 } = req.body;
    
    let task = tasks.get(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // 更新任务状态为 running
    task = {
      ...task,
      status: 'running',
      progress: 0,
      updatedAt: new Date().toISOString()
    };
    tasks.set(taskId, task);
    
    // 模拟任务执行过程
    const steps = 10;
    const stepDuration = durationMs / steps;
    
    for (let i = 1; i <= steps; i++) {
      await delay(stepDuration);
      
      task = {
        ...task,
        progress: (i / steps) * 100,
        updatedAt: new Date().toISOString()
      };
      tasks.set(taskId, task);
    }
    
    // 任务完成
    task = {
      ...task,
      status: 'completed',
      progress: 100,
      result: { message: 'Task executed successfully' },
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    tasks.set(taskId, task);
    
    res.json({
      success: true,
      data: task,
      meta: {
        durationMs
      }
    });
  } catch (error) {
    // 任务失败
    const task = tasks.get(req.params.id);
    if (task) {
      const failedTask = {
        ...task,
        status: 'failed',
        error: error.message,
        updatedAt: new Date().toISOString()
      };
      tasks.set(failedTask.id, failedTask);
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tasks/batch - 批量创建任务
 * Body: { tasks: [] }
 */
app.post('/api/tasks/batch', (req, res) => {
  try {
    const { tasks: taskList } = req.body;
    
    if (!Array.isArray(taskList) || taskList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request. Required: tasks array'
      });
    }
    
    const createdTasks = taskList.map(taskData => {
      const task = createTaskObject(taskData);
      tasks.set(task.id, task);
      return task;
    });
    
    res.status(201).json({
      success: true,
      data: createdTasks,
      meta: {
        count: createdTasks.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tasks/batch-wait - 批量创建任务（带延迟）
 * Body: { tasks: [], delayBetweenMs }
 */
app.post('/api/tasks/batch-wait', async (req, res) => {
  try {
    const { tasks: taskList, delayBetweenMs = 500 } = req.body;
    
    if (!Array.isArray(taskList) || taskList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request. Required: tasks array'
      });
    }
    
    const createdTasks = [];
    
    for (const taskData of taskList) {
      const task = createTaskObject(taskData);
      tasks.set(task.id, task);
      createdTasks.push(task);
      
      if (delayBetweenMs > 0) {
        await delay(delayBetweenMs);
      }
    }
    
    res.status(201).json({
      success: true,
      data: createdTasks,
      meta: {
        count: createdTasks.length,
        delayBetweenMs
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tasks/:id/history - 获取任务状态变更历史
 */
app.get('/api/tasks/:id/history', (req, res) => {
  try {
    const task = tasks.get(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // 从 metadata 中获取历史记录
    const history = task.metadata?.history || [];
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/stats - 获取任务统计信息
 */
app.get('/api/stats', (req, res) => {
  try {
    const allTasks = Array.from(tasks.values());
    
    const stats = {
      total: allTasks.length,
      pending: allTasks.filter(t => t.status === 'pending').length,
      running: allTasks.filter(t => t.status === 'running').length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      failed: allTasks.filter(t => t.status === 'failed').length,
      byPriority: {
        low: allTasks.filter(t => t.priority === 'low').length,
        normal: allTasks.filter(t => t.priority === 'normal').length,
        high: allTasks.filter(t => t.priority === 'high').length,
        urgent: allTasks.filter(t => t.priority === 'urgent').length
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 健康检查 ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    tasksCount: tasks.size
  });
});

// ==================== 启动服务器 ====================

app.listen(PORT, () => {
  console.log(`Task Management API running on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET    /api/tasks           - Get all tasks`);
  console.log(`  GET    /api/tasks/:id       - Get task by ID`);
  console.log(`  POST   /api/tasks           - Create task`);
  console.log(`  PUT    /api/tasks/:id       - Update task`);
  console.log(`  DELETE /api/tasks/:id       - Delete task`);
  console.log(`  POST   /api/tasks/wait-create - Delayed task creation (wait test)`);
  console.log(`  POST   /api/tasks/:id/wait - Wait for task completion`);
  console.log(`  POST   /api/tasks/:id/execute - Execute task with delay`);
  console.log(`  POST   /api/tasks/batch     - Batch create tasks`);
  console.log(`  POST   /api/tasks/batch-wait - Batch create with delay`);
  console.log(`  GET    /api/tasks/:id/history - Get task history`);
  console.log(`  GET    /api/stats           - Get task statistics`);
});

module.exports = app;
