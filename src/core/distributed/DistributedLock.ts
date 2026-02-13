import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

/**
 * Distributed lock configuration options
 */
export interface DistributedLockOptions {
  /** Redis connection instance */
  redis: Redis;
  /** Lock key */
  key: string;
  /** Lock expiration time in milliseconds */
  expirationMs?: number;
  /** Retry delay in milliseconds when acquiring lock fails */
  retryDelayMs?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Wait for lock timeout in milliseconds */
  waitTimeoutMs?: number;
}

/**
 * Distributed lock result
 */
export interface LockResult {
  /** Whether the lock was acquired successfully */
  success: boolean;
  /** Unique lock identifier (for release) */
  lockId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * DistributedLock - Redis-based distributed lock implementation
 * Uses SET NX EX pattern for atomic lock acquisition with expiration
 */
export class DistributedLock {
  private redis: Redis;
  private key: string;
  private lockId: string;
  private expirationMs: number;
  private retryDelayMs: number;
  private maxRetries: number;
  private waitTimeoutMs: number;
  private isAcquired: boolean = false;

  constructor(options: DistributedLockOptions) {
    if (!options.redis) {
      throw new Error('Redis instance is required');
    }
    if (!options.key) {
      throw new Error('Lock key is required');
    }

    this.redis = options.redis;
    this.key = `lock:${options.key}`;
    this.expirationMs = options.expirationMs ?? 30000; // Default 30 seconds
    this.retryDelayMs = options.retryDelayMs ?? 100;
    this.maxRetries = options.maxRetries ?? 10;
    this.waitTimeoutMs = options.waitTimeoutMs ?? 10000;
    this.lockId = uuidv4();
  }

  /**
   * Acquire the distributed lock
   * Uses SET NX EX pattern for atomic acquisition
   */
  async acquire(): Promise<LockResult> {
    // Try to acquire lock with atomic SET NX EX
    const result = await this.redis.set(this.key, this.lockId, 'PX', this.expirationMs, 'NX');

    if (result === 'OK') {
      this.isAcquired = true;
      return {
        success: true,
        lockId: this.lockId,
      };
    }

    // Lock not acquired, try with retry logic
    return this.acquireWithRetry();
  }

  /**
   * Acquire lock with retry logic
   */
  private async acquireWithRetry(): Promise<LockResult> {
    const startTime = Date.now();
    let attempts = 0;

    while (attempts < this.maxRetries) {
      // Check timeout
      if (Date.now() - startTime >= this.waitTimeoutMs) {
        return {
          success: false,
          error: `Lock acquisition timeout after ${this.waitTimeoutMs}ms`,
        };
      }

      // Wait before retry
      await this.sleep(this.retryDelayMs);
      attempts++;

      // Try to acquire
      const result = await this.redis.set(this.key, this.lockId, 'PX', this.expirationMs, 'NX');

      if (result === 'OK') {
        this.isAcquired = true;
        return {
          success: true,
          lockId: this.lockId,
        };
      }
    }

    return {
      success: false,
      error: `Failed to acquire lock after ${attempts} attempts`,
    };
  }

  /**
   * Release the distributed lock
   * Uses Lua script for atomic check-and-delete
   */
  async release(): Promise<boolean> {
    if (!this.isAcquired) {
      return false;
    }

    // Use Lua script for atomic check-and-delete
    // Only delete if the lock value matches our lockId
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(script, 1, this.key, this.lockId);
    this.isAcquired = false;

    return result === 1;
  }

  /**
   * Extend the lock expiration time
   * Uses Lua script for atomic check-and-extend
   */
  async extend(newExpirationMs: number): Promise<boolean> {
    if (!this.isAcquired) {
      return false;
    }

    // Use Lua script for atomic check-and-extend
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(
      script,
      1,
      this.key,
      this.lockId,
      newExpirationMs.toString()
    );

    if (result === 1) {
      this.expirationMs = newExpirationMs;
      return true;
    }

    return false;
  }

  /**
   * Check if lock is currently held
   */
  async isLocked(): Promise<boolean> {
    const value = await this.redis.get(this.key);
    return value !== null;
  }

  /**
   * Get remaining TTL in milliseconds
   */
  async getRemainingTTL(): Promise<number> {
    const ttl = await this.redis.pttl(this.key);
    return ttl > 0 ? ttl : 0;
  }

  /**
   * Get the lock ID
   */
  getLockId(): string {
    return this.lockId;
  }

  /**
   * Check if this instance has acquired the lock
   */
  get isLockedByThis(): boolean {
    return this.isAcquired;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * LockGuard - Automatic lock management with try-catch-finally
 */
export class LockGuard {
  private lock: DistributedLock;
  private acquired: boolean = false;

  constructor(lock: DistributedLock) {
    this.lock = lock;
  }

  async acquire(): Promise<LockResult> {
    const result = await this.lock.acquire();
    this.acquired = result.success;
    return result;
  }

  async release(): Promise<boolean> {
    if (!this.acquired) {
      return false;
    }
    const result = await this.lock.release();
    this.acquired = false;
    return result;
  }
}

/**
 * DistributedLockManager - Manages multiple distributed locks
 */
export class DistributedLockManager {
  private locks: Map<string, DistributedLock> = new Map();
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Create and store a distributed lock
   */
  createLock(key: string, options?: Partial<Omit<DistributedLockOptions, 'redis' | 'key'>>): DistributedLock {
    const lock = new DistributedLock({
      redis: this.redis,
      key,
      ...options,
    });
    this.locks.set(key, lock);
    return lock;
  }

  /**
   * Get an existing lock
   */
  getLock(key: string): DistributedLock | undefined {
    return this.locks.get(key);
  }

  /**
   * Release all locks
   */
  async releaseAll(): Promise<void> {
    const releasePromises = Array.from(this.locks.values()).map((lock) => lock.release());
    await Promise.all(releasePromises);
    this.locks.clear();
  }

  /**
   * Execute function with lock protection
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options?: Partial<Omit<DistributedLockOptions, 'redis' | 'key'>>
  ): Promise<T> {
    const lock = this.createLock(key, options);
    const result = await lock.acquire();

    if (!result.success) {
      throw new Error(`Failed to acquire lock: ${result.error}`);
    }

    try {
      return await fn();
    } finally {
      await lock.release();
    }
  }
}

export default DistributedLock;
