import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { feedbackService } from '../../core/feedback/FeedbackService';

// Schema 定义
const feedbackSchemas = {
  create: {
    body: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string', minLength: 1, maxLength: 10000 },
        category: { type: 'string', enum: ['quality', 'speed', 'ui', 'feature', 'bug', 'other'] },
      },
    },
  },
  query: {
    querystring: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'resolved', 'rejected'] },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
        page: { type: 'integer', minimum: 1, default: 1 },
      },
    },
  },
  resolve: {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', minLength: 1 },
      },
    },
  },
  recordFailure: {
    body: {
      type: 'object',
      required: ['taskId', 'error'],
      properties: {
        taskId: { type: 'string', minLength: 1 },
        error: { type: 'string', minLength: 1, maxLength: 5000 },
        details: { type: 'object' },
      },
    },
  },
  failuresQuery: {
    querystring: {
      type: 'object',
      properties: {
        minOccurrences: { type: 'integer', minimum: 1, default: 2 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
  learningsQuery: {
    querystring: {
      type: 'object',
      properties: {
        applied: { type: 'string', enum: ['true', 'false'] },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      },
    },
  },
  applyLearning: {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', minLength: 1 },
      },
    },
  },
};

interface SubmitFeedbackBody {
  content: string;
  category?: 'quality' | 'speed' | 'ui' | 'feature' | 'bug' | 'other';
}

interface RecordFailureBody {
  taskId: string;
  error: string;
  details?: Record<string, any>;

export async function feedbackRoutes(fastify: FastifyInstance) {
  // POST /api/feedback - 提交反馈
  fastify.post<{ Body: SubmitFeedbackBody }>('/feedback', { schema: feedbackSchemas.create }, async (request: FastifyRequest<{ Body: SubmitFeedbackBody }>, reply: FastifyReply) => {
    const { content, category } = request.body;

    try {
      const feedback = await feedbackService.submitFeedback(content, category);
      return { success: true, data: feedback };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // GET /api/feedback - 获取反馈列表
  fastify.get<{ Querystring: { status?: string; limit?: number; page?: number } }>('/feedback', { schema: feedbackSchemas.query }, async (request: FastifyRequest<{ Querystring: { status?: string; limit?: number; page?: number } }>, reply: FastifyReply) => {
    const { status, limit = 10, page = 1 } = request.query;
    
    const feedbacks = await feedbackService.getFeedbacks(status as any, limit);
    return { success: true, data: feedbacks, pagination: { page, limit } };
  });

  // GET /api/feedback/stats - 反馈统计
  fastify.get('/feedback/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = await feedbackService.getFeedbackStats();
    return { success: true, data: stats };
  });

  // PUT /api/feedback/:id/resolve - 解决反馈
  fastify.put<{ Params: { id: string } }>('/feedback/:id/resolve', { schema: feedbackSchemas.resolve }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    
    const resolved = await feedbackService.resolveFeedback(id);
    if (!resolved) {
      return reply.status(404).send({ success: false, error: '反馈不存在' });
    }
    
    return { success: true, data: resolved };
  });

  // POST /api/feedback/failure - 记录失败
  fastify.post<{ Body: RecordFailureBody }>('/feedback/failure', { schema: feedbackSchemas.recordFailure }, async (request: FastifyRequest<{ Body: RecordFailureBody }>, reply: FastifyReply) => {
    const { taskId, error, details } = request.body;

    try {
      const failure = await feedbackService.recordFailure(taskId, error, details);
      return { success: true, data: failure };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // GET /api/feedback/failures - 失败模式分析
  fastify.get<{ Querystring: { minOccurrences?: number; limit?: number } }>('/feedback/failures', { schema: feedbackSchemas.failuresQuery }, async (request: FastifyRequest<{ Querystring: { minOccurrences?: number; limit?: number } }>, reply: FastifyReply) => {
    const { minOccurrences = 2, limit = 20 } = request.query;
    const patterns = await feedbackService.analyzeFailurePatterns(minOccurrences, limit);
    return { success: true, data: patterns };
  });

  // POST /api/feedback/learn - 从反馈学习
  fastify.post('/feedback/learn', async (request: FastifyRequest, reply: FastifyReply) => {
    const learnings = await feedbackService.learnFromFeedback();
    return { success: true, data: learnings };
  });

  // GET /api/feedback/learnings - 学习记录
  fastify.get<{ Querystring: { applied?: string; limit?: number } }>('/feedback/learnings', { schema: feedbackSchemas.learningsQuery }, async (request: FastifyRequest<{ Querystring: { applied?: string; limit?: number } }>, reply: FastifyReply) => {
    const { applied, limit = 10 } = request.query;
    
    const learnings = await feedbackService.getLearnings(applied === 'true');
    return { success: true, data: learnings.slice(0, limit) };
  });

  // PUT /api/feedback/learnings/:id/apply - 应用学习
  fastify.put<{ Params: { id: string } }>('/feedback/learnings/:id/apply', { schema: feedbackSchemas.applyLearning }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    
    const applied = await feedbackService.applyLearning(id);
    if (!applied) {
      return reply.status(404).send({ success: false, error: '学习记录不存在' });
    }
    
    return { success: true, message: '学习已应用' };
  });
}
