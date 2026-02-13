/**
 * InfrastructureMonitor - 基础设施监控
 * 监控CPU、内存、磁盘等系统资源
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import * as fs from 'fs';

/**
 * 基础设施监控配置
 */
export interface InfrastructureMonitorConfig {
  /** 是否启用系统指标采集 */
  enableSystemMetrics?: boolean;
  /** 采集间隔（毫秒） */
  collectionIntervalMs?: number;
  /** CPU使用率告警阈值（%） */
  cpuThreshold?: number;
  /** 内存使用率告警阈值（%） */
  memoryThreshold?: number;
  /** 磁盘使用率告警阈值（%） */
  diskThreshold?: number;
}

/**
 * CPU指标
 */
export interface CpuMetrics {
  usagePercent: number;
  loadAverage: number[];
  cores: number;
}

/**
 * 内存指标
 */
export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  usagePercent: number;
}

/**
 * 磁盘指标
 */
export interface DiskMetrics {
  total: number;
  used: number;
  free: number;
  usagePercent: number;
  mountPoint: string;
}

/**
 * 系统指标
 */
export interface SystemMetrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  timestamp: number;
}

/**
 * 阈值违规
 */
export interface ThresholdViolation {
  metric: 'cpu' | 'memory' | 'disk';
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<InfrastructureMonitorConfig> = {
  enableSystemMetrics: true,
  collectionIntervalMs: 10000,
  cpuThreshold: 80,
  memoryThreshold: 85,
  diskThreshold: 90,
};

/**
 * InfrastructureMonitor - 基础设施监控
 * 负责采集和监控CPU、内存、磁盘等基础设施指标
 */
export class InfrastructureMonitor extends EventEmitter {
  private config: Required<InfrastructureMonitorConfig>;
  private currentMetrics: SystemMetrics | null = null;
  private metricsHistory: SystemMetrics[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private readonly maxHistorySize = 100;

  // CPU监控相关
  private lastCpuInfo: { idle: number; total: number } | null = null;

  constructor(config: InfrastructureMonitorConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 采集系统指标
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const cpu = await this.getCpuMetrics();
    const memory = this.getMemoryMetrics();
    const disk = await this.getDiskMetrics();

    const metrics: SystemMetrics = {
      cpu,
      memory,
      disk,
      timestamp: Date.now(),
    };

    this.currentMetrics = metrics;
    this.addToHistory(metrics);
    this.emit('metrics', metrics);

    // 检查阈值
    const violations = this.checkThresholds(metrics);
    for (const violation of violations) {
      this.emit('threshold', violation);
    }

    return metrics;
  }

  /**
   * 获取CPU指标
   */
  private async getCpuMetrics(): Promise<CpuMetrics> {
    const cpus = os.cpus();
    const cores = cpus.length;

    // 计算CPU使用率
    let idle = 0;
    let total = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += (cpu.times as any)[type];
      }
      idle += cpu.times.idle;
    }

    let usagePercent = 0;
    if (this.lastCpuInfo) {
      const idleDiff = idle - this.lastCpuInfo.idle;
      const totalDiff = total - this.lastCpuInfo.total;
      usagePercent = totalDiff > 0 ? (1 - idleDiff / totalDiff) * 100 : 0;
    }

    this.lastCpuInfo = { idle, total };

    return {
      usagePercent: Math.round(usagePercent * 100) / 100,
      loadAverage: os.loadavg(),
      cores,
    };
  }

  /**
   * 获取内存指标
   */
  private getMemoryMetrics(): MemoryMetrics {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usagePercent = (used / total) * 100;

    return {
      total,
      used,
      free,
      usagePercent: Math.round(usagePercent * 100) / 100,
    };
  }

  /**
   * 获取磁盘指标
   */
  private async getDiskMetrics(): Promise<DiskMetrics> {
    // 使用df命令获取磁盘信息
    try {
      const result = await this.execCommand('df -k / | tail -1');
      const parts = result.trim().split(/\s+/);
      
      if (parts.length >= 4) {
        const total = parseInt(parts[1]) * 1024; // KB to bytes
        const used = parseInt(parts[2]) * 1024;
        const free = parseInt(parts[3]) * 1024;
        const usagePercent = total > 0 ? (used / total) * 100 : 0;

        return {
          total,
          used,
          free,
          usagePercent: Math.round(usagePercent * 100) / 100,
          mountPoint: parts[5] || '/',
        };
      }
    } catch (error) {
      console.error('Failed to get disk metrics:', error);
    }

    // 返回默认值
    return {
      total: 0,
      used: 0,
      free: 0,
      usagePercent: 0,
      mountPoint: '/',
    };
  }

  /**
   * 执行系统命令
   */
  private execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      exec(command, (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * 检查阈值
   */
  checkThresholds(metrics: SystemMetrics): ThresholdViolation[] {
    const violations: ThresholdViolation[] = [];

    // CPU阈值检查
    if (metrics.cpu.usagePercent > this.config.cpuThreshold) {
      const severity = metrics.cpu.usagePercent > 90 ? 'critical' : 'warning';
      violations.push({
        metric: 'cpu',
        value: metrics.cpu.usagePercent,
        threshold: this.config.cpuThreshold,
        severity,
      });
    }

    // 内存阈值检查
    if (metrics.memory.usagePercent > this.config.memoryThreshold) {
      const severity = metrics.memory.usagePercent > 95 ? 'critical' : 'warning';
      violations.push({
        metric: 'memory',
        value: metrics.memory.usagePercent,
        threshold: this.config.memoryThreshold,
        severity,
      });
    }

    // 磁盘阈值检查
    if (metrics.disk.usagePercent > this.config.diskThreshold) {
      const severity = metrics.disk.usagePercent > 95 ? 'critical' : 'warning';
      violations.push({
        metric: 'disk',
        value: metrics.disk.usagePercent,
        threshold: this.config.diskThreshold,
        severity,
      });
    }

    return violations;
  }

  /**
   * 启动监控
   */
  start(): void {
    if (this.intervalId) {
      return;
    }

    // 立即采集一次
    this.collectSystemMetrics();

    // 启动定时采集
    this.intervalId = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.collectionIntervalMs);

    this.emit('started');
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.emit('stopped');
  }

  /**
   * 获取当前指标
   */
  getMetrics(): SystemMetrics | null {
    return this.currentMetrics;
  }

  /**
   * 获取历史指标
   */
  getHistory(): SystemMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(metrics: SystemMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  /**
   * 获取配置
   */
  getConfig(): Required<InfrastructureMonitorConfig> {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<InfrastructureMonitorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default InfrastructureMonitor;
