/**
 * BusinessMonitor - 业务监控
 * 监控任务成功率、处理速度等业务指标
 */

import { EventEmitter } from 'events';

/**
 * 业务监控配置
 */
export interface BusinessMonitorConfig {
  /** 是否启用任务监控 */
  enableTaskMonitoring?: boolean;
  /** 是否启用处理速度监控 */
  enableProcessingSpeedMonitoring?: boolean;
  /** 成功率告警阈值（%） */
  successRateThreshold?: number;
  /** 处理速度告警阈值（任务/分钟） */
  processingSpeedThreshold?: number;
}

/**
 * 任务指标
 */
export interface TaskMetrics {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  successRate: number;
  avgDuration: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
}

/**
 * 处理速度指标
 */
export interface ProcessingSpeedMetrics {
  throughput: number; // tasks per minute
  avgProcessingTime: number;
  completedInLastMinute: number;
  failedInLastMinute: number;
}

/**
 * 按任务类型统计
 */
export interface TaskTypeMetrics {
  type: string;
  total: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgDuration: number;
}

/**
 * 业务告警
 */
export interface BusinessAlert {
  type: 'task' | 'processing';
  severity: 'warning' | 'critical';
  message: string;
  details: any;
}

/**
 * 健康状态
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * 业务指标
 */
export interface BusinessMetrics {
  task: TaskMetrics;
  processingSpeed: ProcessingSpeedMetrics;
  taskByType: Map<string, TaskTypeMetrics>;
  successRateTrend: number[];
  timestamp: number;
}

/**
 * 业务健康状态
 */
export interface BusinessHealth {
  status: HealthStatus;
  taskHealth: HealthStatus;
  processingHealth: HealthStatus;
  details: {
    successRate: number;
    throughput: number;
  };
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<BusinessMonitorConfig> = {
  enableTaskMonitoring: true,
  enableProcessingSpeedMonitoring: true,
  successRateThreshold: 80,
  processingSpeedThreshold: 1,
};

/**
 * 任务记录
 */
interface TaskRecord {
  id: string;
  success: boolean;
  duration: number;
  type?: string;
  timestamp: number;
}

/**
 * BusinessMonitor - 业务监控
 * 负责采集和监控任务成功率、处理速度等业务指标
 */
export class BusinessMonitor extends EventEmitter {
  private config: Required<BusinessMonitorConfig>;
  private taskHistory: TaskRecord[] = [];
  private taskTypeMetrics: Map<string, TaskTypeMetrics> = new Map();
  private completedTimestamps: number[] = [];
  private readonly maxHistorySize = 10000;

  constructor(config: BusinessMonitorConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 记录任务完成
   */
  recordTaskComplete(
    taskId: string,
    success: boolean,
    durationMs: number,
    taskType?: string
  ): void {
    if (!this.config.enableTaskMonitoring) return;

    const record: TaskRecord = {
      id: taskId,
      success,
      duration: durationMs,
      type: taskType,
      timestamp: Date.now(),
    };

    this.taskHistory.push(record);
    this.completedTimestamps.push(record.timestamp);

    // 维护历史记录大小
    this.cleanupHistory();

    // 更新任务类型指标
    if (taskType) {
      this.updateTaskTypeMetrics(taskType, success, durationMs);
    }

    // 发出任务完成事件
    this.emit('taskComplete', record);
  }

  /**
   * 清理过期的历史记录
   */
  private cleanupHistory(): void {
    const oneHourAgo = Date.now() - 3600000;
    
    // 清理任务历史
    if (this.taskHistory.length > this.maxHistorySize) {
      this.taskHistory = this.taskHistory.slice(-this.maxHistorySize);
    }

    // 清理时间戳
    this.completedTimestamps = this.completedTimestamps.filter(ts => ts > oneHourAgo);
  }

  /**
   * 更新任务类型指标
   */
  private updateTaskTypeMetrics(
    taskType: string,
    success: boolean,
    duration: number
  ): void {
    let metrics = this.taskTypeMetrics.get(taskType);
    if (!metrics) {
      metrics = {
        type: taskType,
        total: 0,
        successCount: 0,
        failedCount: 0,
        successRate: 100,
        avgDuration: 0,
      };
      this.taskTypeMetrics.set(taskType, metrics);
    }

    metrics.total++;
    if (success) {
      metrics.successCount++;
    } else {
      metrics.failedCount++;
    }
    metrics.successRate = (metrics.successCount / metrics.total) * 100;
    metrics.avgDuration = ((metrics.avgDuration * (metrics.total - 1)) + duration) / metrics.total;
  }

  /**
   * 获取任务类型指标
   */
  getTaskTypeMetrics(taskType: string): TaskTypeMetrics | undefined {
    return this.taskTypeMetrics.get(taskType);
  }

  /**
   * 计算任务指标
   */
  private calculateTaskMetrics(): TaskMetrics {
    if (this.taskHistory.length === 0) {
      return {
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        successRate: 100,
        avgDuration: 0,
        totalDuration: 0,
        minDuration: 0,
        maxDuration: 0,
      };
    }

    const total = this.taskHistory.length;
    const successful = this.taskHistory.filter(t => t.success).length;
    const failed = total - successful;
    const durations = this.taskHistory.map(t => t.duration);
    const totalDuration = durations.reduce((a, b) => a + b, 0);

    return {
      totalTasks: total,
      successfulTasks: successful,
      failedTasks: failed,
      successRate: (successful / total) * 100,
      avgDuration: totalDuration / total,
      totalDuration,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
    };
  }

  /**
   * 计算处理速度指标
   */
  private calculateProcessingSpeedMetrics(): ProcessingSpeedMetrics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // 统计过去1分钟完成的任务
    const completedInLastMinute = this.completedTimestamps.filter(
      ts => ts > oneMinuteAgo
    ).length;

    const failedInLastMinute = this.taskHistory
      .filter(t => !t.success && t.timestamp > oneMinuteAgo)
      .length;

    // 计算吞吐量（每分钟任务数）
    const throughput = completedInLastMinute;

    // 计算平均处理时间
    const avgProcessingTime = this.taskHistory.length > 0
      ? this.taskHistory.reduce((a, b) => a + b.duration, 0) / this.taskHistory.length
      : 0;

    return {
      throughput,
      avgProcessingTime,
      completedInLastMinute,
      failedInLastMinute,
    };
  }

