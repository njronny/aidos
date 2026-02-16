import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dataStore } from '../store';
import { Agent, CreateAgentDto, UpdateAgentDto, QueryParams } from '../types';

// Schema 定义
const agentSchemas = {
  create: {
    body: {
      type: 'object',
      required: ['name', 'type'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        type: { type: 'string', enum: ['pm', 'architect', 'developer', 'qa', 'designer', 'reviewer'] },
        description: { type: 'string', maxLength: 1000 },
        config: { type: 'object' },
      },
    },
  },
  update: {
    body: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        status: { type: 'string', enum: ['active', 'inactive', 'busy'] },
        config: { type: 'object' },
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
        type: { type: 'string' },
        status: { type: 'string' },
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

export async function agentRoutes(fastify: FastifyInstance) {
  // GET /agents - 获取所有代理
  fastify.get<{ Querystring: QueryParams & { type?: string; status?: string } }>('/agents', { schema: agentSchemas.query }, async (request, reply) => {
    const { page = 1, limit = 10, sort, order = 'asc', search, type, status } = request.query;
    const agents = await dataStore.getAllAgents({ type, status });
    let filtered = filterItems(agents, search);
    filtered = sortItems(filtered, sort, order);
    const result = paginateItems(filtered, page, limit);
    return reply.send({ success: true, ...result });
  });

  // GET /agents/:id - 获取单个代理
  fastify.get<{ Params: { id: string } }>('/agents/:id', async (request, reply) => {
    const agent = await dataStore.getAgentById(request.params.id);
    if (!agent) {
      return reply.status(404).send({ success: false, error: '代理不存在' });
    }
    return reply.send({ success: true, data: agent });
  });

  // POST /agents - 创建代理
  fastify.post<{ Body: CreateAgentDto }>('/agents', { schema: agentSchemas.create }, async (request: FastifyRequest<{ Body: CreateAgentDto }>, reply: FastifyReply) => {
    const { name, type, capabilities } = request.body;
    if (!name || !type) {
      return reply.status(400).send({ success: false, error: '名称和类型不能为空' });
    }
    const agent = await dataStore.createAgent({ name, type, capabilities });
    return reply.status(201).send({ success: true, data: agent });
  });

  // PUT /agents/:id - 更新代理
  fastify.put<{ Params: { id: string }; Body: UpdateAgentDto }>('/agents/:id', { schema: agentSchemas.update }, async (request, reply) => {
    const agent = await dataStore.updateAgent(request.params.id, request.body);
    if (!agent) {
      return reply.status(404).send({ success: false, error: '代理不存在' });
    }
    return reply.send({ success: true, data: agent });
  });

  // DELETE /agents/:id - 删除代理
  fastify.delete<{ Params: { id: string } }>('/agents/:id', async (request, reply) => {
    const deleted = await dataStore.deleteAgent(request.params.id);
    if (!deleted) {
      return reply.status(404).send({ success: false, error: '代理不存在' });
    }
    return reply.send({ success: true, message: '代理已删除' });
  });
}
