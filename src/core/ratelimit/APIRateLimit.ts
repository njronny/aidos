/**
 * API限流保护中间件
 */
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import {
  APIRateLimitConfig,
  RateLimitRule,
  RateLimitResult,
  IRateLimiter,
} from './types';
import { DistributedRateLimiterFactory, InMemoryRateLimiter } from './RateLimiter';
import Redis from 'ioredis';

/**
 * API限流保护类
 */
class APIRateLimiter {
  private config: APIRateLimitConfig;
  private limiters: Map<string, IRateLimiter> = new Map();
  private redis?: Redis;
  private stats: Map<string, {
    total: number;
    allowed: number;
    denied: number;
    firstRequest: number;
    lastRequest: number;
  }> = new Map();

  constructor(config: APIRateLimitConfig) {
    this.config = config;
    this.initialize();
  }

  /**
   * 初始化
   */
  private initialize(): void {
    // 如果有Redis配置，初始化Redis连接
    if (this.config.global?.redis) {
      this.redis = new Redis({
        host: this.config.global.redis.host,
        port: this.config.global.redis.port,
        password: this.config.global.redis.password,
        db: this.config.global.redis.db,
        connectionName: 'ratelimit',
      });
    }

    // 为每个路由规则创建限流器
    for (const rule of this.config.routes) {
      this.createLimiterForRule(rule);
    }
  }

  /**
   * 为规则创建限流器
   */
  private createLimiterForRule(rule: RateLimitRule): void {
    if (rule.config.distributed && this.redis) {
      // 分布式限流器
      const limiter = DistributedRateLimiterFactory.create(
        rule.config,
        this.redis,
        rule.config.redis?.keyPrefix || 'ratelimit'
      );
      this.limiters.set(rule.id, limiter);
    } else {
      // 内存限流器
      this.limiters.set(rule.id, new InMemoryRateLimiter(rule.config));
    }
  }

  /**
   * 匹配路由规则
   */
  private matchRoute(path: string, method: string): RateLimitRule | undefined {
    for (const rule of this.config.routes) {
      const paths = Array.isArray(rule.path) ? rule.path : [rule.path];
      
      for (const rulePath of paths) {
        // 支持正则匹配 - 检查是否有source属性(RegExp的特征)
        if (typeof rulePath === 'object' && 'source' in rulePath) {
          const regex = rulePath as unknown as RegExp;
          if (regex.test(path)) {
            // 检查方法
            if (!rule.methods || rule.methods.includes(method)) {
              return rule;
            }
          }
        } else if (typeof rulePath === 'string') {
          // 支持通配符匹配
          const regex = new RegExp(
            '^' + rulePath.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
          );
          if (regex.test(path)) {
            // 检查方法
            if (!rule.methods || rule.methods.includes(method)) {
              return rule;
            }
          }
        }
      }
    }
    
    return undefined;
  }

