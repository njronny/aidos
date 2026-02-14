import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { feedbackService } from '../../core/feedback/FeedbackService';

interface SubmitFeedbackBody {
  content: string;
  category?: 'quality' | 'speed' | 'ui' | 'feature' | 'bug' | 'other';
}

interface RecordFailureBody {
  taskId: string;
  error: string;
  details?: Record<string, any>;
}

export async function feedbackRoutes(fastify: FastifyInstance) {
  // POST /api/feedback - 提交反馈
  fastify.post('/feedback', async (request: FastifyRequest<{ Body: SubmitFeedbackBody }>, reply) => {
    const { content, category } = request.body;

    if (!content || content.trim().length === 0) {
      return reply.status(400).send({ success: false, error: '反馈内容不能为空' });
    }

    try {
      const feedback = await feedbackService.submitFeedback(content, category);
      return { success: true, data: feedback };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // GET /api/feedback - 获取反馈列表
  fastify.get('/feedback', async (request: FastifyRequest<{ Querystring: { status?: string; limit?: number } }>, reply) => {
    const { status, limit } = request.query;
    
    const feedbacks = await feedbackService.getFeedbacks(status as any, limit);
    return { success: true, data: feedbacks };
  });

  // GET /api/feedback/stats - 反馈统计
  fastify.get('/feedback/stats', async (request, reply) => {
    const stats = await feedbackService.getFeedbackStats();
    return { success: true, data: stats };
  });

  // PUT /api/feedback/:id/resolve - 解决反馈
  fastify.put('/feedback/:id/resolve', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = request.params;
    
    const resolved = await feedbackService.resolveFeedback(id);
    if (!resolved) {
      return reply.status(404).send({ success: false, error: '反馈不存在' });
    }
    
    return { success: true, data: resolved };
  });

  // POST /api/feedback/failure - 记录失败
  fastify.post('/feedback/failure', async (request: FastifyRequest<{ Body: RecordFailureBody }>, reply) => {
    const { taskId, error, details } = request.body;

    if (!taskId || !error) {
      return reply.status(400).send({ success: false, error: 'taskId 和 error 不能为空' });
    }

    try {
      const failure = await feedbackService.recordFailure(taskId, error, details);
      return { success: true, data: failure };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // GET /api/feedback/failures - 失败模式分析
  fastify.get('/feedback/failures', async (request, reply) => {
    const patterns = await feedbackService.analyzeFailurePatterns();
    return { success: true, data: patterns };
  });

  // POST /api/feedback/learn - 从反馈学习
  fastify.post('/feedback/learn', async (request, reply) => {
    const learnings = await feedbackService.learnFromFeedback();
    return { success: true, data: learnings };
  });

  // GET /api/feedback/learnings - 学习记录
  fastify.get('/feedback/learnings', async (request: FastifyRequest<{ Querystring: { applied?: string } }>, reply) => {
    const { applied } = request.query;
    
    const learnings = await feedbackService.getLearnings(applied === 'true');
    return { success: true, data: learnings };
  });

  // PUT /api/feedback/learnings/:id/apply - 应用学习
  fastify.put('/feedback/learnings/:id/apply', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = request.params;
    
    const applied = await feedbackService.applyLearning(id);
    if (!applied) {
      return reply.status(404).send({ success: false, error: '学习记录不存在' });
    }
    
    return { success: true, message: '学习已应用' };
  });
}
