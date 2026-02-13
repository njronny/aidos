/**
 * DistributedLock 单元测试
 */

// Define mock Redis interface matching ioredis methods we use
interface MockRedisInterface {
  store: Map<string, { value: string; pttl?: number }>;
  expireTimers: Map<string, NodeJS.Timeout>;
  set(key: string, value: string, ...args: string[]): Promise<string | null>;
  get(key: string): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  pttl(key: string): Promise<number>;
  eval(script: string, numKeys: number, ...args: string[]): Promise<any>;
  setSync(key: string, value: string): void;
  clear(): void;
}

// Mock Redis client for testing
const mockRedis: MockRedisInterface = {
  store: new Map(),
  expireTimers: new Map(),

  async set(key: string, value: string, ...args: string[]): Promise<string | null> {
    const hasNX = args.includes('NX');
    const hasPX = args.includes('PX');
    
    // Handle NX (only set if not exists)
    if (hasNX && this.store.has(key)) {
      return null;
    }

    // Handle PX (expiration in milliseconds)
    let pttl: number | undefined;
    if (hasPX) {
      const pxIndex = args.indexOf('PX');
      if (pxIndex !== -1 && args[pxIndex + 1]) {
        pttl = parseInt(args[pxIndex + 1], 10);
        // Auto-expire
        const timer = setTimeout(() => {
          this.store.delete(key);
          this.expireTimers.delete(key);
        }, pttl);
        this.expireTimers.set(key, timer);
      }
    }

    this.store.set(key, { value, pttl });
    return 'OK';
  },

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    return entry?.value ?? null;
  },

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        count++;
        const timer = this.expireTimers.get(key);
        if (timer) {
          clearTimeout(timer);
          this.expireTimers.delete(key);
        }
      }
    }
    return count;
  },

  async pttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (!entry.pttl) return -1;
    return entry.pttl;
  },

  async eval(script: string, numKeys: number, ...args: string[]): Promise<any> {
    // Simple mock for Lua script evaluation
    if (script.includes('redis.call("get"') && script.includes('redis.call("del"')) {
      const key = args[0];
      const expectedValue = args[1];
      const entry = this.store.get(key);
      if (entry?.value === expectedValue) {
        return this.del(key);
      }
      return 0;
    }
    if (script.includes('redis.call("pexpire"')) {
      const key = args[0];
      const expectedValue = args[1];
      const newPttl = parseInt(args[2], 10);
      const entry = this.store.get(key);
      if (entry?.value === expectedValue) {
        entry.pttl = newPttl;
        const timer = this.expireTimers.get(key);
        if (timer) {
          clearTimeout(timer);
        }
        const newTimer = setTimeout(() => {
          this.store.delete(key);
          this.expireTimers.delete(key);
        }, newPttl);
        this.expireTimers.set(key, newTimer);
        return 1;
      }
      return 0;
    }
    return 0;
  },

  setSync(key: string, value: string): void {
    this.store.set(key, { value });
  },

  clear(): void {
    for (const timer of this.expireTimers.values()) {
      clearTimeout(timer);
    }
    this.store.clear();
    this.expireTimers.clear();
  }
};

import { DistributedLock, LockGuard, DistributedLockManager } from '../DistributedLock';

