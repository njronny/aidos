import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dataStore } from '../store';

// Schema 定义
const batchSchemas = {
  createTasks: {
    body: {
      type: 'object',
      required: ['requirementId', 'tasks'],
      properties: {
        requirementId: { type: 'string', minLength: 1 },
        tasks: {
          type: 'array',
          minItems: 1,
          maxItems: 50,
          items: {
            type: 'object',
            required: ['title'],
            properties: {
              title: { type: 'string', minLength: 1, maxLength: 200 },
              description: { type: 'string', maxLength: 5000 },
            },
          },
        },
      },
    },
  },
  updateTasksStatus: {
    body: {
      type: 'object',
      required: ['taskIds', 'status'],
      properties: {
        taskIds: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } },
        status: { type: 'string', enum: ['pending', 'assigned', 'in_progress', 'completed', 'failed'] },
      },
    },
  },
  deleteTasks: {
    body: {
      type: 'object',
      required: ['taskIds'],
      properties: {
        taskIds: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } },
      },
    },
  },
  createProjects: {
    body: {
      type: 'object',
      required: ['projects'],
      properties: {
        projects: {
          type: 'array',
          minItems: 1,
          maxItems: 20,
          items: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 200 },
              description: { type: 'string', maxLength: 5000 },
            },
          },
        },
      },
    },
  },
};

interface BatchTaskBody {
  requirementId: string;
  tasks: Array<{
    title: string;
    description?: string;
  }>;
}

interface BatchStatusBody {
  taskIds: string[];
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
}

// Schema 定义
const batchSchemas = {
  createTasks: {
    body: {
      type: 'object',
      required: ['requirementId', 'tasks'],
      properties: {
        requirementId: { type: 'string', minLength: 1 },
        tasks: { 
          type: 'array', 
          items: {
            type: 'object',
            required: ['title'],
            properties: {
              title: { type: 'string', minLength: 1, maxLength: 200 },
              description: { type: 'string', maxLength: 5000 }
            }
          },
          maxItems: 50 
        },
      },
    },
  },
  updateStatus: {
    body: {
      type: 'object',
      required: ['taskIds', 'status'],
      properties: {
        taskIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
        status: { type: 'string', enum: ['pending', 'assigned', 'in_progress', 'completed', 'failed'] },
      },
    },
  },
};

export async function batchRoutes(fastify: FastifyInstance) {
  // POST /api/batch/tasks - 批量创建任务
  fastify.post('/batch/tasks', { schema: { body: batchSchemas.createTasks.body } }, async (request: FastifyRequest<{ Body: BatchTaskBody }>, reply) => {
    const { requirementId, tasks } = request.body;

    if (!requirementId || !tasks || !Array.isArray(tasks)) {
      return reply.status(400).send({ success: false, error: '无效的请求参数' });
    }

    if (tasks.length > 50) {
      return reply.status(400).send({ success: false, error: '单次最多创建50个任务' });
    }

    const created: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      try {
        if (!task.title) {
          errors.push(`任务 ${i + 1}: 标题不能为空`);
          continue;
        }
        
        const createdTask = await dataStore.createTask({
          requirementId,
          title: task.title,
          description: task.description,
        });
        created.push(createdTask);
      } catch (err: any) {
        errors.push(`任务 ${i + 1}: ${err.message}`);
      }
    }

    return {
      success: true,
      data: {
        created: created.length,
        failed: errors.length,
        tasks: created,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  });

  // PUT /api/batch/tasks/status - 批量更新任务状态
  fastify.put('/batch/tasks/status', { schema: { body: batchSchemas.updateStatus.body } }, async (request: FastifyRequest<{ Body: BatchStatusBody }>, reply) => {
    const { taskIds, status } = request.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return reply.status(400).send({ success: false, error: '任务ID列表不能为空' });
    }

    if (!status) {
      return reply.status(400).send({ success: false, error: '状态不能为空' });
    }

    const updated: string[] = [];
    const errors: string[] = [];

    for (const taskId of taskIds) {
      try {
        await dataStore.updateTask(taskId, { status });
        updated.push(taskId);
      } catch (err: any) {
        errors.push(`${taskId}: ${err.message}`);
      }
    }

    return {
      success: true,
      data: {
        updated: updated.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  });

  // DELETE /api/batch/tasks - 批量删除任务
  fastify.delete('/batch/tasks', async (request: FastifyRequest<{ Body: { taskIds: string[] } }>, reply) => {
    const { taskIds } = request.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return reply.status(400).send({ success: false, error: '任务ID列表不能为空' });
    }

    const deleted: string[] = [];
    const errors: string[] = [];

    for (const taskId of taskIds) {
      try {
        await dataStore.deleteTask(taskId);
        deleted.push(taskId);
      } catch (err: any) {
        errors.push(`${taskId}: ${err.message}`);
      }
    }

    return {
      success: true,
      data: {
        deleted: deleted.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  });

  // POST /api/batch/projects - 批量创建项目
  fastify.post('/batch/projects', async (request: FastifyRequest<{ Body: { projects: Array<{ name: string; description?: string }> } }>, reply) => {
    const { projects } = request.body;

    if (!projects || !Array.isArray(projects)) {
      return reply.status(400).send({ success: false, error: '项目列表不能为空' });
    }

    if (projects.length > 20) {
      return reply.status(400).send({ success: false, error: '单次最多创建20个项目' });
    }

    const created: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      try {
        if (!project.name) {
          errors.push(`项目 ${i + 1}: 名称不能为空`);
          continue;
        }
        
        const createdProject = await dataStore.createProject({
          name: project.name,
          description: project.description,
        });
        created.push(createdProject);
      } catch (err: any) {
        errors.push(`项目 ${i + 1}: ${err.message}`);
      }
    }

    return {
      success: true,
      data: {
        created: created.length,
        failed: errors.length,
        projects: created,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  });
}
