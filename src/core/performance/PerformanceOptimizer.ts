/**
 * 性能优化器主类
 */
import Redis from 'ioredis';
import {
  PerformanceOptimizerConfig,
  PerformanceMetrics,
  IPerformanceOptimizer,
  IConnectionPool,
  IQueryOptimizer,
  ConnectionPoolStats,
  QueryOptimizationAdvice,
  QueryConfig,
} from './types';
import { RedisConnectionPool } from './ConnectionPool';
import { QueryOptimizer } from './QueryOptimizer';

/**
 * 性能优化器
 * 整合连接池、查询优化和性能监控
 */
export class PerformanceOptimizer implements IPerformanceOptimizer {
  private config: PerformanceOptimizerConfig;
  private connectionPool: RedisConnectionPool;
  private queryOptimizer: QueryOptimizer;
  private initialized: boolean = false;
  private metricsInterval?: NodeJS.Timeout;
  private metricsHistory: PerformanceMetrics[] = [];

  constructor(config: PerformanceOptimizerConfig) {
    this.config = config;
    this.connectionPool = new RedisConnectionPool(config.connectionPool);
    this.queryOptimizer = new QueryOptimizer(config.queryOptimization);
  }

  /**
   * 初始化性能优化器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('[PerformanceOptimizer] 已初始化，跳过');
      return;
    }

    console.log('[PerformanceOptimizer] 初始化中...');
    
    // 初始化连接池
    await this.connectionPool.initialize();

    // 启动性能监控
    if (this.config.monitoring.enabled) {
      this.startMonitoring();
    }

    this.initialized = true;
    console.log('[PerformanceOptimizer] 初始化完成');
  }

  /**
   * 关闭性能优化器
   */
  async close(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    // 停止监控
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    // 关闭连接池
    await this.connectionPool.close();

    this.initialized = false;
    console.log('[PerformanceOptimizer] 已关闭');
  }

  /**
   * 获取连接池
   */
  getConnectionPool(): IConnectionPool {
    return this.connectionPool;
  }

  /**
   * 获取查询优化器
   */
  getQueryOptimizer(): IQueryOptimizer {
    return this.queryOptimizer;
  }

  /**
   * 分析查询
   */
  analyzeQuery(query: string, config: QueryConfig): QueryOptimizationAdvice {
    return this.queryOptimizer.analyze(query, config);
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    const memUsage = process.memoryUsage();
    
    return {
      timestamp: Date.now(),
      connectionPool: this.connectionPool.getStats(),
      queries: this.queryOptimizer.getPerformanceSummary(),
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
    };
  }

  /**
   * 清除缓存
   */
  async clearCache(): Promise<void> {
    const pool = this.connectionPool;
    // 获取一个连接来清除缓存
    const conn = await pool.acquire();
    try {
      await conn.flushdb();
    } finally {
      pool.release(conn);
    }
    
    this.queryOptimizer.clearStats();
    this.metricsHistory = [];
  }

  /**
   * 启动性能监控
   */
  private startMonitoring(): void {
    const interval = this.config.monitoring.interval || 60000;
    
    this.metricsInterval = setInterval(() => {
      const metrics = this.getMetrics();
      this.metricsHistory.push(metrics);

      // 保持最近100条记录
      if (this.metricsHistory.length > 100) {
        this.metricsHistory.shift();
      }

      // 检查告警条件
      this.checkAlerts(metrics);
    }, interval);

    console.log(`[PerformanceOptimizer] 性能监控已启动，间隔: ${interval}ms`);
  }

  /**
   * 检查告警条件
   */
  private checkAlerts(metrics: PerformanceMetrics): void {
    const alerts = this.config.monitoring.alerts;
    const summary = metrics.queries;

    // 检查慢查询
    if (summary.slowQueries > 0) {
      console.warn(
        `[PerformanceOptimizer] 告警: 检测到 ${summary.slowQueries} 个慢查询 ` +
        `(阈值: ${alerts.slowQueryThreshold}ms)`
      );
    }

    // 检查高延迟
    if (summary.avgExecutionTime > alerts.highLatencyThreshold) {
      console.warn(
        `[PerformanceOptimizer] 告警: 平均查询延迟过高 ` +
        `(${summary.avgExecutionTime.toFixed(2)}ms > ${alerts.highLatencyThreshold}ms)`
      );
    }

    // 检查连接池
    const poolStats = metrics.connectionPool;
    if (poolStats.failedRequests > 0) {
      console.warn(
        `[PerformanceOptimizer] 告警: 连接池有 ${poolStats.failedRequests} 个失败请求`
      );
    }

    // 检查内存
    if (metrics.memory.percentage > 90) {
      console.warn(
        `[PerformanceOptimizer] 告警: 内存使用率过高 (${metrics.memory.percentage.toFixed(1)}%)`
      );
    }
  }

  /**
   * 获取历史指标
   */
  getMetricsHistory(limit?: number): PerformanceMetrics[] {
    if (limit) {
      return this.metricsHistory.slice(-limit);
    }
    return [...this.metricsHistory];
  }

  /**
   * 执行优化的数据库操作
   */
  async executeOptimized<T>(
    query: string,
    config: QueryConfig,
    executor: (q: string) => Promise<T>
  ): Promise<{ result: T; optimization: QueryOptimizationAdvice; cached: boolean }> {
    const startTime = Date.now();
    
    // 分析查询
    const optimization = this.analyzeQuery(query, config);
    
    // 执行查询
    let result: T;
    let cached = false;
    
    if (config.cacheable) {
      const pool = this.connectionPool;
      const cacheKey = `query_cache:${Buffer.from(query).toString('base64').slice(0, 50)}`;
      
      const conn = await pool.acquire();
      try {
        const cachedValue = await conn.get(cacheKey);
        if (cachedValue) {
          result = JSON.parse(cachedValue);
          cached = true;
        } else {
          result = await executor(query);
          
          if (config.cacheTTL) {
            await conn.setex(cacheKey, config.cacheTTL, JSON.stringify(result));
          }
        }
      } finally {
        pool.release(conn);
      }
    } else {
      result = await executor(query);
    }

    const executionTime = Date.now() - startTime;
    
    // 记录查询统计
    this.queryOptimizer.recordQuery({
      query,
      executionTime,
      rowsAffected: 0,
      cached,
      timestamp: Date.now(),
    });

    return { result, optimization, cached };
  }
}
