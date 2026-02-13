import { QueueService, QUEUE_NAMES } from './QueueService';
import { DeadLetterQueue, DLQStats } from './DeadLetterQueue';
import Redis from 'ioredis';

// Queue health status
export type QueueHealthStatus = 'healthy' | 'warning' | 'critical';

// Queue alert thresholds
export interface AlertThresholds {
  maxWaitingJobs?: number;
  maxActiveJobs?: number;
  maxFailedJobs?: number;
  maxAvgWaitTimeMs?: number;
  maxDLQEntries?: number;
  maxRetryAgeMs?: number;
}

// Queue health report
export interface QueueHealthReport {
  status: QueueHealthStatus;
  timestamp: Date;
  taskQueue: QueueMetrics;
  schedulerQueue: QueueMetrics;
  deadLetterQueue: DLQStats;
  alerts: QueueAlert[];
  recommendations: string[];
}

// Queue metrics
export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused?: number;
}

// Queue alert
export interface QueueAlert {
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
}

// Monitor configuration
export interface QueueMonitorConfig {
  redisOptions?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
  thresholds?: AlertThresholds;
  checkIntervalMs?: number;
  enableAutoRecovery?: boolean;
}

// Default thresholds
const DEFAULT_THRESHOLDS: Required<AlertThresholds> = {
  maxWaitingJobs: 1000,
  maxActiveJobs: 100,
  maxFailedJobs: 50,
  maxAvgWaitTimeMs: 60000, // 1 minute
  maxDLQEntries: 100,
  maxRetryAgeMs: 300000, // 5 minutes
};

/**
 * QueueMonitor - Monitors queue health and generates alerts
 */
export class QueueMonitor {
  private queueService: QueueService;
  private dlq: DeadLetterQueue;
  private thresholds: Required<AlertThresholds>;
  private checkIntervalMs: number;
  private enableAutoRecovery: boolean;
  private intervalHandle?: NodeJS.Timeout;
  private alertCallbacks: Array<(alerts: QueueAlert[]) => void> = [];

