/**
 * 定时任务管理
 */

import { FastifyInstance } from 'fastify';

interface ScheduledTask {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

// Schema 定义
const scheduledTaskSchemas = {
  update: {
    body: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
      },
    },
  },
};

// 模拟定时任务存储
const scheduledTasks: Map<string, ScheduledTask> = new Map([
  ['backup', { id: 'backup', name: '数据库备份', schedule: '0 2 * * *', enabled: true }],
  ['cleanup', { id: 'cleanup', name: '清理临时文件', schedule: '0 3 * * *', enabled: true }],
  ['health', { id: 'health', name: '健康检查报告', schedule: '0 8 * * *', enabled: false }],
]);

export async function scheduledTaskRoutes(fastify: FastifyInstance) {
  
  // 获取定时任务列表
  fastify.get('/scheduled-tasks', async (request, reply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    const tasks = Array.from(scheduledTasks.values());
    
    return reply.send({
      success: true,
      data: tasks
    });
  });

  // 启用/禁用定时任务
  fastify.patch('/scheduled-tasks/:id', async (request, reply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    const { id } = request.params as { id: string };
    const { enabled } = request.body as { enabled: boolean };
    
    const task = scheduledTasks.get(id);
    if (!task) {
      return reply.status(404).send({ success: false, error: '任务不存在' });
    }
    
    task.enabled = enabled;
    scheduledTasks.set(id, task);
    
    return reply.send({
      success: true,
      data: task,
      message: enabled ? '任务已启用' : '任务已禁用'
    });
  });

  // 手动触发定时任务
  fastify.post('/scheduled-tasks/:id/run', async (request, reply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    const { id } = request.params as { id: string };
    
    const task = scheduledTasks.get(id);
    if (!task) {
      return reply.status(404).send({ success: false, error: '任务不存在' });
    }
    
    // 模拟执行任务
    const result = await runTask(task);
    
    return reply.send({
      success: true,
      data: {
        taskId: id,
        executedAt: new Date().toISOString(),
        result
      }
    });
  });
}

// 模拟任务执行
async function runTask(task: ScheduledTask): Promise<string> {
  // 实际实现中会根据任务类型执行不同操作
  switch (task.id) {
    case 'backup':
      return '数据库备份完成';
    case 'cleanup':
      return '临时文件清理完成';
    case 'health':
      return '健康检查报告生成完成';
    default:
      return '任务执行完成';
  }
}
