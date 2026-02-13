/**
 * 查询优化器实现
 */
import {
  QueryType,
  QueryConfig,
  QueryOptimizationAdvice,
  QueryStats,
  IQueryOptimizer,
} from './types';

/**
 * 简单查询优化器
 * 提供查询分析和优化建议
 */
export class QueryOptimizer implements IQueryOptimizer {
  private config: {
    slowQueryThreshold: number;
    maxCacheSize: number;
    cacheTTL: number;
  };
  private queryCache: Map<string, { result: string; timestamp: number }> = new Map();
  private queryStats: QueryStats[] = [];

  constructor(config: {
    slowQueryThreshold: number;
    maxCacheSize: number;
    cacheTTL: number;
  }) {
    this.config = config;
  }

  /**
   * 分析查询并提供优化建议
   */
  analyze(query: string, config: QueryConfig): QueryOptimizationAdvice {
    const suggestedIndexes: string[] = [];
    const warnings: string[] = [];
    let estimatedImprovement = 0;

    // 解析查询
    const queryUpper = query.toUpperCase().trim();
    
    // 检查SELECT查询
    if (queryUpper.startsWith('SELECT')) {
      // 提取WHERE条件中的字段
      const whereMatch = query.match(/WHERE\s+(\w+)\s*=/i);
      if (whereMatch) {
        const field = whereMatch[1];
        if (!config.indexedFields?.includes(field)) {
          suggestedIndexes.push(field);
          estimatedImprovement += 50;
          warnings.push(`字段 ${field} 建议添加索引以提高查询性能`);
        }
      }

      // 检查是否使用了SELECT *
      if (queryUpper.includes('SELECT *')) {
        warnings.push('建议只查询需要的字段，避免使用 SELECT *');
        estimatedImprovement -= 10;
      }

      // 检查是否有子查询
      if (queryUpper.includes('(SELECT') || queryUpper.includes('IN (')) {
        warnings.push('子查询可能影响性能，考虑使用JOIN替代');
        estimatedImprovement -= 20;
      }

      // 检查是否使用了LIMIT
      if (!queryUpper.includes('LIMIT')) {
        warnings.push('建议添加LIMIT限制返回结果数量');
      }

      // 检查排序
      if (queryUpper.includes('ORDER BY') && !queryUpper.includes('INDEX')) {
        warnings.push('ORDER BY字段建议建立索引');
      }
    }

    // 检查INSERT查询
    if (queryUpper.startsWith('INSERT')) {
      if (queryUpper.includes('VALUES') && queryUpper.includes(',')) {
        warnings.push('建议使用批量INSERT替代多条单独INSERT');
        estimatedImprovement += 30;
      }
    }

    // 检查UPDATE查询
    if (queryUpper.startsWith('UPDATE')) {
      if (!queryUpper.includes('WHERE')) {
        warnings.push('UPDATE语句建议添加WHERE条件，避免全表更新');
      }
    }

    // 检查DELETE查询
    if (queryUpper.startsWith('DELETE')) {
      if (!queryUpper.includes('WHERE')) {
        warnings.push('DELETE语句建议添加WHERE条件，避免删除全表数据');
      }
    }

    // 根据预估行数给出建议
    if (config.estimatedRows && config.estimatedRows > 10000) {
      warnings.push(`预估结果行数较大(${config.estimatedRows})，建议分页查询`);
      estimatedImprovement += 20;
    }

    return {
      query,
      suggestedIndexes,
      estimatedImprovement: Math.max(0, Math.min(100, estimatedImprovement)),
      warnings,
    };
  }

  /**
   * 优化查询
   */
  optimize(query: string, config: QueryConfig): string {
    let optimizedQuery = query;

    // 添加LIMIT如果缺失且可缓存
    if (config.cacheable && !query.toUpperCase().includes('LIMIT')) {
      const limitMatch = config.table.match(/limit(\d+)/i);
      if (limitMatch) {
        optimizedQuery = `${query} LIMIT ${limitMatch[1]}`;
      }
    }

    return optimizedQuery;
  }

  /**
   * 记录查询统计
   */
  recordQuery(stats: QueryStats): void {
    // 添加缓存标记
    const cached = this.isQueryCached(stats.query);
    
    this.queryStats.push({
      ...stats,
      cached,
      timestamp: Date.now(),
    });

    // 限制统计记录数量
    if (this.queryStats.length > this.config.maxCacheSize) {
      this.queryStats = this.queryStats.slice(-this.config.maxCacheSize / 2);
    }

    // 清理过期缓存
    this.cleanupCache();
  }

  /**
   * 检查查询是否在缓存中
   */
  private isQueryCached(query: string): boolean {
    const normalized = this.normalizeQuery(query);
    return this.queryCache.has(normalized);
  }

  /**
   * 规范化查询（用于缓存键）
   */
  private normalizeQuery(query: string): string {
    return query
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 清理过期缓存
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > this.config.cacheTTL * 1000) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * 获取查询统计
   */
  getStats(): QueryStats[] {
    return [...this.queryStats];
  }

  /**
   * 清除查询统计
   */
  clearStats(): void {
    this.queryStats = [];
  }

  /**
   * 获取慢查询统计
   */
  getSlowQueries(threshold?: number): QueryStats[] {
    const thresholdMs = threshold || this.config.slowQueryThreshold;
    return this.queryStats.filter((s) => s.executionTime > thresholdMs);
  }

  /**
   * 获取查询性能摘要
   */
  getPerformanceSummary(): {
    totalQueries: number;
    slowQueries: number;
    cachedQueries: number;
    avgExecutionTime: number;
    p95ExecutionTime: number;
  } {
    const times = this.queryStats.map((s) => s.executionTime).sort((a, b) => a - b);
    const totalQueries = this.queryStats.length;
    const slowQueries = this.getSlowQueries().length;
    const cachedQueries = this.queryStats.filter((s) => s.cached).length;

    return {
      totalQueries,
      slowQueries,
      cachedQueries,
      avgExecutionTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      p95ExecutionTime: times.length > 0 ? times[Math.floor(times.length * 0.95)] || 0 : 0,
    };
  }
}
