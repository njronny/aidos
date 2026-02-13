/**
 * CacheService - 多层缓存服务
 * L1: 内存缓存 (快速访问)
 * L2: Redis缓存 (持久化)
 */
import Redis from 'ioredis';
import { CacheOptions, CacheNamespace, L1CacheEntry, CacheServiceConfig } from './types';

export class CacheService {
  private redis: Redis | null = null;
  private l1Cache: Map<string, L1CacheEntry<unknown>> = new Map();
  private config: CacheServiceConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor(options: CacheOptions) {
    this.config = {
      redis: options.redis,
      l1Cache: {
        enabled: options.l1Cache?.enabled ?? true,
        maxSize: options.l1Cache?.maxSize ?? 500,
        ttl: options.l1Cache?.ttl ?? 5000,
      },
      defaultTTL: options.defaultTTL ?? 300,
      connectTimeout: options.connectTimeout ?? 5000,
      keyPrefix: options.keyPrefix ?? 'aidos:',
    };
  }

  /**
   * 连接到Redis
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db ?? 0,
      connectionName: this.config.redis.connectionName ?? 'aidos-cache',
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('[CacheService] Redis连接重试次数过多，停止重试');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 3,
      connectTimeout: this.config.connectTimeout,
      lazyConnect: true,
    });

    try {
      await this.redis.connect();
      this.isConnected = true;
      console.log('[CacheService] Redis连接成功');

      // 启动L1缓存清理定时器
      this.startCleanupInterval();
    } catch (error) {
      console.warn('[CacheService] Redis连接失败，将使用内存缓存模式:', error);
      this.isConnected = false;
    }
  }

  /**
   * 断开Redis连接
   */
  async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
    this.l1Cache.clear();
    this.isConnected = false;
  }

  /**
   * 启动L1缓存清理
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupL1Cache();
    }, this.config.l1Cache.ttl);
  }

  /**
   * 清理过期的L1缓存
   */
  private cleanupL1Cache(): void {
    const now = Date.now();
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.expiresAt < now) {
        this.l1Cache.delete(key);
      }
    }

    // 如果缓存超过最大size，删除最旧的
    if (this.l1Cache.size > this.config.l1Cache.maxSize) {
      const entries = Array.from(this.l1Cache.entries());
      const toDelete = entries.slice(0, entries.length - this.config.l1Cache.maxSize);
      for (const [key] of toDelete) {
        this.l1Cache.delete(key);
      }
    }
  }

  /**
   * 构建缓存键
   */
  private buildKey(key: string, namespace?: CacheNamespace): string {
    const ns = namespace ? `${namespace}:` : '';
    return `${this.config.keyPrefix}${ns}${key}`;
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string, namespace?: CacheNamespace): Promise<T | null> {
    const cacheKey = this.buildKey(key, namespace);

    // 尝试从L1缓存获取
    if (this.config.l1Cache.enabled) {
      const l1Entry = this.l1Cache.get(cacheKey) as L1CacheEntry<T> | undefined;
      if (l1Entry && l1Entry.expiresAt > Date.now()) {
        return l1Entry.value;
      }
    }

    // 从Redis获取
    if (this.redis && this.isConnected) {
      try {
        const value = await this.redis.get(cacheKey);
        if (value === null) {
          return null;
        }
        const parsed = JSON.parse(value) as T;

        // 存入L1缓存
        if (this.config.l1Cache.enabled) {
          this.l1Cache.set(cacheKey, {
            value: parsed,
            expiresAt: Date.now() + this.config.l1Cache.ttl,
          });
        }

        return parsed;
      } catch (error) {
        console.error('[CacheService] Redis get error:', error);
      }
    }

    return null;
  }

  /**
   * 设置缓存值
   */
  async set<T>(key: string, value: T, ttl: number, namespace?: CacheNamespace): Promise<void> {
    const cacheKey = this.buildKey(key, namespace);

    // 存入L1缓存
    if (this.config.l1Cache.enabled) {
      this.l1Cache.set(cacheKey, {
        value,
        expiresAt: Date.now() + this.config.l1Cache.ttl,
      });
    }

    // 存入Redis
    if (this.redis && this.isConnected) {
      try {
        await this.redis.setex(cacheKey, ttl, JSON.stringify(value));
      } catch (error) {
        console.error('[CacheService] Redis set error:', error);
      }
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string, namespace?: CacheNamespace): Promise<void> {
    const cacheKey = this.buildKey(key, namespace);

    // 从L1缓存删除
    this.l1Cache.delete(cacheKey);

    // 从Redis删除
    if (this.redis && this.isConnected) {
      try {
        await this.redis.del(cacheKey);
      } catch (error) {
        console.error('[CacheService] Redis delete error:', error);
      }
    }
  }

  /**
   * 检查键是否存在
   */
  async has(key: string, namespace?: CacheNamespace): Promise<boolean> {
    const cacheKey = this.buildKey(key, namespace);

    // 检查L1缓存
    if (this.config.l1Cache.enabled) {
      const l1Entry = this.l1Cache.get(cacheKey);
      if (l1Entry && l1Entry.expiresAt > Date.now()) {
        return true;
      }
    }

    // 检查Redis
    if (this.redis && this.isConnected) {
      try {
        const exists = await this.redis.exists(cacheKey);
        return exists === 1;
      } catch (error) {
        console.error('[CacheService] Redis exists error:', error);
      }
    }

    return false;
  }

  /**
   * 批量获取
   */
  async getMany<T>(keys: string[], namespace?: CacheNamespace): Promise<Record<string, T | null>> {
    const cacheKeys = keys.map(k => this.buildKey(k, namespace));
    const result: Record<string, T | null> = {};

    // 分离L1缓存和需要从Redis获取的键
    const l1Keys: string[] = [];
    const redisKeys: string[] = [];

    if (this.config.l1Cache.enabled) {
      for (const key of cacheKeys) {
        const l1Entry = this.l1Cache.get(key) as L1CacheEntry<T> | undefined;
        if (l1Entry && l1Entry.expiresAt > Date.now()) {
          const originalKey = keys[cacheKeys.indexOf(key)];
          result[originalKey] = l1Entry.value;
          l1Keys.push(key);
        } else {
          redisKeys.push(key);
        }
      }
    } else {
      redisKeys.push(...cacheKeys);
    }

    // 从Redis批量获取
    if (this.redis && this.isConnected && redisKeys.length > 0) {
      try {
        const values = await this.redis.mget(...redisKeys);
        for (let i = 0; i < redisKeys.length; i++) {
          const originalKey = keys[cacheKeys.indexOf(redisKeys[i])];
          const value = values[i];
          if (value) {
            const parsed = JSON.parse(value) as T;
            result[originalKey] = parsed;

            // 存入L1缓存
            if (this.config.l1Cache.enabled) {
              this.l1Cache.set(redisKeys[i], {
                value: parsed,
                expiresAt: Date.now() + this.config.l1Cache.ttl,
              });
            }
          } else {
            result[originalKey] = null;
          }
        }
      } catch (error) {
        console.error('[CacheService] Redis mget error:', error);
      }
    }

    return result;
  }

  /**
   * 批量设置
   */
  async setMany<T>(data: Record<string, T>, ttl: number, namespace?: CacheNamespace): Promise<void> {
    const cacheKeyMap: Record<string, string> = {};

    // 存入L1缓存
    if (this.config.l1Cache.enabled) {
      for (const [key, value] of Object.entries(data)) {
        const cacheKey = this.buildKey(key, namespace);
        cacheKeyMap[cacheKey] = key;
        this.l1Cache.set(cacheKey, {
          value,
          expiresAt: Date.now() + this.config.l1Cache.ttl,
        });
      }
    }

    // 存入Redis
    if (this.redis && this.isConnected) {
      try {
        const pipeline = this.redis.pipeline();
        for (const [key, value] of Object.entries(data)) {
          const cacheKey = this.buildKey(key, namespace);
          pipeline.setex(cacheKey, ttl, JSON.stringify(value));
        }
        await pipeline.exec();
      } catch (error) {
        console.error('[CacheService] Redis mset error:', error);
      }
    }
  }

  /**
   * 批量删除
   */
  async deleteMany(keys: string[], namespace?: CacheNamespace): Promise<void> {
    const cacheKeys = keys.map(k => this.buildKey(k, namespace));

    // 从L1缓存删除
    for (const key of cacheKeys) {
      this.l1Cache.delete(key);
    }

    // 从Redis删除
    if (this.redis && this.isConnected) {
      try {
        await this.redis.del(...cacheKeys);
      } catch (error) {
        console.error('[CacheService] Redis deleteMany error:', error);
      }
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    // 清空L1缓存
    this.l1Cache.clear();

    // 清空Redis
    if (this.redis && this.isConnected) {
      try {
        await this.redis.flushdb();
      } catch (error) {
        console.error('[CacheService] Redis flushdb error:', error);
      }
    }
  }

  /**
   * 清空指定命名空间
   */
  async clearNamespace(namespace: CacheNamespace): Promise<void> {
    const pattern = `${this.config.keyPrefix}${namespace}:*`;

    // 从L1缓存删除
    if (this.config.l1Cache.enabled) {
      for (const key of this.l1Cache.keys()) {
        if (key.startsWith(`${this.config.keyPrefix}${namespace}:`)) {
          this.l1Cache.delete(key);
        }
      }
    }

    // 从Redis删除
    if (this.redis && this.isConnected) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.error('[CacheService] Redis clearNamespace error:', error);
      }
    }
  }

  /**
   * 获取Redis连接状态
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * 获取L1缓存大小
   */
  getL1CacheSize(): number {
    return this.l1Cache.size;
  }
}

export * from './types';