describe('DistributedLock', () => {
  let lock: DistributedLock;

  beforeEach(() => {
    mockRedis.clear();
  });

  describe('基础锁操作', () => {
    it('should acquire a lock successfully', async () => {
      lock = new DistributedLock({
        redis: mockRedis as any,
        key: 'test-lock',
        expirationMs: 5000,
      });

      const result = await lock.acquire();
      
      expect(result.success).toBe(true);
      expect(result.lockId).toBeDefined();
    });

    it('should fail to acquire lock when already held', async () => {
      lock = new DistributedLock({
        redis: mockRedis as any,
        key: 'test-lock',
        expirationMs: 5000,
      });

      await lock.acquire();
      
      // Try to acquire same lock with different instance
      const lock2 = new DistributedLock({
        redis: mockRedis as any,
        key: 'test-lock',
        expirationMs: 5000,
      });

      const result = await lock2.acquire();
      
      expect(result.success).toBe(false);
    });

    it('should release a lock successfully', async () => {
      lock = new DistributedLock({
        redis: mockRedis as any,
        key: 'test-lock',
        expirationMs: 5000,
      });

      await lock.acquire();
      const released = await lock.release();
      
      expect(released).toBe(true);
    });

    it('should fail to release lock that is not held', async () => {
      lock = new DistributedLock({
        redis: mockRedis as any,
        key: 'test-lock',
        expirationMs: 5000,
      });

      const released = await lock.release();
      
      expect(released).toBe(false);
    });
  });

  describe('锁续期', () => {
    it('should extend lock expiration', async () => {
      lock = new DistributedLock({
        redis: mockRedis as any,
        key: 'test-lock',
        expirationMs: 5000,
      });

      await lock.acquire();
      const extended = await lock.extend(10000);
      
      expect(extended).toBe(true);
    });

    it('should fail to extend lock that is not held', async () => {
      lock = new DistributedLock({
        redis: mockRedis as any,
        key: 'test-lock',
        expirationMs: 5000,
      });

      const extended = await lock.extend(10000);
      
      expect(extended).toBe(false);
    });
  });

  describe('锁状态查询', () => {
    it('should check if lock is held', async () => {
      lock = new DistributedLock({
        redis: mockRedis as any,
        key: 'test-lock',
        expirationMs: 5000,
      });

      await lock.acquire();
      const isLocked = await lock.isLocked();
      
      expect(isLocked).toBe(true);
    });

    it('should return remaining TTL', async () => {
      lock = new DistributedLock({
        redis: mockRedis as any,
        key: 'test-lock',
        expirationMs: 5000,
      });

      await lock.acquire();
      const ttl = await lock.getRemainingTTL();
      
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(5000);
    });
  });

  describe('LockGuard', () => {
    it('should automatically release lock on guard destruction', async () => {
      const guard = new LockGuard(
        new DistributedLock({
          redis: mockRedis as any,
          key: 'guard-test',
          expirationMs: 5000,
        })
      );

      await guard.acquire();
      expect(guard.release()).resolves.toBe(true);
    });
  });

  describe('DistributedLockManager', () => {
    it('should create and manage locks', () => {
      const manager = new DistributedLockManager(mockRedis as any);
      
      const lock1 = manager.createLock('lock1');
      const lock2 = manager.createLock('lock2');
      
      expect(lock1).toBeInstanceOf(DistributedLock);
      expect(lock2).toBeInstanceOf(DistributedLock);
      expect(manager.getLock('lock1')).toBe(lock1);
    });

    it('should execute function with lock protection', async () => {
      const manager = new DistributedLockManager(mockRedis as any);
      let executed = false;

      const result = await manager.withLock('protected', async () => {
        executed = true;
        return 'result';
      });

      expect(executed).toBe(true);
      expect(result).toBe('result');
    });

    it('should release all locks', async () => {
      const manager = new DistributedLockManager(mockRedis as any);
      
      const lock1 = manager.createLock('lock1');
      const lock2 = manager.createLock('lock2');
      
      await lock1.acquire();
      await lock2.acquire();
      
      // Store references before releasing
      const lock1Ref = lock1;
      const lock2Ref = lock2;
      
      await manager.releaseAll();
      
      expect(await lock1Ref.isLocked()).toBe(false);
      expect(await lock2Ref.isLocked()).toBe(false);
    });
  });

  describe('错误处理', () => {
    it('should throw error when Redis is not provided', () => {
      expect(() => {
        new DistributedLock({
          redis: null as any,
          key: 'test',
        });
      }).toThrow('Redis instance is required');
    });

    it('should throw error when key is not provided', () => {
      expect(() => {
        new DistributedLock({
          redis: mockRedis as any,
          key: '',
        });
      }).toThrow('Lock key is required');
    });
  });
});
