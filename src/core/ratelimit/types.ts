/**
 * 限流模块类型定义
 */

// ============= 限流器类型 =============

/**
 * 限流算法类型
 */
export enum RateLimitAlgorithm {
  /** 固定窗口 */
  FIXED_WINDOW = 'fixed_window',
  /** 滑动窗口 */
  SLIDING_WINDOW = 'sliding_window',
  /** 令牌桶 */
  TOKEN_BUCKET = 'token_bucket',
  /** 漏桶 */
  LEAKY_BUCKET = 'leaky_bucket',
}

/**
 * 限流配置
 */
export interface RateLimitConfig {
  /** 限流算法 */
  algorithm: RateLimitAlgorithm;
  /** 窗口大小/桶容量（秒） */
  windowSize: number;
  /** 最大请求数/令牌数 */
  maxRequests: number;
  /** Redis配置（分布式限流时需要） */
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };
  /** 是否启用分布式限流 */
  distributed: boolean;
  /** 速率（每秒处理请求数，用于令牌桶/漏桶） */
  rate?: number;
  /** 突发容量（令牌桶） */
  burstCapacity?: number;
}

/**
 * 限流规则
 */
export interface RateLimitRule {
  /** 规则ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 匹配的路径（支持正则） */
  path: string | string[];
  /** 匹配的HTTP方法 */
  methods?: string[];
  /** 限流配置 */
  config: RateLimitConfig;
  /** 错误消息 */
  errorMessage?: string;
  /** 是否跳过认证请求 */
  skipAuth?: boolean;
}

/**
 * 限流结果
 */
export interface RateLimitResult {
  /** 是否允许通过 */
  allowed: boolean;
  /** 剩余请求数/令牌数 */
  remaining: number;
  /** 重置时间（秒） */
  resetAt: number;
  /** 当前请求数 */
  current: number;
  /** 最大限制 */
  limit: number;
  /** 延迟建议（毫秒） */
  retryAfter?: number;
}

/**
 * 限流器接口
 */
export interface IRateLimiter {
  /** 检查请求是否允许通过 */
  check(key: string): Promise<RateLimitResult>;
  /** 消耗一个请求 */
  consume(key: string): Promise<RateLimitResult>;
  /** 重置限流计数器 */
  reset(key: string): Promise<void>;
  /** 获取当前限流状态 */
  getStatus(key: string): Promise<RateLimitResult>;
}

// ============= API限流保护类型 =============

import { FastifyRequest } from 'fastify';

/**
 * API限流保护配置
 */
export interface APIRateLimitConfig {
  /** 全局限流配置 */
  global?: RateLimitConfig;
  /** 按路由的限流规则 */
  routes: RateLimitRule[];
  /** 默认错误消息 */
  defaultErrorMessage?: string;
  /** 错误码 */
  errorCode?: number;
  /** 是否返回详细限流信息头 */
  includeHeaders?: boolean;
  /** 自定义key生成器 */
  keyGenerator?: (request: FastifyRequest) => string;
  /** 自定义跳过检查函数 */
  skip?: (request: FastifyRequest) => boolean;
}

/**
 * 限流中间件选项
 */
export interface RateLimitMiddlewareOptions {
  /** 错误处理器 */
  errorHandler?: (
    request: FastifyRequest,
    result: RateLimitResult
  ) => { statusCode: number; message: string };
  /** 允许通过的回调 */
  onAllowed?: (request: FastifyRequest, result: RateLimitResult) => void;
  /** 被拒绝的回调 */
  onDenied?: (request: FastifyRequest, result: RateLimitResult) => void;
}

// ============= 限流统计类型 =============

/**
 * 限流统计
 */
export interface RateLimitStats {
  key: string;
  totalRequests: number;
  allowedRequests: number;
  deniedRequests: number;
  firstRequestTime: number;
  lastRequestTime: number;
}

/**
 * 限流器管理器
 */
export interface IRateLimiterManager {
  /** 创建限流器 */
  createRateLimiter(rule: RateLimitRule): IRateLimiter;
  /** 获取限流器 */
  getRateLimiter(ruleId: string): IRateLimiter | undefined;
  /** 删除限流器 */
  removeRateLimiter(ruleId: string): void;
  /** 获取所有统计 */
  getStats(): RateLimitStats[];
  /** 清除所有统计 */
  clearStats(): void;
}
