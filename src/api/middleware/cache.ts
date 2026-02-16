/**
 * 简单内存缓存中间件
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface CacheEntry {
  value: any;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();

// 缓存配置
const DEFAULT_TTL = 30000; // 30秒

export function cacheMiddleware(ttl: number = DEFAULT_TTL) {
  return async (fastify: FastifyInstance) => {
    
    // 定期清理过期缓存
    const cleanup = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of cache.entries()) {
        if (entry.expiry < now) {
          cache.delete(key);
        }
      }
    }, 60000); // 每分钟清理
    
    // 清理过期缓存
    fastify.addHook('onClose', () => clearInterval(cleanup));
    
    fastify.decorate('cache', {
      get: (key: string) => {
        const entry = cache.get(key);
        if (entry && entry.expiry > Date.now()) {
          return entry.value;
        }
        cache.delete(key);
        return null;
      },
      
      set: (key: string, value: any, ttl?: number) => {
        cache.set(key, {
          value,
          expiry: Date.now() + (ttl || DEFAULT_TTL),
        });
      },
      
      delete: (key: string) => cache.delete(key),
      
      clear: () => cache.clear(),
      
      size: () => cache.size,
    });
  };
}

// 缓存装饰器类型
declare module 'fastify' {
  interface FastifyInstance {
    cache: {
      get: (key: string) => any;
      set: (key: string, value: any, ttl?: number) => void;
      delete: (key: string) => void;
      clear: () => void;
      size: () => number;
    };
  }
}
