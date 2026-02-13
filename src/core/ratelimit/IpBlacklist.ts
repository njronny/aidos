/**
 * IP黑名单管理器
 * 提供IP黑名单管理、动态封禁和解封功能
 */

import Redis from 'ioredis';

// 黑名单条目接口
export interface BlacklistEntry {
  /** IP地址 */
  ip: string;
  /** 封禁原因 */
  reason: string;
  /** 封禁时间 */
  blockedAt: number;
  /** 过期时间（0表示永久） */
  expiresAt: number;
  /** 封禁类型 */
  type: 'manual' | 'automatic';
}

// IP信息接口
export interface IpInfo {
  /** IP地址 */
  ip: string;
  /** 国家/地区 */
  country?: string;
  /** 城市 */
  city?: string;
  /** ISP */
  isp?: string;
  /** 是否为代理/VPN */
  isProxy?: boolean;
  /** 风险评分 */
  riskScore?: number;
  /** 最后请求时间 */
  lastRequestAt?: number;
  /** 请求总数 */
  totalRequests?: number;
}

// 黑名单配置
export interface IpBlacklistConfig {
  /** Redis配置 */
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  /** 默认封禁时间（秒），0表示永久 */
  defaultBanDuration: number;
  /** 自动封禁阈值 */
  autoBanThreshold: number;
  /** 自动封禁时间（秒） */
  autoBanDuration: number;
  /** 是否启用自动封禁 */
  enableAutoBan: boolean;
  /** 最大黑名单条目数 */
  maxEntries: number;
}

/**
 * IP黑名单管理器
 */
export class IpBlacklistManager {
  private redis?: Redis;
  private config: IpBlacklistConfig;
  private memoryBlacklist: Map<string, BlacklistEntry> = new Map();
  private ipStats: Map<string, { failedAttempts: number; lastAttempt: number }> = new Map();

  constructor(config: Partial<IpBlacklistConfig> = {}) {
    this.config = {
      redis: config.redis,
      defaultBanDuration: config.defaultBanDuration || 3600, // 1小时
      autoBanThreshold: config.autoBanThreshold || 10, // 10次失败
      autoBanDuration: config.autoBanDuration || 1800, // 30分钟
      enableAutoBan: config.enableAutoBan ?? true,
      maxEntries: config.maxEntries || 10000,
    };

    // 初始化Redis连接
    if (this.config.redis) {
      this.redis = new Redis({
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
        db: this.config.redis.db || 0,
        lazyConnect: true,
      });
    }
  }

  /**
   * 初始化
   */
  async init(): Promise<void> {
    if (this.redis) {
      await this.redis.connect();
    }
    // 启动定期清理过期条目
    this.startCleanupInterval();
  }

  /**
   * 检查IP是否在黑名单中
   */
  async isBlocked(ip: string): Promise<boolean> {
    // 先检查内存黑名单
    const memoryEntry = this.memoryBlacklist.get(ip);
    if (memoryEntry) {
      if (memoryEntry.expiresAt === 0 || memoryEntry.expiresAt > Date.now()) {
        return true;
      } else {
        // 已过期，移除
        this.memoryBlacklist.delete(ip);
      }
    }

    // 检查Redis黑名单
    if (this.redis) {
      const key = `ip_blacklist:${ip}`;
      const exists = await this.redis.exists(key);
      if (exists) {
        const data = await this.redis.get(key);
        if (data) {
          const entry = JSON.parse(data) as BlacklistEntry;
          if (entry.expiresAt === 0 || entry.expiresAt > Date.now()) {
            // 同步到内存
            this.memoryBlacklist.set(ip, entry);
            return true;
          } else {
            // 已过期，删除
            await this.redis.del(key);
          }
        }
      }
    }

    return false;
  }

  /**
   * 将IP加入黑名单
   */
  async blockIp(ip: string, reason: string, durationSeconds: number = 0, type: 'manual' | 'automatic' = 'manual'): Promise<void> {
    const entry: BlacklistEntry = {
      ip,
      reason,
      blockedAt: Date.now(),
      expiresAt: durationSeconds === 0 ? 0 : Date.now() + durationSeconds * 1000,
      type,
    };

    // 保存到内存
    this.memoryBlacklist.set(ip, entry);

    // 保存到Redis
    if (this.redis) {
      const key = `ip_blacklist:${ip}`;
      const ttl = durationSeconds === 0 ? 0 : durationSeconds;
      if (ttl > 0) {
        await this.redis.set(key, JSON.stringify(entry), 'EX', ttl);
      } else {
        await this.redis.set(key, JSON.stringify(entry));
      }
    }
  }

