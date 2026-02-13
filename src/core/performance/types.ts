/**
 * 性能优化模块类型定义
 */
import Redis from 'ioredis';

// ============= 连接池类型 =============

/**
 * 连接池配置
 */
export interface ConnectionPoolConfig {
  /** Redis配置 */
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    connectionName?: string;
  };
  /** 连接池大小 */
  poolSize: number;
  /** 连接超时（毫秒） */
  connectTimeout: number;
  /** 空闲超时（毫秒） */
  idleTimeout: number;
  /** 最大等待时间（毫秒） */
  maxWaitTime: number;
  /** 连接重试次数 */
  retryAttempts: number;
  /** 重试间隔（毫秒） */
  retryDelay: number;
}

/**
 * 连接状态
 */
export interface ConnectionState {
  id: string;
  createdAt: number;
  lastUsedAt: number;
  inUse: boolean;
  errorCount: number;
}

/**
 * 连接池统计信息
 */
export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  avgWaitTime: number;
  maxWaitTime: number;
  totalRequests: number;
  failedRequests: number;
  hitRate: number;
}

/**
 * 连接池接口
 */
export interface IConnectionPool {
  initialize(): Promise<void>;
  acquire(): Promise<Redis>;
  release(connection: Redis): void;
  close(): Promise<void>;
  getStats(): ConnectionPoolStats;
}

// ============= 查询优化类型 =============

/**
 * 查询类型
 */
export enum QueryType {
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

/**
 * 查询配置
 */
export interface QueryConfig {
  /** 查询类型 */
  type: QueryType;
  /** 表名 */
  table: string;
  /** 索引字段 */
  indexedFields?: string[];
  /** 预计结果数 */
  estimatedRows?: number;
  /** 查询超时（毫秒） */
  timeout?: number;
  /** 是否使用缓存 */
  cacheable?: boolean;
  /** 缓存TTL（秒） */
  cacheTTL?: number;
}

/**
 * 查询优化建议
 */
export interface QueryOptimizationAdvice {
  query: string;
  suggestedIndexes: string[];
  estimatedImprovement: number;
  warnings: string[];
}

/**
 * 查询统计
 */
export interface QueryStats {
  query: string;
  executionTime: number;
  rowsAffected: number;
  cached: boolean;
  timestamp: number;
}

/**
 * 查询优化器接口
 */
export interface IQueryOptimizer {
  analyze(query: string, config: QueryConfig): QueryOptimizationAdvice;
  optimize(query: string, config: QueryConfig): string;
  recordQuery(stats: QueryStats): void;
  getStats(): QueryStats[];
  clearStats(): void;
}

// ============= 性能优化器主类型 =============

/**
 * 性能优化器配置
 */
export interface PerformanceOptimizerConfig {
  /** 连接池配置 */
  connectionPool: ConnectionPoolConfig;
  /** 查询优化配置 */
  queryOptimization: {
    enabled: boolean;
    slowQueryThreshold: number;
    maxCacheSize: number;
    cacheTTL: number;
  };
  /** 性能监控配置 */
  monitoring: {
    enabled: boolean;
    interval: number;
    alerts: {
      slowQueryThreshold: number;
      highLatencyThreshold: number;
      errorRateThreshold: number;
    };
  };
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  timestamp: number;
  connectionPool: ConnectionPoolStats;
  queries: {
    totalQueries: number;
    slowQueries: number;
    cachedQueries: number;
    avgExecutionTime: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

/**
 * 性能优化器接口
 */
export interface IPerformanceOptimizer {
  initialize(): Promise<void>;
  close(): Promise<void>;
  
  // 连接池管理
  getConnectionPool(): IConnectionPool;
  
  // 查询优化
  getQueryOptimizer(): IQueryOptimizer;
  analyzeQuery(query: string, config: QueryConfig): QueryOptimizationAdvice;
  
  // 性能指标
  getMetrics(): PerformanceMetrics;
  
  // 缓存管理
  clearCache(): Promise<void>;
}
