/**
 * ApplicationMonitor - 应用监控
 * 监控API、队列、缓存等应用层指标
 */

import { EventEmitter } from 'events';

/**
 * 应用监控配置
 */
export interface ApplicationMonitorConfig {
  /** 是否启用API监控 */
  enableApiMonitoring?: boolean;
  /** 是否启用队列监控 */
  enableQueueMonitoring?: boolean;
  /** 是否启用缓存监控 */
  enableCacheMonitoring?: boolean;
  /** 慢请求阈值（毫秒） */
  slowRequestThresholdMs?: number;
  /** 队列积压告警阈值 */
  queueBackupThreshold?: number;
  /** 缓存命中率告警阈值（%） */
  cacheHitRateThreshold?: number;
}

/**
 * API端点指标
 */
export interface EndpointMetrics {
  path: string;
  count: number;
  totalResponseTime: number;
  avgResponseTime: number;
  errorCount: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * API指标
 */
export interface ApiMetrics {
  totalRequests: number;
  totalResponseTime: number;
  avgResponseTime: number;
  errorCount: number;
  errorRate: number;
  slowRequests: number;
  endpoints: Map<string, EndpointMetrics>;
  statusCodes: Map<number, number>;
}

/**
 * 队列指标
 */
export interface QueueMetrics {
  name: string;
  depth: number;
  waiting: number;
  processing: number;
  completed: number;
  failed: number;
  avgWaitTime: number;
  throughput: number;
  failureRate: number;
}

/**
 * 缓存指标
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  stores: Map<string, {
    name: string;
    size: number;
    maxSize: number;
    usagePercent: number;
  }>;
}

/**
 * 健康状态
 */
export type AppHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * 应用健康状态
 */
export interface ApplicationHealth {
  overall: AppHealthStatus;
  api: AppHealthStatus;
  queue: AppHealthStatus;
  cache: AppHealthStatus;
}

/**
 * 应用指标
 */
export interface ApplicationMetrics {
  api: ApiMetrics;
  queue: Map<string, QueueMetrics>;
  cache: CacheMetrics;
  health: ApplicationHealth;
  timestamp: number;
}

/**
 * 告警信息
 */
export interface ApplicationAlert {
  type: 'api' | 'queue' | 'cache';
  severity: 'warning' | 'critical';
  message: string;
  details: any;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<ApplicationMonitorConfig> = {
  enableApiMonitoring: true,
  enableQueueMonitoring: true,
  enableCacheMonitoring: true,
  slowRequestThresholdMs: 5000,
  queueBackupThreshold: 1000,
  cacheHitRateThreshold: 80,
};

/**
 * ApplicationMonitor - 应用监控
 * 负责采集和监控API、队列、缓存等应用层指标
 */
export class ApplicationMonitor extends EventEmitter {
  private config: Required<ApplicationMonitorConfig>;
  private metrics: ApplicationMetrics;
  private responseTimes: Map<string, number[]> = new Map();
  private readonly maxResponseTimeHistory = 1000;

  constructor(config: ApplicationMonitorConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = this.initializeMetrics();
  }

  /**
   * 初始化指标结构
   */
  private initializeMetrics(): ApplicationMetrics {
    return {
      api: {
        totalRequests: 0,
        totalResponseTime: 0,
        avgResponseTime: 0,
        errorCount: 0,
        errorRate: 0,
        slowRequests: 0,
        endpoints: new Map(),
        statusCodes: new Map(),
      },
      queue: new Map(),
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 100,
        stores: new Map(),
      },
      health: {
        overall: 'healthy',
        api: 'healthy',
        queue: 'healthy',
        cache: 'healthy',
      },
      timestamp: Date.now(),
    };
  }

  /**
   * 记录API请求
   */
  recordApiRequest(path: string, statusCode: number, responseTime: number): void {
    if (!this.config.enableApiMonitoring) return;

    const api = this.metrics.api;
    api.totalRequests++;
    api.totalResponseTime += responseTime;
    api.avgResponseTime = api.totalResponseTime / api.totalRequests;

    // 记录状态码
    api.statusCodes.set(statusCode, (api.statusCodes.get(statusCode) || 0) + 1);

    // 记录错误
    if (statusCode >= 400) {
      api.errorCount++;
      api.errorRate = (api.errorCount / api.totalRequests) * 100;
    }

    // 记录慢请求
    if (responseTime > this.config.slowRequestThresholdMs) {
      api.slowRequests++;
      this.emit('slowRequest', { path, statusCode, responseTime });
    }

    // 记录端点指标
    this.recordEndpointMetrics(path, responseTime, statusCode);

    // 更新响应时间历史
    this.recordResponseTime(path, responseTime);

    // 更新健康状态
    this.updateApiHealth();
  }

