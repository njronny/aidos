/**
 * Agent状态缓存服务
 */
import { CacheService, CacheNamespace } from './types';

export enum AgentStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  OFFLINE = 'offline',
  ERROR = 'error',
}

export interface AgentCacheData {
  id: string;
  type: string;
  status: AgentStatus;
  currentTaskId?: string;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
  lastActiveAt: string;
  updatedAt: string;
}

export class AgentCacheService {
  private cache: CacheService;
  private static instance: AgentCacheService | null = null;

  private constructor(cache: CacheService) {
    this.cache = cache;
  }

  static initialize(cache: CacheService): AgentCacheService {
    AgentCacheService.instance = new AgentCacheService(cache);
    return AgentCacheService.instance;
  }

  static getInstance(): AgentCacheService {
    if (!AgentCacheService.instance) {
      throw new Error('AgentCacheService not initialized. Call initialize() first.');
    }
    return AgentCacheService.instance;
  }

  /**
   * 缓存Agent状态
   */
  async cacheAgent(agent: AgentCacheData, ttl: number = 300): Promise<void> {
    const key = `agent:${agent.id}`;
    await this.cache.set(key, agent, ttl, CacheNamespace.AGENT);
  }

  /**
   * 获取Agent缓存
   */
  async getAgent(agentId: string): Promise<AgentCacheData | null> {
    const key = `agent:${agentId}`;
    return await this.cache.get<AgentCacheData>(key, CacheNamespace.AGENT);
  }

  /**
   * 批量获取Agent状态
   */
  async getAgents(agentIds: string[]): Promise<Record<string, AgentCacheData | null>> {
    const keys = agentIds.map(id => `agent:${id}`);
    return await this.cache.getMany<AgentCacheData>(keys, CacheNamespace.AGENT);
  }

  /**
   * 更新Agent状态
   */
  async updateAgentStatus(agentId: string, status: AgentStatus, taskId?: string): Promise<void> {
    const agent = await this.getAgent(agentId);
    if (agent) {
      agent.status = status;
      agent.currentTaskId = taskId;
      agent.updatedAt = new Date().toISOString();
      await this.cacheAgent(agent);
    }
  }

  /**
   * 删除Agent缓存
   */
  async deleteAgent(agentId: string): Promise<void> {
    const key = `agent:${agentId}`;
    await this.cache.delete(key, CacheNamespace.AGENT);
  }

  /**
   * 清空所有Agent缓存
   */
  async clearAll(): Promise<void> {
    await this.cache.clearNamespace(CacheNamespace.AGENT);
  }
}