  /**
   * 将IP移出黑名单
   */
  async unblockIp(ip: string): Promise<void> {
    // 从内存移除
    this.memoryBlacklist.delete(ip);

    // 从Redis移除
    if (this.redis) {
      await this.redis.del(`ip_blacklist:${ip}`);
    }
  }

  /**
   * 获取黑名单列表
   */
  async getBlacklist(): Promise<BlacklistEntry[]> {
    const entries: BlacklistEntry[] = [...this.memoryBlacklist.values()];

    if (this.redis) {
      const keys = await this.redis.keys('ip_blacklist:*');
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const entry = JSON.parse(data) as BlacklistEntry;
          // 过滤未过期的
          if (entry.expiresAt === 0 || entry.expiresAt > Date.now()) {
            const ip = entry.ip;
            if (!this.memoryBlacklist.has(ip)) {
              entries.push(entry);
            }
          }
        }
      }
    }

    return entries;
  }

  /**
   * 记录失败尝试（用于自动封禁）
   */
  async recordFailedAttempt(ip: string): Promise<boolean> {
    if (!this.config.enableAutoBan) {
      return false;
    }

    const stats = this.ipStats.get(ip) || { failedAttempts: 0, lastAttempt: 0 };
    stats.failedAttempts++;
    stats.lastAttempt = Date.now();
    this.ipStats.set(ip, stats);

    // 检查是否达到封禁阈值
    if (stats.failedAttempts >= this.config.autoBanThreshold) {
      await this.blockIp(
        ip,
        `自动封禁：${stats.failedAttempts}次失败尝试`,
        this.config.autoBanDuration,
        'automatic'
      );
      // 重置计数器
      this.ipStats.delete(ip);
      return true;
    }

    return false;
  }

  /**
   * 清除失败尝试记录
   */
  clearFailedAttempts(ip: string): void {
    this.ipStats.delete(ip);
  }

  /**
   * 获取IP统计
   */
  getIpStats(ip: string): { failedAttempts: number; lastAttempt: number } | undefined {
    return this.ipStats.get(ip);
  }

  /**
   * 批量封禁IP
   */
  async blockIps(ips: string[], reason: string, durationSeconds: number = 0): Promise<void> {
    for (const ip of ips) {
      await this.blockIp(ip, reason, durationSeconds, 'manual');
    }
  }

  /**
   * 批量解封IP
   */
  async unblockIps(ips: string[]): Promise<void> {
    for (const ip of ips) {
      await this.unblockIp(ip);
    }
  }

  /**
   * 获取黑名单数量
   */
  async getBlacklistCount(): Promise<number> {
    return this.memoryBlacklist.size;
  }

  /**
   * 清理过期条目
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();

    // 清理内存黑名单
    for (const [ip, entry] of this.memoryBlacklist.entries()) {
      if (entry.expiresAt > 0 && entry.expiresAt < now) {
        this.memoryBlacklist.delete(ip);
      }
    }

    // 清理Redis黑名单
    if (this.redis) {
      const keys = await this.redis.keys('ip_blacklist:*');
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const entry = JSON.parse(data) as BlacklistEntry;
          if (entry.expiresAt > 0 && entry.expiresAt < now) {
            await this.redis.del(key);
          }
        }
      }
    }

    // 清理旧的失败尝试记录
    const oldThreshold = Date.now() - 24 * 60 * 60 * 1000; // 24小时
    for (const [ip, stats] of this.ipStats.entries()) {
      if (stats.lastAttempt < oldThreshold) {
        this.ipStats.delete(ip);
      }
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanupInterval(): void {
    setInterval(() => this.cleanup(), 60 * 60 * 1000); // 每小时清理一次
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// 导出单例
export const ipBlacklist = new IpBlacklistManager({
  defaultBanDuration: parseInt(process.env.IP_BAN_DURATION || '3600', 10),
  autoBanThreshold: parseInt(process.env.IP_AUTO_BAN_THRESHOLD || '10', 10),
  autoBanDuration: parseInt(process.env.IP_AUTO_BAN_DURATION || '1800', 10),
  enableAutoBan: process.env.IP_AUTO_BAN_ENABLED !== 'false',
});
