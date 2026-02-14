import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requirementsAnalyzer, AnalysisResult, WorkEstimate } from '../../core/requirements/RequirementsAnalyzer';

interface AnalyzeBody {
  requirement: string;
}

interface EstimateBody {
  requirement: string;
}

interface TemplateBody {
  type: string;
}

export async function requirementsAnalyzerRoutes(fastify: FastifyInstance) {
  // POST /api/requirements/analyze - 分析需求并生成任务
  fastify.post('/requirements/analyze', async (request: FastifyRequest<{ Body: AnalyzeBody }>, reply) => {
    const { requirement } = request.body;

    if (!requirement || requirement.trim().length === 0) {
      return reply.status(400).send({ success: false, error: '需求描述不能为空' });
    }

    try {
      const result: AnalysisResult = await requirementsAnalyzer.analyzeRequirement(requirement);
      
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '分析失败',
      };
    }
  });

  // POST /api/requirements/estimate - 估算工作量
  fastify.post('/requirements/estimate', async (request: FastifyRequest<{ Body: EstimateBody }>, reply) => {
    const { requirement } = request.body;

    if (!requirement) {
      return reply.status(400).send({ success: false, error: '需求描述不能为空' });
    }

    try {
      const estimate: WorkEstimate = await requirementsAnalyzer.estimateWork(requirement);
      
      return {
        success: true,
        data: estimate,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '估算失败',
      };
    }
  });

  // POST /api/requirements/template - 生成任务模板
  fastify.post('/requirements/template', async (request: FastifyRequest<{ Body: TemplateBody }>, reply) => {
    const { type } = request.body;

    if (!type) {
      return reply.status(400).send({ success: false, error: '类型不能为空' });
    }

    try {
      const template = await requirementsAnalyzer.generateTaskTemplate(type);
      
      return {
        success: true,
        data: template,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '生成失败',
      };
    }
  });

  // GET /api/requirements/types - 支持的需求类型
  fastify.get('/requirements/types', async (request, reply) => {
    return {
      success: true,
      data: {
        types: ['电商', '登录', 'API', 'CRUD', '前端', '后端', '数据库', '测试'],
        priorities: ['low', 'medium', 'high', 'critical'],
        complexities: ['simple', 'medium', 'complex'],
      },
    };
  });
}
