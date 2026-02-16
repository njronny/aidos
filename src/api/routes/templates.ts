import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { templateService } from '../../core/templates/TemplateService';

// Schema 定义
const templateSchemas = {
  projectQuery: {
    querystring: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        search: { type: 'string', maxLength: 100 },
      },
    },
  },
  taskQuery: {
    querystring: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        agentId: { type: 'string' },
      },
    },
  },
  createProject: {
    body: {
      type: 'object',
      required: ['templateId'],
      properties: {
        templateId: { type: 'string', minLength: 1 },
        name: { type: 'string', maxLength: 200 },
        description: { type: 'string', maxLength: 5000 },
      },
    },
  },
  generateTask: {
    body: {
      type: 'object',
      required: ['templateId', 'context'],
      properties: {
        templateId: { type: 'string', minLength: 1 },
        context: { type: 'string', minLength: 1, maxLength: 10000 },
        options: { type: 'object' },
      },
    },
  },
  addTemplate: {
    body: {
      type: 'object',
      required: ['template'],
      properties: {
        template: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', maxLength: 2000 },
            category: { type: 'string' },
            schema: { type: 'object' },
          },
        },
      },
    },
  },
};

interface CreateProjectBody {
  templateId: string;
  name?: string;
  description?: string;
}

interface GenerateTaskBody {
  templateId: string;
  context: string;
  options?: Record<string, any>;
}

interface AddTemplateBody {
  template: {
    id: string;
    name: string;
    description?: string;
    category?: string;
    schema?: Record<string, any>;
  };
}

export async function templateRoutes(fastify: FastifyInstance) {
  // GET /api/templates/projects - 项目模板列表
  fastify.get('/templates/projects', async (request, reply) => {
    const templates = templateService.getProjectTemplates();
    return { success: true, data: templates };
  });

  // GET /api/templates/tasks - 任务模板列表
  fastify.get('/templates/tasks', async (request: FastifyRequest<{ Querystring: { type?: string } }>, reply) => {
    const { type } = request.query;
    const templates = templateService.getTaskTemplates(type);
    return { success: true, data: templates };
  });

  // POST /api/templates/projects - 根据模板创建项目
  fastify.post('/templates/projects', async (request: FastifyRequest<{ Body: CreateProjectBody }>, reply) => {
    const { templateId } = request.body;

    if (!templateId) {
      return reply.status(400).send({ success: false, error: 'templateId 不能为空' });
    }

    try {
      const project = await templateService.createProjectFromTemplate(templateId);
      return { success: true, data: project };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // POST /api/templates/tasks - 生成任务
  fastify.post('/templates/tasks', async (request: FastifyRequest<{ Body: GenerateTaskBody }>, reply) => {
    const { templateId, context } = request.body;

    if (!templateId || !context) {
      return reply.status(400).send({ success: false, error: 'templateId 和 context 不能为空' });
    }

    try {
      const tasks = await templateService.generateTaskFromTemplate(templateId, context);
      return { success: true, data: tasks };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // POST /api/templates/projects/custom - 添加自定义项目模板
  fastify.post('/templates/projects/custom', async (request: FastifyRequest<{ Body: AddTemplateBody }>, reply) => {
    const { template } = request.body;

    if (!template || !template.id || !template.name) {
      return reply.status(400).send({ success: false, error: '无效的模板数据' });
    }

    try {
      templateService.addProjectTemplate(template);
      return { success: true, message: '模板添加成功' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // POST /api/templates/tasks/custom - 添加自定义任务模板
  fastify.post('/templates/tasks/custom', async (request: FastifyRequest<{ Body: AddTemplateBody }>, reply) => {
    const { template } = request.body;

    if (!template || !template.id || !template.name) {
      return reply.status(400).send({ success: false, error: '无效的模板数据' });
    }

    try {
      templateService.addTaskTemplate(template);
      return { success: true, message: '模板添加成功' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
