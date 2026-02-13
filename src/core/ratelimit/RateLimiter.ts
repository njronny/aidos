/**
 * 分布式限流器实现（基于Redis）
 */
import Redis from 'ioredis';
import {
  RateLimitConfig,
  RateLimitResult,
  IRateLimiter,
  RateLimitAlgorithm,
} from './types';

/**
 * 固定窗口限流器
 */
class FixedWindowRateLimiter implements IRateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;
  private keyPrefix: string;

  constructor(redis: Redis, config: RateLimitConfig, keyPrefix: string = 'ratelimit') {
    this.redis = redis;
    this.config = config;
    this.keyPrefix = keyPrefix;
  }

  private getKey(key: string): string {
    const window = Math.floor(Date.now() / 1000 / this.config.windowSize);
    return `${this.keyPrefix}:${key}:${window}`;
  }

  async check(key: string): Promise<RateLimitResult> {
    const redisKey = this.getKey(key);
    const current = await this.redis.get(redisKey);
    const count = current ? parseInt(current, 10) : 0;
    const limit = this.config.maxRequests;
    const windowSize = this.config.windowSize;
    const windowStart = Math.floor(Date.now() / 1000 / windowSize) * windowSize;
    const resetAt = windowStart + windowSize;

    return {
      allowed: count < limit,
      remaining: Math.max(0, limit - count),
      current: count,
      limit,
      resetAt,
    };
  }

  async consume(key: string): Promise<RateLimitResult> {
    const redisKey = this.getKey(key);
    const windowSize = this.config.windowSize;
    const windowStart = Math.floor(Date.now() / 1000 / windowSize) * windowSize;
    const resetAt = windowStart + windowSize;

    // 使用INCR自动创建并递增
    const count = await this.redis.incr(redisKey);
    
    // 首次设置过期时间
    if (count === 1) {
      await this.redis.expire(redisKey, windowSize);
    }

    const limit = this.config.maxRequests;

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      current: count,
      limit,
      resetAt,
      retryAfter: count > limit ? (resetAt - Math.floor(Date.now() / 1000)) * 1000 : undefined,
    };
  }

  async reset(key: string): Promise<void> {
    const redisKey = this.getKey(key);
    await this.redis.del(redisKey);
  }

  async getStatus(key: string): Promise<RateLimitResult> {
    return this.check(key);
  }
}

/**
 * 滑动窗口限流器
 */
class SlidingWindowRateLimiter implements IRateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;
  private keyPrefix: string;

  constructor(redis: Redis, config: RateLimitConfig, keyPrefix: string = 'ratelimit') {
    this.redis = redis;
    this.config = config;
    this.keyPrefix = keyPrefix;
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}:sliding:${key}`;
  }

  async check(key: string): Promise<RateLimitResult> {
    const redisKey = this.getKey(key);
    const windowSize = this.config.windowSize;
    const now = Date.now();
    const windowStart = now - windowSize * 1000;

    // 移除过期的请求记录
    await this.redis.zremrangebyscore(redisKey, 0, windowStart);
    
    // 获取当前窗口内的请求数
    const count = await this.redis.zcard(redisKey);
    const limit = this.config.maxRequests;
    const resetAt = Math.floor((now + windowSize * 1000) / 1000);

    return {
      allowed: count < limit,
      remaining: Math.max(0, limit - count),
      current: count,
      limit,
      resetAt,
    };
  }

  async consume(key: string): Promise<RateLimitResult> {
    const redisKey = this.getKey(key);
    const windowSize = this.config.windowSize;
    const now = Date.now();
    const windowStart = now - windowSize * 1000;

    // 移除过期的请求记录
    await this.redis.zremrangebyscore(redisKey, 0, windowStart);
    
    // 添加当前请求
    await this.redis.zadd(redisKey, now, `${now}-${Math.random()}`);
    
    // 获取当前窗口内的请求数
    const count = await this.redis.zcard(redisKey);
    
    // 设置过期时间
    await this.redis.expire(redisKey, windowSize + 1);

    const limit = this.config.maxRequests;
    const resetAt = Math.floor((now + windowSize * 1000) / 1000);

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      current: count,
      limit,
      resetAt,
      retryAfter: count > limit ? windowSize * 1000 : undefined,
    };
  }

  async reset(key: string): Promise<void> {
    const redisKey = this.getKey(key);
    await this.redis.del(redisKey);
  }

  async getStatus(key: string): Promise<RateLimitResult> {
    return this.check(key);
  }
}

/**
 * 令牌桶限流器
 */
class TokenBucketRateLimiter implements IRateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;
  private keyPrefix: string;

  constructor(redis: Redis, config: RateLimitConfig, keyPrefix: string = 'ratelimit') {
    this.redis = redis;
    this.config = config;
    this.keyPrefix = keyPrefix;
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}:token:${key}`;
  }

  async check(key: string): Promise<RateLimitResult> {
    const bucket = await this.getBucket(key);
    const now = Date.now();
    const tokens = bucket.tokens;
    const limit = this.config.burstCapacity || this.config.maxRequests;
    const resetAt = Math.floor((now + (limit - tokens) / (this.config.rate || 1) * 1000) / 1000);

    return {
      allowed: tokens > 0,
      remaining: Math.floor(tokens),
      current: Math.floor(bucket.tokens),
      limit,
      resetAt,
    };
  }

  async consume(key: string): Promise<RateLimitResult> {
    const bucket = await this.getBucket(key);
    const now = Date.now();
    const rate = this.config.rate || 1;
    const burstCapacity = this.config.burstCapacity || this.config.maxRequests;
    
    // 计算可用的令牌数
    const timePassed = (now - bucket.lastRefill) / 1000;
    let tokens = Math.min(burstCapacity, bucket.tokens + timePassed * rate);
    
    // 消耗一个令牌
    if (tokens >= 1) {
      tokens -= 1;
    }

    // 保存更新后的桶状态
    await this.setBucket(key, {
      tokens,
      lastRefill: now,
    });

    const limit = burstCapacity;
    const resetAt = Math.floor((now + tokens / rate * 1000) / 1000);

    return {
      allowed: tokens >= 1,
      remaining: Math.floor(tokens),
      current: Math.floor(tokens),
      limit,
      resetAt,
      retryAfter: tokens < 1 ? Math.ceil((1 - tokens) / rate * 1000) : undefined,
    };
  }

  async reset(key: string): Promise<void> {
    const redisKey = this.getKey(key);
    await this.redis.del(redisKey);
  }

  async getStatus(key: string): Promise<RateLimitResult> {
    return this.check(key);
  }

  private async getBucket(key: string): Promise<{ tokens: number; lastRefill: number }> {
    const redisKey = this.getKey(key);
    const data = await this.redis.get(redisKey);
    
    if (data) {
      return JSON.parse(data);
    }
    
    return {
      tokens: this.config.burstCapacity || this.config.maxRequests,
      lastRefill: Date.now(),
    };
  }

  private async setBucket(key: string, bucket: { tokens: number; lastRefill: number }): Promise<void> {
    const redisKey = this.getKey(key);
    await this.redis.set(redisKey, JSON.stringify(bucket), 'EX', this.config.windowSize + 60);
  }
}

