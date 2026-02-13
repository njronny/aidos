/**
 * Token存储 - 使用Redis缓存
 */
import { CacheService, CacheNamespace } from '../core/cache';

interface TokenData {
  username: string;
  createdAt: string;
  expiresAt: string;
}

class TokenStore {
  private cacheService: CacheService | null = null;
  private memoryFallback = new Map<string, TokenData>();

  setCacheService(cache: CacheService) {
    this.cacheService = cache;
  }

  async set(refreshToken: string, data: TokenData, ttlSeconds: number = 604800): Promise<void> { // 默认7天
    const key = `refresh:${refreshToken}`;
    
    if (this.cacheService) {
      try {
        await this.cacheService.set(key, data, ttlSeconds, CacheNamespace.TOKEN);
      } catch (error) {
        console.warn('[TokenStore] Redis存储失败，使用内存回退:', error);
        this.memoryFallback.set(key, data);
      }
    } else {
      this.memoryFallback.set(key, data);
    }
  }

  async get(refreshToken: string): Promise<TokenData | null> {
    const key = `refresh:${refreshToken}`;
    
    if (this.cacheService) {
      try {
        return await this.cacheService.get<TokenData>(key, CacheNamespace.TOKEN);
      } catch (error) {
        console.warn('[TokenStore] Redis获取失败，使用内存回退');
        return this.memoryFallback.get(key) || null;
      }
    }
    
    return this.memoryFallback.get(key) || null;
  }

  async delete(refreshToken: string): Promise<void> {
    const key = `refresh:${refreshToken}`;
    
    if (this.cacheService) {
      try {
        await this.cacheService.delete(key, CacheNamespace.TOKEN);
      } catch (error) {
        console.warn('[TokenStore] Redis删除失败');
      }
    }
    
    this.memoryFallback.delete(key);
  }

  async clear(): Promise<void> {
    if (this.cacheService) {
      try {
        await this.cacheService.clearNamespace(CacheNamespace.TOKEN);
      } catch (error) {
        console.warn('[TokenStore] Redis清空失败');
      }
    }
    this.memoryFallback.clear();
  }
}

// Token存储单例
export const tokenStore = new TokenStore();

// 设置缓存服务
export function setTokenStoreCache(cache: CacheService) {
  tokenStore.setCacheService(cache);
}

export { TokenStore };