  /**
   * 记录端点指标
   */
  private recordEndpointMetrics(path: string, responseTime: number, statusCode: number): void {
    const endpoints = this.metrics.api.endpoints;
    let endpoint = endpoints.get(path);

    if (!endpoint) {
      endpoint = {
        path,
        count: 0,
        totalResponseTime: 0,
        avgResponseTime: 0,
        errorCount: 0,
        errorRate: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
      endpoints.set(path, endpoint);
    }

    endpoint.count++;
    endpoint.totalResponseTime += responseTime;
    endpoint.avgResponseTime = endpoint.totalResponseTime / endpoint.count;

    if (statusCode >= 400) {
      endpoint.errorCount++;
      endpoint.errorRate = (endpoint.errorCount / endpoint.count) * 100;
    }
  }

  /**
   * 记录响应时间用于百分位计算
   */
  private recordResponseTime(path: string, responseTime: number): void {
    let times = this.responseTimes.get(path);
    if (!times) {
      times = [];
      this.responseTimes.set(path, times);
    }
    times.push(responseTime);
    if (times.length > this.maxResponseTimeHistory) {
      times.shift();
    }
  }

  /**
   * 获取端点指标
   */
  getEndpointMetrics(path: string): EndpointMetrics | undefined {
    const endpoint = this.metrics.api.endpoints.get(path);
    if (!endpoint) return undefined;

    const times = this.responseTimes.get(path);
    if (times && times.length > 0) {
      const sorted = [...times].sort((a, b) => a - b);
      endpoint.p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
      endpoint.p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      endpoint.p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
    }

    return endpoint;
  }

  /**
   * 更新队列指标
   */
  updateQueueMetrics(name: string, data: Partial<QueueMetrics>): void {
    if (!this.config.enableQueueMonitoring) return;

    let queue = this.metrics.queue.get(name);
    if (!queue) {
      queue = {
        name,
        depth: 0,
        waiting: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        avgWaitTime: 0,
        throughput: 0,
        failureRate: 0,
      };
      this.metrics.queue.set(name, queue);
    }

    Object.assign(queue, data);

    // 计算失败率
    const total = queue.completed + queue.failed;
    if (total > 0) {
      queue.failureRate = (queue.failed / total) * 100;
    }

    // 更新健康状态
    this.updateQueueHealth();
  }

  /**
   * 记录队列等待时间
   */
  recordQueueWaitTime(name: string, enqueuedAt: number): void {
    const waitTime = Date.now() - enqueuedAt;
    const queue = this.metrics.queue.get(name);
    if (queue) {
      queue.avgWaitTime = (queue.avgWaitTime * 0.9) + (waitTime * 0.1); // 移动平均
    }
  }

  /**
   * 检查队列健康状态
   */
  checkQueueHealth(): ApplicationAlert[] {
    const alerts: ApplicationAlert[] = [];
    const queueBackup = this.config.queueBackupThreshold;

    for (const [name, queue] of this.metrics.queue) {
      if (queue.depth > queueBackup) {
        const severity = queue.depth > queueBackup * 2 ? 'critical' : 'warning';
        alerts.push({
          type: 'queue',
          severity,
          message: `Queue "${name}" backup detected: ${queue.depth} messages`,
          details: { name, depth: queue.depth },
        });
      }

      if (queue.failureRate > 10) {
        alerts.push({
          type: 'queue',
          severity: 'warning',
          message: `Queue "${name}" high failure rate: ${queue.failureRate.toFixed(2)}%`,
          details: { name, failureRate: queue.failureRate },
        });
      }
    }

    return alerts;
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(store: string = 'default'): void {
    if (!this.config.enableCacheMonitoring) return;
    this.metrics.cache.hits++;
    this.updateCacheHitRate();
    this.updateCacheHealth();
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss(store: string = 'default'): void {
    if (!this.config.enableCacheMonitoring) return;
    this.metrics.cache.misses++;
    this.updateCacheHitRate();
    this.updateCacheHealth();
  }

  /**
   * 设置缓存大小
   */
  setCacheSize(store: string, size: number, maxSize: number): void {
    const stores = this.metrics.cache.stores;
    stores.set(store, {
      name: store,
      size,
      maxSize,
      usagePercent: (size / maxSize) * 100,
    });
  }

  /**
   * 更新缓存命中率
   */
  private updateCacheHitRate(): void {
    const { hits, misses } = this.metrics.cache;
    const total = hits + misses;
    this.metrics.cache.hitRate = total > 0 ? (hits / total) * 100 : 100;
  }

  /**
   * 检查缓存健康状态
   */
  checkCacheHealth(): ApplicationAlert[] {
    const alerts: ApplicationAlert[] = [];
    const hitRateThreshold = this.config.cacheHitRateThreshold;

    if (this.metrics.cache.hitRate < hitRateThreshold && (this.metrics.cache.hits + this.metrics.cache.misses) > 10) {
      alerts.push({
        type: 'cache',
        severity: 'warning',
        message: `Low cache hit rate: ${this.metrics.cache.hitRate.toFixed(2)}%`,
        details: { hitRate: this.metrics.cache.hitRate },
      });
    }

    // 检查缓存存储使用率
    for (const [name, store] of this.metrics.cache.stores) {
      if (store.usagePercent > 90) {
        alerts.push({
          type: 'cache',
          severity: store.usagePercent > 95 ? 'critical' : 'warning',
          message: `Cache "${name}" storage almost full: ${store.usagePercent.toFixed(2)}%`,
          details: { name, usagePercent: store.usagePercent },
        });
      }
    }

    return alerts;
  }

  /**
   * 更新API健康状态
   */
  private updateApiHealth(): void {
    const { errorRate, slowRequests, totalRequests } = this.metrics.api;
    
    if (totalRequests === 0) {
      this.metrics.health.api = 'healthy';
      return;
    }

    if (errorRate > 20 || slowRequests / totalRequests > 0.2) {
      this.metrics.health.api = 'unhealthy';
    } else if (errorRate > 5 || slowRequests / totalRequests > 0.05) {
      this.metrics.health.api = 'degraded';
    } else {
      this.metrics.health.api = 'healthy';
    }

    this.updateOverallHealth();
  }

  /**
   * 更新队列健康状态
   */
  private updateQueueHealth(): void {
    let hasUnhealthy = false;
    let hasDegraded = false;

    for (const queue of this.metrics.queue.values()) {
      if (queue.depth > this.config.queueBackupThreshold * 2 || queue.failureRate > 20) {
        hasUnhealthy = true;
      } else if (queue.depth > this.config.queueBackupThreshold || queue.failureRate > 10) {
        hasDegraded = true;
      }
    }

    if (hasUnhealthy) {
      this.metrics.health.queue = 'unhealthy';
    } else if (hasDegraded) {
      this.metrics.health.queue = 'degraded';
    } else {
      this.metrics.health.queue = 'healthy';
    }

    this.updateOverallHealth();
  }

  /**
   * 更新缓存健康状态
   */
  private updateCacheHealth(): void {
    if (this.metrics.cache.hitRate < 50 && (this.metrics.cache.hits + this.metrics.cache.misses) > 10) {
      this.metrics.health.cache = 'unhealthy';
    } else if (this.metrics.cache.hitRate < this.config.cacheHitRateThreshold) {
      this.metrics.health.cache = 'degraded';
    } else {
      this.metrics.health.cache = 'healthy';
    }

    this.updateOverallHealth();
  }

  /**
   * 更新整体健康状态
   */
  private updateOverallHealth(): void {
    const { api, queue, cache } = this.metrics.health;
    
    if (api === 'unhealthy' || queue === 'unhealthy' || cache === 'unhealthy') {
      this.emitHealthChange('overall', 'unhealthy');
      this.metrics.health.overall = 'unhealthy';
    } else if (api === 'degraded' || queue === 'degraded' || cache === 'degraded') {
      this.emitHealthChange('overall', 'degraded');
      this.metrics.health.overall = 'degraded';
    } else {
      this.emitHealthChange('overall', 'healthy');
      this.metrics.health.overall = 'healthy';
    }
  }

  /**
   * 发出健康状态变化事件
   */
  private emitHealthChange(component: string, status: AppHealthStatus): void {
    this.emit('healthChange', { component, status });
  }

  /**
   * 获取当前指标
   */
  getMetrics(): ApplicationMetrics {
    return {
      ...this.metrics,
      timestamp: Date.now(),
    };
  }

  /**
   * 启动监控
   */
  start(): void {
    this.startMonitoring();
  }

  /**
   * 停止监控
   */
  stop(): void {
    // 清理资源
  }

  /**
   * 开始监控（内部方法）
   */
  private startMonitoring(): void {
    // 可以在这里启动定期健康检查
    setInterval(() => {
      const alerts = [
        ...this.checkQueueHealth(),
        ...this.checkCacheHealth(),
      ];
      for (const alert of alerts) {
        this.emit('alert', alert);
      }
    }, 30000);
  }

  /**
   * 重置所有指标
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.responseTimes.clear();
  }
}

export default ApplicationMonitor;
