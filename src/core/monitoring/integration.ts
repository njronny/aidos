/**
 * Monitoring Integration - 监控集成模块
 * 用于将监控服务集成到系统各个组件
 */

import { TaskScheduler } from '../scheduler/TaskScheduler';
import { AgentPool } from '../agents/AgentPool';
import { AgentStatus } from '../agents/Agent';
import { getMetricsService, getAlertService, CoreMetricName } from './index';

/**
 * 初始化TaskScheduler的监控集成
 */
export function initSchedulerMonitoring(scheduler: TaskScheduler): void {
  // 监听任务事件
  scheduler.onEvent((event) => {
    const metrics = getMetricsService();

    switch (event.type) {
      case 'task_completed':
        if (event.data && typeof event.data === 'object' && 'duration' in event.data) {
          const duration = (event.data as any).duration;
          if (typeof duration === 'number') {
            metrics.recordHistogram(CoreMetricName.TASK_DURATION, duration);
          }
        }
        break;

      case 'task_failed':
        // Task失败已经在TaskScheduler中通过recordTaskComplete处理
        break;

      case 'task_blocked':
        // 可以添加额外的阻塞任务指标
        break;
    }
  });

  console.log('[Monitoring] TaskScheduler monitoring initialized');
}

/**
 * 初始化AgentPool的监控集成
 */
export function initAgentPoolMonitoring(agentPool: AgentPool): void {
  // 定期更新Agent状态指标
  const updateAgentMetrics = () => {
    const metrics = getMetricsService();
    
    let activeCount = 0;
    let idleCount = 0;

    for (const agent of agentPool.getAllAgents()) {
      if (agent.status === AgentStatus.BUSY) {
        activeCount++;
      } else if (agent.status === AgentStatus.IDLE) {
        idleCount++;
      }
    }

    metrics.setAgentCounts(activeCount, idleCount);
  };

  // 初始更新
  updateAgentMetrics();

  // 定期更新（每10秒）
  setInterval(updateAgentMetrics, 10000);

  console.log('[Monitoring] AgentPool monitoring initialized');
}

/**
 * 启动告警评估循环
 */
export function startAlertEvaluation(intervalMs: number = 30000): NodeJS.Timeout {
  const alertService = getAlertService();
  
  // 注册告警处理器 - 控制台输出
  alertService.onAlert((alert) => {
    const severityEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    };
    
    console.log(
      `[ALERT ${severityEmoji[alert.severity]}] ${alert.severity.toUpperCase()}: ${alert.message}`
    );
  });

  // 定期评估告警规则
  const interval = setInterval(() => {
    alertService.evaluate();
  }, intervalMs);

  console.log(`[Monitoring] Alert evaluation started (interval: ${intervalMs}ms)`);
  
  return interval;
}

/**
 * 获取监控汇总信息
 */
export function getMonitoringSummary() {
  const metricsService = getMetricsService();
  const alertService = getAlertService();

  return {
    metrics: metricsService.getMetricsSummary(),
    alerts: alertService.getAlertStats(),
    activeAlerts: alertService.getActiveAlerts(),
  };
}

export default {
  initSchedulerMonitoring,
  initAgentPoolMonitoring,
  startAlertEvaluation,
  getMonitoringSummary,
};
