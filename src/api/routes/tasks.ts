import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dataStore } from '../store';
import { Task, CreateTaskDto, UpdateTaskDto, QueryParams } from '../types';

function paginateItems<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  const end = start + limit;
  return {
    data: items.slice(start, end),
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
    },
  };
}

function sortItems<T>(items: T[], sortBy?: string, order: 'asc' | 'desc' = 'asc') {
  if (!sortBy) return items;
  return [...items].sort((a: any, b: any) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

function filterItems<T>(items: T[], search?: string) {
  if (!search) return items;
  const s = search.toLowerCase();
  return (items as any[]).filter(item => 
    JSON.stringify(item).toLowerCase().includes(s)
  );
}

export async function taskRoutes(fastify: FastifyInstance) {
  // Export for WebSocket access
  fastify.decorate('dataStore', dataStore);

  // GET /tasks - 获取所有任务
  fastify.get<{ Querystring: QueryParams & { requirementId?: string; agentId?: string } }>('/tasks', async (request, reply) => {
    const { page = 1, limit = 10, sort, order = 'asc', search, requirementId, agentId } = request.query;
    let tasks = dataStore.getAllTasks({ requirementId, agentId });
    tasks = filterItems(tasks, search);
    tasks = sortItems(tasks, sort, order);
    const result = paginateItems(tasks, page, limit);
    return reply.send({ success: true, ...result });
  });

  // GET /tasks/:id - 获取单个任务
  fastify.get<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const task = dataStore.getTaskById(request.params.id);
    if (!task) {
      return reply.status(404).send({ success: false, error: '任务不存在' });
    }
    return reply.send({ success: true, data: task });
  });

  // POST /tasks - 创建任务
  fastify.post<{ Body: CreateTaskDto }>('/tasks', async (request: FastifyRequest<{ Body: CreateTaskDto }>, reply: FastifyReply) => {
    const { requirementId, title, description, agentId } = request.body;
    if (!requirementId || !title) {
      return reply.status(400).send({ success: false, error: '需求ID和标题不能为空' });
    }
    const task = dataStore.createTask({ requirementId, title, description, agentId });
    return reply.status(201).send({ success: true, data: task });
  });

  // PUT /tasks/:id - 更新任务
  fastify.put<{ Params: { id: string }; Body: UpdateTaskDto }>('/tasks/:id', async (request, reply) => {
    const task = dataStore.updateTask(request.params.id, request.body);
    if (!task) {
      return reply.status(404).send({ success: false, error: '任务不存在' });
    }
    return reply.send({ success: true, data: task });
  });

  // DELETE /tasks/:id - 删除任务
  fastify.delete<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const deleted = dataStore.deleteTask(request.params.id);
    if (!deleted) {
      return reply.status(404).send({ success: false, error: '任务不存在' });
    }
    return reply.send({ success: true, message: '任务已删除' });
  });
}
