import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { monitoringService } from '../../core/monitoring/MonitoringService';

interface MetricsQuery {
  name?: string;
  limit?: number;
}

interface AlertsQuery {
  resolved?: boolean;
  limit?: number;
}

export async function monitoringRoutes(fastify: FastifyInstance) {
  // 启动监控服务
  monitoringService.start(30000);

  // GET /api/monitoring/health - 健康检查
  fastify.get('/monitoring/health', async (request, reply) => {
    try {
      const health = await monitoringService.getHealthStatus();
      return {
        success: true,
        data: health,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // GET /api/monitoring/metrics - 指标数据
  fastify.get('/monitoring/metrics', async (request: FastifyRequest<{ Querystring: MetricsQuery }>, reply) => {
    const { name, limit = 100 } = request.query;
    
    const metrics = monitoringService.getMetrics(name, limit);
    
    return {
      success: true,
      data: metrics,
    };
  });

  // POST /api/monitoring/metrics - 记录自定义指标
  fastify.post('/monitoring/metrics', async (request: FastifyRequest<{ Body: { name: string; value: number; unit?: string } }>, reply) => {
    const { name, value, unit } = request.body;
    
    if (!name || value === undefined) {
      return reply.status(400).send({ success: false, error: 'name and value are required' });
    }
    
    monitoringService.recordCustomMetric(name, value, unit);
    
    return {
      success: true,
      message: 'Metric recorded',
    };
  });

  // GET /api/monitoring/alerts - 告警列表
  fastify.get('/monitoring/alerts', async (request: FastifyRequest<{ Querystring: AlertsQuery }>, reply) => {
    const { resolved, limit = 50 } = request.query;
    
    const alerts = monitoringService.getAlerts(resolved, limit);
    
    return {
      success: true,
      data: alerts,
    };
  });

  // PUT /api/monitoring/alerts/:id/resolve - 解决告警
  fastify.put('/monitoring/alerts/:id/resolve', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = request.params;
    
    const resolved = monitoringService.resolveAlert(id);
    
    return {
      success: resolved,
      message: resolved ? 'Alert resolved' : 'Alert not found',
    };
  });

  // GET /api/monitoring/summary - 监控摘要
  fastify.get('/monitoring/summary', async (request, reply) => {
    const summary = monitoringService.getSummary();
    
    return {
      success: true,
      data: {
        ...summary,
        uptime: Math.floor(summary.uptime / 1000), // 转换为秒
      },
    };
  });

  // PUT /api/monitoring/thresholds - 更新告警阈值
  fastify.put('/monitoring/thresholds', async (request: FastifyRequest<{ Body: { cpu?: number; memory?: number; disk?: number } }>, reply) => {
    const { cpu, memory, disk } = request.body;
    
    monitoringService.setThresholds({ cpu, memory, disk });
    
    return {
      success: true,
      message: 'Thresholds updated',
    };
  });
}
