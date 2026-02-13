/**
 * CacheService 单元测试
 */
import { CacheService } from '../CacheService';

describe('CacheService', () => {
  let cacheService: CacheService;
  let useRedis = false;

  beforeAll(async () => {
    cacheService = new CacheService({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      l1Cache: { enabled: true, maxSize: 100, ttl: 500 },
      defaultTTL: 60,
    });
    await cacheService.connect();
    useRedis = cacheService.isRedisConnected();
  });

  afterAll(async () => {
    try {
      await cacheService.disconnect();
    } catch (e) {}
  });

  beforeEach(async () => {
    await cacheService.clear();
  });

  describe('基础缓存操作', () => {
    it('should set and get a value', async () => {
      await cacheService.set('test:key1', { name: 'test' }, 60);
      const result = await cacheService.get('test:key1');
      expect(result).toEqual({ name: 'test' });
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      await cacheService.set('test:delete', 'value', 60);
      await cacheService.delete('test:delete');
      const result = await cacheService.get('test:delete');
      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      await cacheService.set('test:exists', 'value', 60);
      const exists = await cacheService.has('test:exists');
      expect(exists).toBe(true);
    });
  });

  describe('TTL过期', () => {
    it('should expire key after TTL', async () => {
      if (!useRedis) {
        // Redis不可用时测试L1缓存
        await cacheService.set('test:ttl', 'value', 1);
        await new Promise(r => setTimeout(r, 1100));
        const result = await cacheService.get('test:ttl');
        expect(result).toBeNull();
      } else {
        await cacheService.set('test:ttl', 'value', 1);
        await new Promise(r => setTimeout(r, 1500));
        const result = await cacheService.get('test:ttl');
        expect(result).toBeNull();
      }
    }, 3000);
  });

  describe('批量操作', () => {
    it('should get multiple keys at once', async () => {
      await cacheService.set('batch:key1', 'value1', 60);
      await cacheService.set('batch:key2', 'value2', 60);
      
      const result = await cacheService.getMany(['batch:key1', 'batch:key2']);
      expect(result['batch:key1']).toBe('value1');
      expect(result['batch:key2']).toBe('value2');
    });
  });

  describe('清理功能', () => {
    it('should clear all keys', async () => {
      await cacheService.set('clear:key1', 'value1', 60);
      await cacheService.set('clear:key2', 'value2', 60);
      await cacheService.clear();
      
      const result1 = await cacheService.get('clear:key1');
      const result2 = await cacheService.get('clear:key2');
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });
});
