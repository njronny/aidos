import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dataStore } from '../store';
import { Requirement, CreateRequirementDto, UpdateRequirementDto, QueryParams } from '../types';
import { getWorkflowService } from '../../core/workflow';

// Schema 定义
const requirementSchemas = {
  create: {
    body: {
      type: 'object',
      required: ['projectId', 'title'],
      properties: {
        projectId: { type: 'string', minLength: 1 },
        title: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', maxLength: 5000 },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
        category: { type: 'string', enum: ['feature', 'bug', 'improvement', 'research'], default: 'feature' },
      },
    },
  },
  update: {
    body: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', maxLength: 5000 },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'failed'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        category: { type: 'string', enum: ['feature', 'bug', 'improvement', 'research'] },
      },
    },
  },
  query: {
    querystring: {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
        search: { type: 'string', maxLength: 100 },
        status: { type: 'string' },
        projectId: { type: 'string' },
        priority: { type: 'string' },
        sort: { type: 'string' },
        order: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
      },
    },
  },
};

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

export async function requirementRoutes(fastify: FastifyInstance) {
  // GET /requirements - 获取所有需求
  fastify.get<{ Querystring: QueryParams & { projectId?: string } }>('/requirements', { schema: requirementSchemas.query }, async (request, reply) => {
    const { page = 1, limit = 10, sort, order = 'asc', search, projectId } = request.query;
    const requirements = await dataStore.getAllRequirements({ projectId });
    let filtered = filterItems(requirements, search);
    filtered = sortItems(filtered, sort, order);
    const result = paginateItems(filtered, page, limit);
    return reply.send({ success: true, ...result });
  });

  // GET /requirements/:id - 获取单个需求
  fastify.get<{ Params: { id: string } }>('/requirements/:id', async (request, reply) => {
    const requirement = await dataStore.getRequirementById(request.params.id);
    if (!requirement) {
      return reply.status(404).send({ success: false, error: '需求不存在' });
    }
    return reply.send({ success: true, data: requirement });
  });

  // POST /requirements - 创建需求
  fastify.post<{ Body: CreateRequirementDto }>('/requirements', { schema: requirementSchemas.create }, async (request: FastifyRequest<{ Body: CreateRequirementDto }>, reply: FastifyReply) => {
    const { projectId, title, description, priority } = request.body;
    if (!projectId || !title) {
      return reply.status(400).send({ success: false, error: '项目ID和标题不能为空' });
    }
    const requirement = await dataStore.createRequirement({ projectId, title, description, priority });

    // 自动触发工作流
    try {
      const workflowService = getWorkflowService();
      const workflow = await workflowService.processRequirement(requirement);
      return reply.status(201).send({
        success: true,
        data: requirement,
        workflow: {
          id: workflow.id,
          taskCount: workflow.tasks.length,
          status: workflow.status,
        }
      });
    } catch (error) {
      console.error('Workflow trigger error:', error);
      return reply.status(201).send({ success: true, data: requirement });
    }
  });

  // PUT /requirements/:id - 更新需求
  fastify.put<{ Params: { id: string }; Body: UpdateRequirementDto }>('/requirements/:id', { schema: requirementSchemas.update }, async (request, reply) => {
    const requirement = await dataStore.updateRequirement(request.params.id, request.body);
    if (!requirement) {
      return reply.status(404).send({ success: false, error: '需求不存在' });
    }
    return reply.send({ success: true, data: requirement });
  });

  // DELETE /requirements/:id - 删除需求
  fastify.delete<{ Params: { id: string } }>('/requirements/:id', async (request, reply) => {
    const deleted = await dataStore.deleteRequirement(request.params.id);
    if (!deleted) {
      return reply.status(404).send({ success: false, error: '需求不存在' });
    }
    return reply.send({ success: true, message: '需求已删除' });
  });
}
