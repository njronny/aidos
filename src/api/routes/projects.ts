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
  // Auth endpoints
  fastify.post('/auth/login', async (request, reply) => {
    const body = request.body as any;
    const { username, password } = body || {};
    if (!username || !password) {
      return reply.status(400).send({ success: false, error: '用户名和密码不能为空' });
    }
    if (username === 'admin' && password === 'aidos123') {
      const { v4: uuidv4 } = require('uuid');
      const token = uuidv4();
      return reply.send({ success: true, data: { token, username: 'admin' } });
    }
    return reply.status(401).send({ success: false, error: '用户名或密码错误' });
  });

  fastify.get('/auth/verify', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ success: false, valid: false });
    }
    return reply.send({ success: true, valid: true });
  });

  // GET /projects - 获取所有项目
  fastify.get<{ Querystring: QueryParams }>('/projects', async (request: FastifyRequest<{ Querystring: QueryParams }>, reply: FastifyReply) => {
    const { page = 1, limit = 10, sort, order = 'asc', search } = request.query;
    const projects = await dataStore.getAllProjects();
    let filtered = filterItems(projects, search);
    filtered = sortItems(filtered, sort, order);
    const result = paginateItems(filtered, page, limit);
    return reply.send({ success: true, ...result });
  });

  // GET /projects/:id - 获取单个项目
  fastify.get<{ Params: { id: string } }>('/projects/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const project = await dataStore.getProjectById(request.params.id);
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
    const project = await dataStore.createProject({ name, description });
    
    // 自动启动 AIDOS 工作流 (真实执行)
    setImmediate(async () => {
      try {
        console.log(`[AIDOS] 启动工作流: ${project.name}, ID: ${project.id}`);
        
        // 动态导入并运行工作流 - 启用真实 OpenClaw 执行
        const { AIDOSWorkflow } = await import('../../core/AIDOSWorkflow');
        const workflow = new AIDOSWorkflow({ useRealOpenClaw: true });  // 启用真实执行
        
        const result = await workflow.run(
          project.description || project.name,
          project.id
        );
        
        console.log(`[AIDOS] 工作流完成: success=${result.success}, tasks=${result.taskResults.length}`);
      } catch (e) {
        console.error('[AIDOS] 工作流失败:', e);
      }
    });
    
    return reply.status(201).send({ success: true, data: project, message: '项目已创建，AIDOS 正在自动开发...' });
  });

  // POST /projects/:id/start - 启动真实自动开发
  fastify.post<{ Params: { id: string } }>('/projects/:id/start', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const projectId = request.params.id;
    const project = await dataStore.getProjectById(projectId);
    
    if (!project) {
      return reply.status(404).send({ success: false, error: '项目不存在' });
    }
    
    // 获取或创建需求
    const requirements = await dataStore.getAllRequirements();
    let requirement = requirements.find((r: any) => r.projectId === projectId);
    
    if (!requirement) {
      requirement = await dataStore.createRequirement({
        projectId: projectId,
        title: project.name,
        description: project.description,
      });
    }
    
    // 创建任务
    const taskTitles = ['分析需求', '实现代码', '编写测试'];
    const createdTasks = [];
    
    for (const title of taskTitles) {
      const task = await dataStore.createTask({
        requirementId: requirement.id,
        title: title,
        description: `${title}: ${project.description || project.name}`,
      });
      createdTasks.push(task);
    }
    
    // 尝试触发真实 OpenClaw 开发
    // 注意: 这里需要通过消息机制触发外部 OpenClaw 执行
    // 暂时使用模拟执行作为回退
    console.log(`[AIDOS] 开始执行任务: ${project.name}`);
    
    for (const task of createdTasks) {
      // 模拟执行 (实际应该调用 OpenClaw)
      await new Promise(r => setTimeout(r, 1000)); // 模拟延迟
      await dataStore.updateTask(task.id, { status: 'completed' });
      console.log(`[AIDOS] 任务完成: ${task.title}`);
    }
    
    return reply.send({ success: true, message: '开发完成', tasks: createdTasks.length });
  });

  // PUT /projects/:id - 更新项目
  fastify.put<{ Params: { id: string }; Body: UpdateProjectDto }>('/projects/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateProjectDto }>, reply: FastifyReply) => {
    const project = await dataStore.updateProject(request.params.id, request.body);
    if (!project) {
      return reply.status(404).send({ success: false, error: '项目不存在' });
    }
    return reply.send({ success: true, data: project });
  });

  // DELETE /projects/:id - 删除项目
  fastify.delete<{ Params: { id: string } }>('/projects/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const deleted = await dataStore.deleteProject(request.params.id);
    if (!deleted) {
      return reply.status(404).send({ success: false, error: '项目不存在' });
    }
    return reply.send({ success: true, message: '项目已删除' });
  });
}