  constructor(config: QueueMonitorConfig = {}) {
    const redisOptions = {
      host: config.redisOptions?.host || process.env.REDIS_HOST || 'localhost',
      port: config.redisOptions?.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: config.redisOptions?.password || process.env.REDIS_PASSWORD,
      db: config.redisOptions?.db || parseInt(process.env.REDIS_DB || '0'),
    };

    this.queueService = new QueueService(redisOptions);
    this.dlq = new DeadLetterQueue({ redisOptions });
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...config.thresholds } as Required<AlertThresholds>;
    this.checkIntervalMs = config.checkIntervalMs || 60000; // 1 minute
    this.enableAutoRecovery = config.enableAutoRecovery ?? true;
  }

  /**
   * Get metrics for a specific queue
   */
  async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
    const counts = await this.queueService.getJobCounts(queueName);
    return counts;
  }

  /**
   * Check queue health and generate alerts
   */
  async checkHealth(): Promise<QueueHealthReport> {
    const alerts: QueueAlert[] = [];
    const recommendations: string[] = [];

    // Get metrics for both queues
    const taskQueueMetrics = await this.getQueueMetrics(QUEUE_NAMES.TASK_QUEUE);
    const schedulerQueueMetrics = await this.getQueueMetrics(QUEUE_NAMES.SCHEDULER_QUEUE);
    const dlqStats = await this.dlq.getStats();

    // Check task queue alerts
    const taskAlerts = this.evaluateMetrics('taskQueue', taskQueueMetrics);
    alerts.push(...taskAlerts);

    // Check scheduler queue alerts
    const schedulerAlerts = this.evaluateMetrics('schedulerQueue', schedulerQueueMetrics);
    alerts.push(...schedulerAlerts);

    // Check DLQ
    if (dlqStats.totalEntries > this.thresholds.maxDLQEntries) {
      alerts.push({
        severity: dlqStats.totalEntries > this.thresholds.maxDLQEntries * 2 ? 'critical' : 'warning',
        message: `Dead letter queue has ${dlqStats.totalEntries} entries (threshold: ${this.thresholds.maxDLQEntries})`,
        metric: 'dlqEntries',
        value: dlqStats.totalEntries,
        threshold: this.thresholds.maxDLQEntries,
      });
      recommendations.push('Review and resolve dead letter queue entries');
    }

    if (dlqStats.pendingManualIntervention > 0) {
      alerts.push({
        severity: 'warning',
        message: `${dlqStats.pendingManualIntervention} DLQ entries require manual intervention`,
        metric: 'manualInterventionRequired',
        value: dlqStats.pendingManualIntervention,
        threshold: 0,
      });
      recommendations.push('Review DLQ entries requiring manual intervention');
    }

    // Determine overall status
    let status: QueueHealthStatus = 'healthy';
    if (alerts.some(a => a.severity === 'critical')) {
      status = 'critical';
    } else if (alerts.some(a => a.severity === 'warning')) {
      status = 'warning';
    }

    // Auto-recovery recommendations
    if (this.enableAutoRecovery) {
      if (taskQueueMetrics.failed > this.thresholds.maxFailedJobs) {
        recommendations.push('Consider retrying failed jobs automatically');
      }
      if (taskQueueMetrics.waiting > this.thresholds.maxWaitingJobs) {
        recommendations.push('Consider scaling workers or optimizing task processing');
      }
    }

    return {
      status,
      timestamp: new Date(),
      taskQueue: taskQueueMetrics,
      schedulerQueue: schedulerQueueMetrics,
      deadLetterQueue: dlqStats,
      alerts,
      recommendations,
    };
  }

  /**
   * Evaluate metrics against thresholds
   */
  private evaluateMetrics(
    queueName: string,
    metrics: QueueMetrics
  ): QueueAlert[] {
    const alerts: QueueAlert[] = [];

    // Check waiting jobs
    if (metrics.waiting > this.thresholds.maxWaitingJobs) {
      alerts.push({
        severity: metrics.waiting > this.thresholds.maxWaitingJobs * 2 ? 'critical' : 'warning',
        message: `${queueName}: ${metrics.waiting} waiting jobs (threshold: ${this.thresholds.maxWaitingJobs})`,
        metric: 'waiting',
        value: metrics.waiting,
        threshold: this.thresholds.maxWaitingJobs,
      });
    }

    // Check active jobs
    if (metrics.active > this.thresholds.maxActiveJobs) {
      alerts.push({
        severity: 'warning',
        message: `${queueName}: ${metrics.active} active jobs (threshold: ${this.thresholds.maxActiveJobs})`,
        metric: 'active',
        value: metrics.active,
        threshold: this.thresholds.maxActiveJobs,
      });
    }

    // Check failed jobs
    if (metrics.failed > this.thresholds.maxFailedJobs) {
      alerts.push({
        severity: metrics.failed > this.thresholds.maxFailedJobs * 2 ? 'critical' : 'warning',
        message: `${queueName}: ${metrics.failed} failed jobs (threshold: ${this.thresholds.maxFailedJobs})`,
        metric: 'failed',
        value: metrics.failed,
        threshold: this.thresholds.maxFailedJobs,
      });
    }

    return alerts;
  }

  /**
   * Check if queue is healthy (simple boolean check)
   */
  async isHealthy(): Promise<boolean> {
    const report = await this.checkHealth();
    return report.status === 'healthy';
  }

  /**
   * Get queue backlog (waiting + active + delayed)
   */
  async getBacklog(): Promise<{
    taskQueue: number;
    schedulerQueue: number;
    total: number;
  }> {
    const taskMetrics = await this.getQueueMetrics(QUEUE_NAMES.TASK_QUEUE);
    const schedulerMetrics = await this.getQueueMetrics(QUEUE_NAMES.SCHEDULER_QUEUE);

    const taskBacklog = taskMetrics.waiting + taskMetrics.active + taskMetrics.delayed;
    const schedulerBacklog = schedulerMetrics.waiting + schedulerMetrics.active + schedulerMetrics.delayed;

    return {
      taskQueue: taskBacklog,
      schedulerQueue: schedulerBacklog,
      total: taskBacklog + schedulerBacklog,
    };
  }

  /**
   * Register alert callback
   */
  onAlerts(callback: (alerts: QueueAlert[]) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Start automatic monitoring
   */
  startMonitoring(onAlert?: (report: QueueHealthReport) => void): void {
    if (this.intervalHandle) {
      return; // Already running
    }

    const check = async () => {
      const report = await this.checkHealth();

      if (report.alerts.length > 0) {
        // Notify callbacks
        this.alertCallbacks.forEach(cb => cb(report.alerts));
        
        // Notify optional callback
        if (onAlert) {
          onAlert(report);
        }
      }
    };

    // Run immediately
    check();

    // Schedule periodic checks
    this.intervalHandle = setInterval(check, this.checkIntervalMs);
  }

  /**
   * Stop automatic monitoring
   */
  stopMonitoring(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
  }

  /**
   * Get detailed statistics for monitoring dashboard
   */
  async getDetailedStats(): Promise<{
    health: QueueHealthReport;
    throughput: {
      completedPerMinute: number;
      failedPerMinute: number;
    };
    performance: {
      avgWaitTimeMs: number;
      avgProcessTimeMs: number;
    };
  }> {
    const health = await this.checkHealth();

    // These would ideally come from Redis metrics
    // For now, return placeholder values
    return {
      health,
      throughput: {
        completedPerMinute: 0,
        failedPerMinute: 0,
      },
      performance: {
        avgWaitTimeMs: 0,
        avgProcessTimeMs: 0,
      },
    };
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    this.stopMonitoring();
    await this.queueService.close();
    await this.dlq.close();
  }
}

export default QueueMonitor;
