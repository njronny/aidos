import Redis from 'ioredis';

// Idempotency key configuration
export interface IdempotencyConfig {
  redisOptions?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
  keyPrefix?: string;
  ttlSeconds?: number; // Time to live for idempotency keys
}

// Idempotency check result
export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  existingResult?: any;
  keyExpiry?: number;
}

/**
 * IdempotencyService - Prevents duplicate task execution
 * Uses Redis to track task idempotency keys and their results
 */
export class IdempotencyService {
  private redis: Redis;
  private keyPrefix: string;
  private ttlSeconds: number;

  private static readonly DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days

  constructor(config: IdempotencyConfig = {}) {
    const redisOptions = {
      host: config.redisOptions?.host || process.env.REDIS_HOST || 'localhost',
      port: config.redisOptions?.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: config.redisOptions?.password || process.env.REDIS_PASSWORD,
      db: config.redisOptions?.db || parseInt(process.env.REDIS_DB || '0'),
    };

    this.redis = new Redis(redisOptions);
    this.keyPrefix = config.keyPrefix || 'aidos:idempotency:';
    this.ttlSeconds = config.ttlSeconds || IdempotencyService.DEFAULT_TTL;
  }

  /**
   * Generate an idempotency key from task parameters
   */
  generateKey(taskName: string, payload: any): string {
    // Create a deterministic hash of the payload
    const payloadHash = this.hashPayload(payload);
    return `${this.keyPrefix}${taskName}:${payloadHash}`;
  }

  /**
   * Simple hash function for payload
   */
  private hashPayload(payload: any): string {
    const str = JSON.stringify(payload, Object.keys(payload).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if a task is a duplicate
   * Returns existing result if task was already executed
   */
  async check(key: string): Promise<IdempotencyCheckResult> {
    const existingData = await this.redis.get(key);

    if (existingData) {
      try {
        const parsed = JSON.parse(existingData);
        const ttl = await this.redis.ttl(key);
        
        return {
          isDuplicate: true,
          existingResult: parsed.result,
          keyExpiry: ttl > 0 ? ttl : undefined,
        };
      } catch {
        // Invalid data, treat as new task
        return { isDuplicate: false };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Store the result of an executed task
   */
  async storeResult(key: string, result: any): Promise<void> {
    const data = JSON.stringify({
      result,
      executedAt: new Date().toISOString(),
    });

    await this.redis.setex(key, this.ttlSeconds, data);
  }

  /**
   * Try to acquire a lock for task execution
   * Returns true if lock acquired, false if another process is executing
   */
  async tryAcquireLock(key: string, ttlSeconds: number = 300): Promise<boolean> {
    const lockKey = `${key}:lock`;
    const result = await this.redis.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Release the lock after task execution
   */
  async releaseLock(key: string): Promise<void> {
    const lockKey = `${key}:lock`;
    await this.redis.del(lockKey);
  }

  /**
   * Execute a function with idempotency protection
   * If task was already executed, returns cached result
   */
  async executeIdempotent<T>(
    taskName: string,
    payload: any,
    executor: () => Promise<T>
  ): Promise<{ result: T; isCached: boolean }> {
    const key = this.generateKey(taskName, payload);

    // Check for existing result
    const check = await this.check(key);
    if (check.isDuplicate && check.existingResult !== undefined) {
      return { result: check.existingResult, isCached: true };
    }

    // Try to acquire lock
    const lockAcquired = await this.tryAcquireLock(key);
    if (!lockAcquired) {
      // Another process is executing, wait and check again
      await new Promise(resolve => setTimeout(resolve, 1000));
      const retryCheck = await this.check(key);
      if (retryCheck.isDuplicate && retryCheck.existingResult !== undefined) {
        return { result: retryCheck.existingResult, isCached: true };
      }
      throw new Error('Could not acquire idempotency lock');
    }

    try {
      // Execute the task
      const result = await executor();

      // Store the result
      await this.storeResult(key, result);

      return { result, isCached: false };
    } finally {
      // Always release the lock
      await this.releaseLock(key);
    }
  }

  /**
   * Invalidate an idempotency key (allow re-execution)
   */
  async invalidate(key: string): Promise<void> {
    await this.redis.del(key);
    await this.redis.del(`${key}:lock`);
  }

  /**
   * Invalidate by task name and payload
   */
  async invalidateByTask(taskName: string, payload: any): Promise<void> {
    const key = this.generateKey(taskName, payload);
    await this.invalidate(key);
  }

  /**
   * Get all idempotency keys for a task name
   */
  async getKeysForTask(taskName: string): Promise<string[]> {
    const pattern = `${this.keyPrefix}${taskName}:*`;
    return this.redis.keys(pattern);
  }

  /**
   * Clear all idempotency keys (use with caution)
   */
  async clearAll(): Promise<void> {
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Get statistics about idempotency storage
   */
  async getStats(): Promise<{
    totalKeys: number;
    keysByTask: Record<string, number>;
    oldestKeyAge: number;
  }> {
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.redis.keys(pattern);
    
    const keysByTask: Record<string, number> = {};
    let oldestTimestamp: number = Date.now();

    for (const key of keys) {
      // Extract task name from key
      const match = key.match(/^aidos:idempotency:([^:]+):/);
      if (match) {
        const taskName = match[1];
        keysByTask[taskName] = (keysByTask[taskName] || 0) + 1;
      }

      // Check TTL to find oldest
      const ttl = await this.redis.ttl(key);
      if (ttl > 0) {
        const age = this.ttlSeconds - ttl;
        if (age > 0 && age < oldestTimestamp) {
          oldestTimestamp = age;
        }
      }
    }

    return {
      totalKeys: keys.length,
      keysByTask,
      oldestKeyAge: Date.now() - oldestTimestamp,
    };
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export default IdempotencyService;
