import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dataStore } from '../store';
import { Project, CreateProjectDto, UpdateProjectDto, QueryParams } from '../types';

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

export async function projectRoutes(fastify: FastifyInstance) {
  // GET /projects - 获取所有项目
  fastify.get<{ Querystring: QueryParams }>('/projects', async (request: FastifyRequest<{ Querystring: QueryParams }>, reply: FastifyReply) => {
    const { page = 1, limit = 10, sort, order = 'asc', search } = request.query;
    let projects = dataStore.getAllProjects();
    projects = filterItems(projects, search);
    projects = sortItems(projects, sort, order);
    const result = paginateItems(projects, page, limit);
    return reply.send({ success: true, ...result });
  });

  // GET /projects/:id - 获取单个项目
  fastify.get<{ Params: { id: string } }>('/projects/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const project = dataStore.getProjectById(request.params.id);
    if (!project) {
      return reply.status(404).send({ success: false, error: '项目不存在' });
    }
    return reply.send({ success: true, data: project });
  });

  // POST /projects - 创建项目
  fastify.post<{ Body: CreateProjectDto }>('/projects', async (request: FastifyRequest<{ Body: CreateProjectDto }>, reply: FastifyReply) => {
    const { name, description } = request.body;
    if (!name) {
      return reply.status(400).send({ success: false, error: '项目名称不能为空' });
    }
    const project = dataStore.createProject({ name, description });
    return reply.status(201).send({ success: true, data: project });
  });

  // PUT /projects/:id - 更新项目
  fastify.put<{ Params: { id: string }; Body: UpdateProjectDto }>('/projects/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateProjectDto }>, reply: FastifyReply) => {
    const project = dataStore.updateProject(request.params.id, request.body);
    if (!project) {
      return reply.status(404).send({ success: false, error: '项目不存在' });
    }
    return reply.send({ success: true, data: project });
  });

  // DELETE /projects/:id - 删除项目
  fastify.delete<{ Params: { id: string } }>('/projects/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const deleted = dataStore.deleteProject(request.params.id);
    if (!deleted) {
      return reply.status(404).send({ success: false, error: '项目不存在' });
    }
    return reply.send({ success: true, message: '项目已删除' });
  });
}