  /**
   * 获取成功率趋势
   */
  getSuccessRateTrend(durationMs: number = 60000): number[] {
    const cutoff = Date.now() - durationMs;
    const recentTasks = this.taskHistory.filter(t => t.timestamp > cutoff);
    
    if (recentTasks.length === 0) return [];

    const trend: number[] = [];
    const windowSize = Math.min(10, recentTasks.length);
    
    for (let i = 0; i < recentTasks.length; i += Math.ceil(recentTasks.length / windowSize)) {
      const window = recentTasks.slice(Math.max(0, i - 10), i);
      if (window.length > 0) {
        const successCount = window.filter(t => t.success).length;
        trend.push((successCount / window.length) * 100);
      }
    }

    return trend;
  }

  /**
   * 检查任务健康状态
   */
  checkTaskHealth(): BusinessAlert[] {
    const alerts: BusinessAlert[] = [];
    const taskMetrics = this.calculateTaskMetrics();

    // 检查成功率
    if (taskMetrics.totalTasks >= 10) {
      if (taskMetrics.successRate < 50) {
        alerts.push({
          type: 'task',
          severity: 'critical',
          message: `Task success rate critically low: ${taskMetrics.successRate.toFixed(2)}%`,
          details: { successRate: taskMetrics.successRate },
        });
      } else if (taskMetrics.successRate < this.config.successRateThreshold) {
        alerts.push({
          type: 'task',
          severity: 'warning',
          message: `Task success rate below threshold: ${taskMetrics.successRate.toFixed(2)}%`,
          details: { successRate: taskMetrics.successRate },
        });
      }
    }

    return alerts;
  }

  /**
   * 检查处理速度健康状态
   */
  checkProcessingHealth(): BusinessAlert[] {
    const alerts: BusinessAlert[] = [];
    const speedMetrics = this.calculateProcessingSpeedMetrics();

    // 检查处理速度
    if (speedMetrics.throughput < this.config.processingSpeedThreshold && speedMetrics.completedInLastMinute > 0) {
      alerts.push({
        type: 'processing',
        severity: 'warning',
        message: `Processing speed below threshold: ${speedMetrics.throughput} tasks/min`,
        details: { throughput: speedMetrics.throughput },
      });
    }

    // 检查失败任务数量
    if (speedMetrics.failedInLastMinute > 10) {
      alerts.push({
        type: 'processing',
        severity: 'warning',
        message: `High failure count in last minute: ${speedMetrics.failedInLastMinute}`,
        details: { failedCount: speedMetrics.failedInLastMinute },
      });
    }

    return alerts;
  }

  /**
   * 检查整体健康状态
   */
  checkHealth(): BusinessHealth {
    const taskMetrics = this.calculateTaskMetrics();
    const speedMetrics = this.calculateProcessingSpeedMetrics();

    let taskHealth: HealthStatus = 'healthy';
    let processingHealth: HealthStatus = 'healthy';

    // 评估任务健康
    if (taskMetrics.totalTasks >= 10) {
      if (taskMetrics.successRate < 50) {
        taskHealth = 'unhealthy';
      } else if (taskMetrics.successRate < this.config.successRateThreshold) {
        taskHealth = 'degraded';
      }
    }

    // 评估处理速度健康
    if (speedMetrics.throughput < this.config.processingSpeedThreshold / 2) {
      processingHealth = 'unhealthy';
    } else if (speedMetrics.throughput < this.config.processingSpeedThreshold) {
      processingHealth = 'degraded';
    }

    let overallStatus: HealthStatus = 'healthy';
    if (taskHealth === 'unhealthy' || processingHealth === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (taskHealth === 'degraded' || processingHealth === 'degraded') {
      overallStatus = 'degraded';
    }

    const health: BusinessHealth = {
      status: overallStatus,
      taskHealth,
      processingHealth,
      details: {
        successRate: taskMetrics.successRate,
        throughput: speedMetrics.throughput,
      },
    };

    // 如果健康状态发生变化，发出事件
    this.emit('healthChange', health);

    return health;
  }

  /**
   * 获取当前指标
   */
  getMetrics(): BusinessMetrics {
    return {
      task: this.calculateTaskMetrics(),
      processingSpeed: this.calculateProcessingSpeedMetrics(),
      taskByType: new Map(this.taskTypeMetrics),
      successRateTrend: this.getSuccessRateTrend(),
      timestamp: Date.now(),
    };
  }

  /**
   * 启动监控
   */
  start(): void {
    // 定期检查健康状态
    setInterval(() => {
      const alerts = [
        ...this.checkTaskHealth(),
        ...this.checkProcessingHealth(),
      ];
      for (const alert of alerts) {
        this.emit('alert', alert);
      }
      this.checkHealth();
    }, 30000);
  }

  /**
   * 停止监控
   */
  stop(): void {
    // 清理资源
  }

  /**
   * 重置所有指标
   */
  reset(): void {
    this.taskHistory = [];
    this.taskTypeMetrics.clear();
    this.completedTimestamps = [];
  }
}

export default BusinessMonitor;
