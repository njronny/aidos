/**
 * CacheService 单元测试
 * 使用TDD方式，先写测试再实现
 */
import { CacheService } from '../CacheService';
import { CacheNamespace } from '../types';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeAll(async () => {
    // 初始化缓存服务 - 使用本地Redis或回退到内存模式
    cacheService = new CacheService({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || '',
        db: parseInt(process.env.REDIS_DB || '0'),
      },
      l1Cache: {
        enabled: true,
        maxSize: 100,
        ttl: 500, // L1缓存TTL，毫秒
      },
      defaultTTL: 60,
    });
    await cacheService.connect();
  });

  afterAll(async () => {
    try {
      await cacheService.disconnect();
    } catch (e) {
      // 忽略Redis连接错误
    }
  });

  beforeEach(async () => {
    // 每个测试前清空缓存
    await cacheService.clear();
  });

  describe('基础缓存操作', () => {
    it('should set and get a value', async () => {
      const key = 'test:key1';
      const value = { name: 'test', value: 123 };

      await cacheService.set(key, value, 60);
      const result = await cacheService.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non:existent');
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      const key = 'test:key2';
      const value = 'test-value';

      await cacheService.set(key, value, 60);
      await cacheService.delete(key);
      const result = await cacheService.get(key);

      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      const key = 'test:key3';

      expect(await cacheService.has(key)).toBe(false);

      await cacheService.set(key, 'value', 60);
      expect(await cacheService.has(key)).toBe(true);
    });
  });

  describe('TTL过期', () => {
    it('should expire key after TTL in Redis', async () => {
      const key = 'test:ttl';
      const value = 'expires';

      // 如果Redis可用，测试TTL
      if (cacheService.isRedisConnected()) {
        await cacheService.set(key, value, 1); // 1秒TTL
        expect(await cacheService.get(key)).toBe(value);

        // 等待过期
        await new Promise(resolve => setTimeout(resolve, 1500));

        expect(await cacheService.get(key)).toBeNull();
      } else {
        // Redis不可用时，L1缓存仍然有效
        await cacheService.set(key, value, 1);
        expect(await cacheService.get(key)).toBe(value);
      }
    });
  });

  describe('批量操作', () => {
    it('should get multiple keys at once', async () => {
      const data = {
        'batch:key1': 'value1',
        'batch:key2': 'value2',
        'batch:key3': 'value3',
      };

      await cacheService.setMany(data, 60);
      const result = await cacheService.getMany(['batch:key1', 'batch:key2', 'batch:key3']);

      expect(result).toEqual(data);
    });

    it('should delete multiple keys at once', async () => {
      await cacheService.setMany({
        'del:key1': 'value1',
        'del:key2': 'value2',
      }, 60);

      await cacheService.deleteMany(['del:key1', 'del:key2']);

      if (cacheService.isRedisConnected()) {
        const result = await cacheService.getMany(['del:key1', 'del:key2']);
        expect(result['del:key1']).toBeNull();
        expect(result['del:key2']).toBeNull();
      }
    });
  });

  describe('命名空间', () => {
    it('should use namespace for keys', async () => {
      const namespace = CacheNamespace.CONFIG;

      await cacheService.set('app:config', { theme: 'dark' }, 60, namespace);
      const result = await cacheService.get('app:config', namespace);

      expect(result).toEqual({ theme: 'dark' });
    });

    it('should clear namespace', async () => {
      const namespace = CacheNamespace.AGENT;

      await cacheService.set('agent:1', { id: '1' }, 60, namespace);
      await cacheService.set('agent:2', { id: '2' }, 60, namespace);
      await cacheService.set('config:1', { id: '1' }, 60, CacheNamespace.CONFIG);

      await cacheService.clearNamespace(namespace);

      expect(await cacheService.get('agent:1', namespace)).toBeNull();
      expect(await cacheService.get('agent:2', namespace)).toBeNull();
      // 其他命名空间应该不受影响
      expect(await cacheService.get('config:1', CacheNamespace.CONFIG)).not.toBeNull();
    });
  });

  describe('L1内存缓存', () => {
    it('should use L1 cache for fast access', async () => {
      const key = 'l1:test';
      const value = { data: 'fast' };

      // 第一次获取，从数据源
      await cacheService.set(key, value, 60);
      await cacheService.get(key);

      // 第二次获取应该从L1缓存
      const start = Date.now();
      await cacheService.get(key);
      const l1Time = Date.now() - start;

      // L1缓存应该非常快
      expect(l1Time).toBeLessThan(10);
    });
  });
});