  /**
   * 生成key
   */
  private generateKey(request: FastifyRequest): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request);
    }

    // 默认使用IP + 路径
    const xff = request.headers['x-forwarded-for'];
    const ip = Array.isArray(xff) ? xff[0] : (typeof xff === 'string' ? xff.split(',')[0]?.trim() : (request.socket as unknown as { remoteAddress?: string })?.remoteAddress || 'unknown');
    return `${ip}:${request.url}`;
  }

  /**
   * 检查限流
   */
  async check(request: FastifyRequest): Promise<{ allowed: boolean; result?: RateLimitResult; rule?: RateLimitRule }> {
    // 检查是否需要跳过
    if (this.config.skip) {
      const shouldSkip = this.config.skip(request);
      if (shouldSkip) {
        return { allowed: true };
      }
    }

    // 匹配路由规则
    const rule = this.matchRoute(request.url, request.method);
    
    if (!rule) {
      // 没有匹配的规则，使用全局限流
      if (this.config.global) {
        const limiter = this.getOrCreateGlobalLimiter();
        const key = this.generateKey(request);
        const result = await limiter.consume(key);
        
        const globalRule: RateLimitRule = {
          id: '__global__',
          name: 'Global',
          path: '*',
          config: this.config.global
        };
        return { allowed: result.allowed, result, rule: globalRule };
      }
      return { allowed: true };
    }

    // 使用规则对应的限流器
    const limiter = this.limiters.get(rule.id);
    if (!limiter) {
      return { allowed: true };
    }

    const key = this.generateKey(request);
    const result = await limiter.consume(key);

    // 记录统计
    this.recordStats(key, result.allowed);

    return { allowed: result.allowed, result, rule };
  }

  /**
   * 获取或创建全局限流器
   */
  private getOrCreateGlobalLimiter(): IRateLimiter {
    const globalId = '__global__';
    if (!this.limiters.has(globalId)) {
      if (this.config.global?.distributed && this.redis) {
        const limiter = DistributedRateLimiterFactory.create(
          this.config.global,
          this.redis
        );
        this.limiters.set(globalId, limiter);
      } else {
        this.limiters.set(globalId, new InMemoryRateLimiter(this.config.global!));
      }
    }
    return this.limiters.get(globalId)!;
  }

  /**
   * 记录统计
   */
  private recordStats(key: string, allowed: boolean): void {
    let stat = this.stats.get(key);
    if (!stat) {
      stat = { total: 0, allowed: 0, denied: 0, firstRequest: Date.now(), lastRequest: Date.now() };
      this.stats.set(key, stat);
    }
    
    stat.total++;
    if (allowed) {
      stat.allowed++;
    } else {
      stat.denied++;
    }
    stat.lastRequest = Date.now();
  }

  /**
   * 获取统计
   */
  getStats(): Map<string, { total: number; allowed: number; denied: number; firstRequest: number; lastRequest: number }> {
    return new Map(this.stats);
  }

  /**
   * 清除统计
   */
  clearStats(): void {
    this.stats.clear();
  }

  /**
   * 关闭
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = undefined;
    }
  }
}

/**
 * 限流中间件选项
 */
export interface RateLimitPluginOptions {
  /** 限流配置 */
  config: APIRateLimitConfig;
  /** 中间件选项 */
  middlewareOptions?: RateLimitMiddlewareOptions;
}

/**
 * 限流中间件选项接口
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

/**
 * Fastify插件：API限流保护
 */
async function rateLimitPlugin(fastify: FastifyInstance, options: RateLimitPluginOptions): Promise<void> {
  const { config, middlewareOptions } = options;
  const rateLimiter = new APIRateLimiter(config);

  // 添加限流相关的钩子
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const { allowed, result, rule } = await rateLimiter.check(request);

    // 添加限流响应头
    if (config.includeHeaders !== false && result) {
      reply.header('X-RateLimit-Limit', result.limit);
      reply.header('X-RateLimit-Remaining', result.remaining);
      reply.header('X-RateLimit-Reset', result.resetAt);
    }

    if (!allowed) {
      // 调用错误处理
      if (middlewareOptions?.onDenied) {
        middlewareOptions.onDenied(request, result!);
      }

      const errorHandler = middlewareOptions?.errorHandler;
      const { statusCode, message } = errorHandler
        ? errorHandler(request, result!)
        : {
            statusCode: config.errorCode || 429,
            message: rule?.errorMessage || config.defaultErrorMessage || 'Too Many Requests',
          };

      if (result?.retryAfter) {
        reply.header('Retry-After', Math.ceil(result.retryAfter / 1000));
      }

      const responseBody: Record<string, unknown> = {
        error: 'Too Many Requests',
        message,
      };
      
      if (config.includeHeaders !== false && result) {
        responseBody.limit = result.limit;
        responseBody.remaining = result.remaining;
        responseBody.resetAt = result.resetAt;
      }

      reply.code(statusCode).send(responseBody);
    } else if (middlewareOptions?.onAllowed && result) {
      middlewareOptions.onAllowed(request, result);
    }
  });

  // 清理资源
  fastify.addHook('onClose', async () => {
    await rateLimiter.close();
  });

  // 将限流器附加到fastify实例
  fastify.decorate('rateLimiter', rateLimiter);
}

// 使用fastify-plugin包装
export const rateLimit = fp(rateLimitPlugin, {
  name: 'rate-limit',
  fastify: '5.x',
});

// 导出
export { APIRateLimiter };
