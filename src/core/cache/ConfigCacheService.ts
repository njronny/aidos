/**
 * 项目配置缓存服务
 */
import { CacheService, CacheNamespace } from './types';

export interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  settings: Record<string, unknown>;
  agents?: string[];
  skills?: string[];
  metadata?: Record<string, unknown>;
  updatedAt: string;
}

export class ConfigCacheService {
  private cache: CacheService;
  private static instance: ConfigCacheService | null = null;

  private constructor(cache: CacheService) {
    this.cache = cache;
  }

  static initialize(cache: CacheService): ConfigCacheService {
    ConfigCacheService.instance = new ConfigCacheService(cache);
    return ConfigCacheService.instance;
  }

  static getInstance(): ConfigCacheService {
    if (!ConfigCacheService.instance) {
      throw new Error('ConfigCacheService not initialized. Call initialize() first.');
    }
    return ConfigCacheService.instance;
  }

  /**
   * 缓存项目配置
   */
  async cacheProjectConfig(config: ProjectConfig, ttl: number = 600): Promise<void> { // 默认10分钟
    const key = `project:${config.id}`;
    await this.cache.set(key, config, ttl, CacheNamespace.CONFIG);
  }

  /**
   * 获取项目配置
   */
  async getProjectConfig(projectId: string): Promise<ProjectConfig | null> {
    const key = `project:${projectId}`;
    return await this.cache.get<ProjectConfig>(key, CacheNamespace.CONFIG);
  }

  /**
   * 批量获取项目配置
   */
  async getProjectConfigs(projectIds: string[]): Promise<Record<string, ProjectConfig | null>> {
    const keys = projectIds.map(id => `project:${id}`);
    return await this.cache.getMany<ProjectConfig>(keys, CacheNamespace.CONFIG);
  }

  /**
   * 更新项目配置
   */
  async updateProjectConfig(projectId: string, updates: Partial<ProjectConfig>): Promise<void> {
    const config = await this.getProjectConfig(projectId);
    if (config) {
      const updated = { ...config, ...updates, updatedAt: new Date().toISOString() };
      await this.cacheProjectConfig(updated);
    }
  }

  /**
   * 删除项目配置缓存
   */
  async deleteProjectConfig(projectId: string): Promise<void> {
    const key = `project:${projectId}`;
    await this.cache.delete(key, CacheNamespace.CONFIG);
  }

  /**
   * 清空所有项目配置缓存
   */
  async clearAll(): Promise<void> {
    await this.cache.clearNamespace(CacheNamespace.CONFIG);
  }

  /**
   * 缓存全局配置
   */
  async cacheGlobalConfig(key: string, value: unknown, ttl: number = 3600): Promise<void> { // 默认1小时
    await this.cache.set(`global:${key}`, value, ttl, CacheNamespace.CONFIG);
  }

  /**
   * 获取全局配置
   */
  async getGlobalConfig<T>(key: string): Promise<T | null> {
    return await this.cache.get<T>(`global:${key}`, CacheNamespace.CONFIG);
  }

  /**
   * 删除全局配置
   */
  async deleteGlobalConfig(key: string): Promise<void> {
    await this.cache.delete(`global:${key}`, CacheNamespace.CONFIG);
  }
}
