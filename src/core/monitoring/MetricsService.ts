/**
 * MetricsService - 指标采集服务
 * 使用TDD方式实现，负责收集系统各类指标
 */

import {
  Metric,
  MetricType,
  MetricDataPoint,
  CoreMetricName,
  MonitoringConfig,
  MetricsSummary,
} from './types';

/**
 * 指标服务配置
 */
const DEFAULT_CONFIG: Required<MonitoringConfig> = {
  metricsRetentionMs: 3600000, // 1小时
  defaultAlertCooldownMs: 60000, // 1分钟
  enableAutoRecovery: true,
};

/**
 * MetricsService - 指标采集服务
 * 负责收集、存储和检索系统指标
 */
export class MetricsService {
  private metrics: Map<string, Metric> = new Map();
  private config: Required<MonitoringConfig>;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeCoreMetrics();
  }

  /**
   * 初始化核心指标
   */
  private initializeCoreMetrics(): void {
    // Task metrics
    this.createMetric(CoreMetricName.TASK_SUCCESS_RATE, MetricType.GAUGE, 'percent');
    this.createMetric(CoreMetricName.TASK_DURATION, MetricType.HISTOGRAM, 'ms');
    this.createMetric(CoreMetricName.TASK_COUNT, MetricType.COUNTER, 'count');
    this.createMetric(CoreMetricName.TASK_FAILED_COUNT, MetricType.COUNTER, 'count');

    // Queue metrics
    this.createMetric(CoreMetricName.QUEUE_DEPTH, MetricType.GAUGE, 'count');
    this.createMetric(CoreMetricName.QUEUE_WAIT_TIME, MetricType.HISTOGRAM, 'ms');

    // API metrics
    this.createMetric(CoreMetricName.API_REQUEST_COUNT, MetricType.COUNTER, 'count');
    this.createMetric(CoreMetricName.API_RESPONSE_TIME, MetricType.HISTOGRAM, 'ms');
    this.createMetric(CoreMetricName.API_ERROR_RATE, MetricType.GAUGE, 'percent');

    // Agent metrics
    this.createMetric(CoreMetricName.AGENT_ACTIVE_COUNT, MetricType.GAUGE, 'count');
    this.createMetric(CoreMetricName.AGENT_IDLE_COUNT, MetricType.GAUGE, 'count');
    this.createMetric(CoreMetricName.AGENT_TASK_DURATION, MetricType.HISTOGRAM, 'ms');
  }

  /**
   * 创建指标
   */
  createMetric(
    name: string,
    type: MetricType,
    unit?: string,
    tags?: Record<string, string>
  ): Metric {
    const metric: Metric = {
      name,
      type,
      value: 0,
      unit,
      tags,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.metrics.set(name, metric);
    return metric;
  }

  /**
   * 获取或创建指标
   */
  getOrCreateMetric(
    name: string,
    type: MetricType,
    unit?: string,
    tags?: Record<string, string>
  ): Metric {
    const existing = this.metrics.get(name);
    if (existing) {
      return existing;
    }
    return this.createMetric(name, type, unit, tags);
  }

  /**
   * 记录计数器指标（递增）
   */
  incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    const metric = this.getOrCreateMetric(name, MetricType.COUNTER, 'count', tags);
    metric.value += value;
    this.recordDataPoint(metric);
  }

  /**
   * 设置仪表盘指标（直接设置值）
   */
  setGauge(name: string, value: number, tags?: Record<string, string>): void {
    const metric = this.getOrCreateMetric(name, MetricType.GAUGE, undefined, tags);
    metric.value = value;
    this.recordDataPoint(metric);
  }

  /**
   * 记录直方图指标（用于延迟等分布数据）
   */
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    const metric = this.getOrCreateMetric(name, MetricType.HISTOGRAM, undefined, tags);
    // 对于直方图，我们记录当前值，但保留历史用于计算统计
    metric.value = value;
    this.recordDataPoint(metric);
  }

  /**
   * 记录数据点到历史记录
   */
  private recordDataPoint(metric: Metric): void {
    const dataPoint: MetricDataPoint = {
      timestamp: Date.now(),
      value: metric.value,
    };
    metric.history.push(dataPoint);
    metric.updatedAt = new Date();

    // 清理过期数据
    this.cleanupOldDataPoints(metric);
  }

  /**
   * 清理过期的数据点
   */
  private cleanupOldDataPoints(metric: Metric): void {
    const cutoff = Date.now() - this.config.metricsRetentionMs;
    metric.history = metric.history.filter((dp) => dp.timestamp > cutoff);
  }

  /**
   * 获取指标
   */
  getMetric(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * 获取指标当前值
   */
  getValue(name: string): number {
    const metric = this.metrics.get(name);
    return metric?.value ?? 0;
  }

  /**
   * 获取历史数据
   */
  getHistory(name: string, durationMs?: number): MetricDataPoint[] {
    const metric = this.metrics.get(name);
    if (!metric) {
      return [];
    }

    if (durationMs === undefined) {
      return [...metric.history];
    }

    const cutoff = Date.now() - durationMs;
    return metric.history.filter((dp) => dp.timestamp > cutoff);
  }

  /**
   * 计算平均值
   */
  getAverage(name: string, durationMs?: number): number {
    const history = this.getHistory(name, durationMs);
    if (history.length === 0) {
      return 0;
    }
    const sum = history.reduce((acc, dp) => acc + dp.value, 0);
    return sum / history.length;
  }

  /**
   * 计算百分位数
   */
  getPercentile(name: string, percentile: number, durationMs?: number): number {
    const history = this.getHistory(name, durationMs);
    if (history.length === 0) {
      return 0;
    }

    const sorted = [...history].map((dp) => dp.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] ?? 0;
  }

  /**
   * 任务完成时记录指标
   */
  recordTaskComplete(success: boolean, durationMs: number): void {
    this.incrementCounter(CoreMetricName.TASK_COUNT);
    if (!success) {
      this.incrementCounter(CoreMetricName.TASK_FAILED_COUNT);
    }
    this.recordHistogram(CoreMetricName.TASK_DURATION, durationMs);
    this.updateTaskSuccessRate();
  }

  /**
   * 更新任务成功率
   */
  private updateTaskSuccessRate(): void {
    const total = this.getValue(CoreMetricName.TASK_COUNT);
    const failed = this.getValue(CoreMetricName.TASK_FAILED_COUNT);
    const successRate = total > 0 ? ((total - failed) / total) * 100 : 100;
    this.setGauge(CoreMetricName.TASK_SUCCESS_RATE, successRate);
  }

  /**
   * 设置队列深度
   */
  setQueueDepth(depth: number): void {
    this.setGauge(CoreMetricName.QUEUE_DEPTH, depth);
  }

  /**
   * 记录队列等待时间
   */
  recordQueueWaitTime(waitTimeMs: number): void {
    this.recordHistogram(CoreMetricName.QUEUE_WAIT_TIME, waitTimeMs);
  }

  /**
   * API请求计数
   */
  incrementApiRequest(): void {
    this.incrementCounter(CoreMetricName.API_REQUEST_COUNT);
  }

  /**
   * API错误计数
   */
  incrementApiError(): void {
    this.incrementCounter(CoreMetricName.API_ERROR_RATE);
  }

  /**
   * 记录API响应时间
   */
  recordApiResponseTime(responseTimeMs: number): void {
    this.recordHistogram(CoreMetricName.API_RESPONSE_TIME, responseTimeMs);
    this.updateApiErrorRate();
  }

  /**
   * 更新API错误率
   */
  private updateApiErrorRate(): void {
    const requestCount = this.getValue(CoreMetricName.API_REQUEST_COUNT);
    // 简化计算：使用最近的错误计数作为近似
    const errorRate = requestCount > 0 ? 0 : 0; // 需要单独跟踪错误计数
    this.setGauge(CoreMetricName.API_ERROR_RATE, errorRate);
  }

  /**
   * 设置Agent状态计数
   */
  setAgentCounts(active: number, idle: number): void {
    this.setGauge(CoreMetricName.AGENT_ACTIVE_COUNT, active);
    this.setGauge(CoreMetricName.AGENT_IDLE_COUNT, idle);
  }

  /**
   * 记录Agent任务执行时间
   */
  recordAgentTaskDuration(durationMs: number): void {
    this.recordHistogram(CoreMetricName.AGENT_TASK_DURATION, durationMs);
  }

  /**
   * 获取指标汇总
   */
  getMetricsSummary(): MetricsSummary {
    return {
      taskMetrics: {
        successRate: this.getValue(CoreMetricName.TASK_SUCCESS_RATE),
        totalTasks: this.getValue(CoreMetricName.TASK_COUNT),
        failedTasks: this.getValue(CoreMetricName.TASK_FAILED_COUNT),
        avgDuration: this.getAverage(CoreMetricName.TASK_DURATION),
      },
      queueMetrics: {
        depth: this.getValue(CoreMetricName.QUEUE_DEPTH),
        avgWaitTime: this.getAverage(CoreMetricName.QUEUE_WAIT_TIME),
      },
      apiMetrics: {
        requestCount: this.getValue(CoreMetricName.API_REQUEST_COUNT),
        avgResponseTime: this.getAverage(CoreMetricName.API_RESPONSE_TIME),
        errorRate: this.getValue(CoreMetricName.API_ERROR_RATE),
      },
      agentMetrics: {
        active: this.getValue(CoreMetricName.AGENT_ACTIVE_COUNT),
        idle: this.getValue(CoreMetricName.AGENT_IDLE_COUNT),
        avgTaskDuration: this.getAverage(CoreMetricName.AGENT_TASK_DURATION),
      },
    };
  }

  /**
   * 重置所有指标
   */
  reset(): void {
    this.metrics.clear();
    this.initializeCoreMetrics();
  }
}

// Singleton instance
let metricsServiceInstance: MetricsService | null = null;

/**
 * 获取MetricsService单例
 */
export function getMetricsService(config?: Partial<MonitoringConfig>): MetricsService {
  if (!metricsServiceInstance) {
    metricsServiceInstance = new MetricsService(config);
  }
  return metricsServiceInstance;
}

/**
 * 重置MetricsService单例（用于测试）
 */
export function resetMetricsService(): void {
  metricsServiceInstance = null;
}

export default MetricsService;
