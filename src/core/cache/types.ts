/**
 * 缓存模块类型定义
 */
import { CacheService } from './CacheService';

// 重新导出CacheService
export { CacheService } from './CacheService';

/**
 * 缓存命名空间
 */
export enum CacheNamespace {
  /** 项目配置缓存 */
  CONFIG = 'config',
  /** Agent状态缓存 */
  AGENT = 'agent',
  /** Token缓存 */
  TOKEN = 'token',
  /** 技能缓存 */
  SKILL = 'skill',
  /** 通用缓存 */
  GENERAL = 'general',
}

/**
 * 缓存配置选项
 */
export interface CacheOptions {
  /** Redis配置 */
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    connectionName?: string;
  };
  /** L1内存缓存配置 */
  l1Cache?: {
    enabled: boolean;
    maxSize?: number;
    ttl?: number; // L1缓存TTL，毫秒
  };
  /** 默认TTL（秒） */
  defaultTTL?: number;
  /** 连接超时（毫秒） */
  connectTimeout?: number;
  /** 密钥前缀 */
  keyPrefix?: string;
}

/**
 * L1缓存条目
 */
export interface L1CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * 缓存服务接口
 */
export interface ICacheService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  get<T>(key: string, namespace?: CacheNamespace): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number, namespace?: CacheNamespace): Promise<void>;
  delete(key: string, namespace?: CacheNamespace): Promise<void>;
  has(key: string, namespace?: CacheNamespace): Promise<boolean>;
  getMany<T>(keys: string[], namespace?: CacheNamespace): Promise<Record<string, T | null>>;
  setMany<T>(data: Record<string, T>, ttl: number, namespace?: CacheNamespace): Promise<void>;
  deleteMany(keys: string[], namespace?: CacheNamespace): Promise<void>;
  clear(): Promise<void>;
  clearNamespace(namespace: CacheNamespace): Promise<void>;
}

/**
 * 缓存服务配置（运行时）
 */
export interface CacheServiceConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    connectionName?: string;
  };
  l1Cache: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
  };
  defaultTTL: number;
  connectTimeout: number;
  keyPrefix: string;
}
