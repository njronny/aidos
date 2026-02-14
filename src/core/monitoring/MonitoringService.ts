/**
 * MonitoringService - 生产环境监控服务
 * 运行时指标收集、错误追踪、告警
 */

import { EventEmitter } from 'events';
import * as os from 'os';

export interface Metric {
  name: string;
  value: number;
  unit?: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
  timestamp: Date;
  resolved?: boolean;
  resolvedAt?: Date;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  checks: {
    cpu: boolean;
    memory: boolean;
    disk: boolean;
    redis: boolean;
  };
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    tasks: {
      total: number;
      active: number;
      failed: number;
    };
  };
}

export class MonitoringService extends EventEmitter {
  private metrics: Map<string, Metric[]> = new Map();
  private alerts: Alert[] = [];
  private startTime: Date = new Date();
  private checkInterval: NodeJS.Timeout | null = null;
  
  // 告警阈值
  private thresholds = {
    cpu: 80,        // CPU 使用率 > 80%
    memory: 90,     // 内存使用率 > 90%
    disk: 85,       // 磁盘使用率 > 85%
    taskFailRate: 20, // 任务失败率 > 20%
  };

  constructor() {
    super();
  }

  /**
   * 启动监控
   */
  start(intervalMs: number = 30000): void {
    if (this.checkInterval) return;
    
    console.log('[Monitoring] Starting monitoring service...');
    this.startTime = new Date();
    
    // 立即收集一次
    this.collectMetrics();
    
    // 定时收集
    this.checkInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
    }, intervalMs);
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[Monitoring] Stopped');
    }
  }

  /**
   * 收集系统指标
   */
  collectMetrics(): void {
    const now = new Date();
    
    // CPU 负载
    const cpuLoad = os.loadavg()[0] / os.cpus().length * 100;
    this.recordMetric('system.cpu.load', cpuLoad, '%', { host: os.hostname() });
    
    // 内存使用
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = ((totalMem - freeMem) / totalMem) * 100;
    this.recordMetric('system.memory.used', usedMem, '%', { host: os.hostname() });
    
    // 进程内存
    const processMem = process.memoryUsage();
    this.recordMetric('process.memory.heapUsed', processMem.heapUsed / 1024 / 1024, 'MB');
    this.recordMetric('process.memory.heapTotal', processMem.heapTotal / 1024 / 1024, 'MB');
    this.recordMetric('process.memory.rss', processMem.rss / 1024 / 1024, 'MB');
    
    // 事件循环延迟 (近似)
    const memUsage = process.memoryUsage();
    this.recordMetric('process.uptime', process.uptime(), 's');
    
    // 告警检查
    if (cpuLoad > this.thresholds.cpu) {
      this.createAlert('warning', `CPU 使用率过高: ${cpuLoad.toFixed(1)}%`, 'system');
    }
    
    if (usedMem > this.thresholds.memory) {
      this.createAlert('error', `内存使用率过高: ${usedMem.toFixed(1)}%`, 'system');
    }
  }

  /**
   * 记录指标
   */
  recordMetric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    const metric: Metric = { name, value, unit, timestamp: new Date(), tags };
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metrics = this.metrics.get(name)!;
    metrics.push(metric);
    
    // 保留最近 1000 条
    if (metrics.length > 1000) {
      metrics.shift();
    }
    
    this.emit('metric', metric);
  }

  /**
   * 记录自定义指标
   */
  recordCustomMetric(name: string, value: number, unit?: string): void {
    this.recordMetric(name, value, unit);
  }

  /**
   * 检查告警
   */
  private checkAlerts(): void {
    const metrics = this.metrics;
    
    // 检查最近的 CPU
    const cpuMetric = metrics.get('system.cpu.load');
    if (cpuMetric && cpuMetric.length > 0) {
      const latest = cpuMetric[cpuMetric.length - 1];
      if (latest.value > this.thresholds.cpu) {
        // 避免重复告警
        const recentAlert = this.alerts.find(a => 
          !a.resolved && 
          a.source === 'system' && 
          a.level === 'warning' &&
          Date.now() - a.timestamp.getTime() < 300000 // 5分钟内不重复
        );
        if (!recentAlert) {
          this.createAlert('warning', `CPU 使用率持续过高: ${latest.value.toFixed(1)}%`, 'system');
        }
      }
    }
  }

  /**
   * 创建告警
   */
  createAlert(level: Alert['level'], message: string, source: string): Alert {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      message,
      source,
      timestamp: new Date(),
    };
    
    this.alerts.push(alert);
    this.emit('alert', alert);
    
    console.log(`[Monitoring] Alert: [${level.toUpperCase()}] ${message}`);
    
    return alert;
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.emit('alertResolved', alert);
      return true;
    }
    return false;
  }

  /**
   * 获取健康状态
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const cpuLoad = os.loadavg()[0] / os.cpus().length * 100;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsage = ((totalMem - freeMem) / totalMem) * 100;
    
    // 简单磁盘检查
    let diskUsage = 0;
    try {
      const { execSync } = require('child_process');
      const df = execSync('df -h / | tail -1').toString();
      const match = df.match(/(\d+)%/);
      if (match) diskUsage = parseInt(match[1]);
    } catch {
      diskUsage = 0;
    }
    
    const checks = {
      cpu: cpuLoad < this.thresholds.cpu,
      memory: memUsage < this.thresholds.memory,
      disk: diskUsage < this.thresholds.disk,
      redis: await this.checkRedis(),
    };
    
    const allHealthy = Object.values(checks).every(v => v);
    
    return {
      status: allHealthy ? 'healthy' : checks.cpu && checks.memory ? 'degraded' : 'unhealthy',
      uptime: Date.now() - this.startTime.getTime(),
      checks,
      metrics: {
        cpu: Math.round(cpuLoad * 100) / 100,
        memory: Math.round(memUsage * 100) / 100,
        disk: diskUsage,
        tasks: { total: 0, active: 0, failed: 0 }, // 可集成 TaskWorker 数据
      },
    };
  }

  /**
   * 检查 Redis 连接
   */
  private async checkRedis(): Promise<boolean> {
    try {
      const Redis = require('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        lazyConnect: true,
        connectTimeout: 5000,
      });
      
      await redis.ping();
      await redis.quit();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取指标历史
   */
  getMetrics(name?: string, limit: number = 100): Metric[] {
    if (name) {
      return this.metrics.get(name)?.slice(-limit) || [];
    }
    
    // 返回所有最近指标
    const all: Metric[] = [];
    this.metrics.forEach(m => {
      if (m.length > 0) {
        all.push(m[m.length - 1]);
      }
    });
    return all;
  }

  /**
   * 获取告警列表
   */
  getAlerts(resolved?: boolean, limit: number = 50): Alert[] {
    let filtered = this.alerts;
    
    if (resolved !== undefined) {
      filtered = filtered.filter(a => a.resolved === resolved);
    }
    
    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * 获取系统摘要
   */
  getSummary(): {
    uptime: number;
    alerts: { active: number; resolved: number };
    metrics: Record<string, number>;
  } {
    const activeAlerts = this.alerts.filter(a => !a.resolved);
    const resolvedAlerts = this.alerts.filter(a => a.resolved);
    
    const latestMetrics: Record<string, number> = {};
    this.metrics.forEach((values, name) => {
      if (values.length > 0) {
        latestMetrics[name] = values[values.length - 1].value;
      }
    });
    
    return {
      uptime: Date.now() - this.startTime.getTime(),
      alerts: {
        active: activeAlerts.length,
        resolved: resolvedAlerts.length,
      },
      metrics: latestMetrics,
    };
  }

  /**
   * 更新阈值
   */
  setThresholds(thresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
}

export const monitoringService = new MonitoringService();