/**
 * 分布式限流器工厂
 */
export class DistributedRateLimiterFactory {
  /**
   * 创建限流器实例
   */
  static create(config: RateLimitConfig, redis: Redis, keyPrefix: string = 'ratelimit'): IRateLimiter {
    switch (config.algorithm) {
      case RateLimitAlgorithm.FIXED_WINDOW:
        return new FixedWindowRateLimiter(redis, config, keyPrefix);
      case RateLimitAlgorithm.SLIDING_WINDOW:
        return new SlidingWindowRateLimiter(redis, config, keyPrefix);
      case RateLimitAlgorithm.TOKEN_BUCKET:
        return new TokenBucketRateLimiter(redis, config, keyPrefix);
      default:
        throw new Error(`不支持的限流算法: ${config.algorithm}`);
    }
  }
}

/**
 * 内存限流器（单机版）
 */
export class InMemoryRateLimiter implements IRateLimiter {
  private config: RateLimitConfig;
  private counters: Map<string, { count: number; resetAt: number; tokens?: number }> = new Map();

  constructor(config: RateLimitConfig) {
    this.config = config;
    // 定期清理过期的计数器
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.counters.entries()) {
      if (value.resetAt * 1000 < now) {
        this.counters.delete(key);
      }
    }
  }

  async check(key: string): Promise<RateLimitResult> {
    const counter = this.counters.get(key);
    const now = Date.now();
    const windowSize = this.config.windowSize;
    const limit = this.config.maxRequests;

    if (!counter || counter.resetAt * 1000 < now) {
      return {
        allowed: true,
        remaining: limit - 1,
        current: 0,
        limit,
        resetAt: Math.floor(now / 1000) + windowSize,
      };
    }

    return {
      allowed: counter.count < limit,
      remaining: Math.max(0, limit - counter.count),
      current: counter.count,
      limit,
      resetAt: counter.resetAt,
    };
  }

  async consume(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowSize = this.config.windowSize;
    const limit = this.config.maxRequests;

    let counter = this.counters.get(key);
    
    // 检查是否需要重置
    if (!counter || counter.resetAt * 1000 < now) {
      counter = { count: 0, resetAt: Math.floor(now / 1000) + windowSize };
    }

    counter.count++;
    this.counters.set(key, counter);

    return {
      allowed: counter.count <= limit,
      remaining: Math.max(0, limit - counter.count),
      current: counter.count,
      limit,
      resetAt: counter.resetAt,
      retryAfter: counter.count > limit ? (counter.resetAt * 1000 - now) : undefined,
    };
  }

  async reset(key: string): Promise<void> {
    this.counters.delete(key);
  }

  async getStatus(key: string): Promise<RateLimitResult> {
    return this.check(key);
  }
}
