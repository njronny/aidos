/**
 * 缓存管理器 - 单例模式管理全局缓存服务
 */
import { CacheService } from './CacheService';
import { CacheOptions } from './types';

let cacheServiceInstance: CacheService | null = null;

/**
 * 获取缓存服务实例
 */
export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    throw new Error('CacheService not initialized. Call initializeCache first.');
  }
  return cacheServiceInstance;
}

/**
 * 初始化缓存服务
 */
export async function initializeCache(): Promise<CacheService> {
  if (cacheServiceInstance) {
    return cacheServiceInstance;
  }

  const options: CacheOptions = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB || '0'),
    },
    l1Cache: {
      enabled: process.env.L1_CACHE_ENABLED !== 'false',
      maxSize: parseInt(process.env.L1_CACHE_SIZE || '500'),
      ttl: parseInt(process.env.L1_CACHE_TTL || '5000'),
    },
    defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '300'),
    keyPrefix: process.env.CACHE_KEY_PREFIX || 'aidos:',
  };

  cacheServiceInstance = new CacheService(options);
  await cacheServiceInstance.connect();

  return cacheServiceInstance;
}

/**
 * 关闭缓存服务
 */
export async function closeCache(): Promise<void> {
  if (cacheServiceInstance) {
    await cacheServiceInstance.disconnect();
    cacheServiceInstance = null;
  }
}

// 导出缓存命名空间
export { CacheNamespace } from './types';
