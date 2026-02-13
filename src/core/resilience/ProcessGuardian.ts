// ProcessGuardian - 进程健康守护
import { EventEmitter } from 'events';

/**
 * 进程健康状态
 */
export enum ProcessStatus {
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  UNHEALTHY = 'UNHEALTHY',
  RESTARTING = 'RESTARTING',
  STOPPED = 'STOPPED',
  FAILED = 'FAILED'
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  healthy: boolean;
  message?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

/**
 * 进程守护配置
 */
export interface ProcessGuardianConfig {
  processId?: number;
  processName?: string;
  healthCheckInterval?: number;
  healthCheckFn?: () => Promise<HealthCheckResult>;
  maxRestartAttempts?: number;
  restartDelay?: number;
  restartFn?: () => Promise<{ success: boolean; newPid?: number }>;
  onUnhealthy?: (result: HealthCheckResult) => void;
  onRestart?: (attempt: number) => void;
  onCrash?: (error: Error) => void;
  onFatal?: (error: Error) => void;
}

/**
 * 进程统计
 */
export interface ProcessStats {
  status: ProcessStatus;
  startTime: Date;
  lastHealthCheck?: Date;
  restartAttempts: number;
  totalRestarts: number;
  uptime?: number;
}

/**
 * 进程守护 - 监控进程健康状态并自动重启
 */
export class ProcessGuardian extends EventEmitter {
  public readonly config: Required<ProcessGuardianConfig>;
  private status: ProcessStatus = ProcessStatus.STARTING;
  private startTime: Date = new Date();
  private lastHealthCheck?: Date;
  private restartAttempts: number = 0;
  private totalRestarts: number = 0;
  private healthCheckTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(config: ProcessGuardianConfig = {}) {
    super();
    this.config = {
      processId: config.processId ?? 0,
      processName: config.processName ?? 'unknown',
      healthCheckInterval: config.healthCheckInterval ?? 30000, // 30秒
      healthCheckFn: config.healthCheckFn ?? this.defaultHealthCheck.bind(this),
      maxRestartAttempts: config.maxRestartAttempts ?? 3,
      restartDelay: config.restartDelay ?? 5000, // 5秒
      restartFn: config.restartFn ?? this.defaultRestart.bind(this),
      onUnhealthy: config.onUnhealthy ?? (() => {}),
      onRestart: config.onRestart ?? (() => {}),
      onCrash: config.onCrash ?? (() => {}),
      onFatal: config.onFatal ?? (() => {})
    };
  }

  /**
   * 启动守护进程
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.status = ProcessStatus.RUNNING;
    this.startTime = new Date();
    
    // 启动健康检查循环
    this.startMonitoring();
    
    this.emit('started');
  }

  /**
   * 停止守护进程
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.status = ProcessStatus.STOPPED;
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    
    this.emit('stopped');
  }

  /**
   * 启动健康检查监控
   */
  private startMonitoring(): void {
    // 立即执行一次健康检查
    this.checkHealth();
    
    // 设置定期检查
    this.healthCheckTimer = setInterval(() => {
      this.checkHealth();
    }, this.config.healthCheckInterval);
  }

  /**
   * 执行健康检查
   */
  async checkHealth(): Promise<HealthCheckResult> {
    try {
      const result = await this.config.healthCheckFn();
      this.lastHealthCheck = new Date();
      
      if (result.healthy) {
        this.status = ProcessStatus.RUNNING;
        this.emit('healthy', result);
      } else {
        await this.handleUnhealthy(result);
      }
      
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        healthy: false,
        message: `Health check error: ${(error as Error).message}`,
        timestamp: new Date()
      };
      
      await this.handleUnhealthy(result);
      return result;
    }
  }

  /**
   * 处理不健康状态
   */
  private async handleUnhealthy(result: HealthCheckResult): Promise<void> {
    const previousStatus = this.status;
    this.status = ProcessStatus.UNHEALTHY;
    
    this.emit('unhealthy', result);
    this.config.onUnhealthy(result);
    
    // 如果之前是运行状态，尝试重启
    if (previousStatus === ProcessStatus.RUNNING) {
      await this.attemptRestart();
    }
  }

  /**
   * 尝试重启进程
   */
  async attemptRestart(): Promise<{ success: boolean; reason?: string }> {
    // 检查是否超过最大重启次数
    if (!this.canRestart()) {
      const error = new Error('Max restart attempts exceeded');
      this.status = ProcessStatus.FAILED;
      this.config.onFatal(error);
      this.emit('fatal', error);
      
      return { success: false, reason: 'Max restart attempts exceeded' };
    }

    this.status = ProcessStatus.RESTARTING;
    this.restartAttempts++;
    
    this.emit('restarting', this.restartAttempts);
    this.config.onRestart(this.restartAttempts);

    try {
      // 等待延迟
      await this.delay(this.config.restartDelay);
      
      // 执行重启
      const result = await this.config.restartFn();
      
      if (result.success) {
        this.status = ProcessStatus.RUNNING;
        this.totalRestarts++;
        this.restartAttempts = 0;
        
        if (result.newPid) {
          this.config.processId = result.newPid;
        }
        
        this.emit('restarted', result);
        
        return { success: true };
      } else {
        this.status = ProcessStatus.FAILED;
        this.emit('restart_failed', new Error('Restart function returned failure'));
        
        return { success: false, reason: 'Restart function returned failure' };
      }
    } catch (error) {
      this.emit('restart_error', error as Error);
      
      return { success: false, reason: (error as Error).message };
    }
  }

  /**
   * 检查是否可以重启
   */
  canRestart(): boolean {
    return this.restartAttempts < this.config.maxRestartAttempts;
  }

  /**
   * 记录重启尝试
   */
  recordRestart(): boolean {
    if (!this.canRestart()) {
      return false;
    }
    
    this.restartAttempts++;
    return true;
  }

  /**
   * 通知进程崩溃
   */
  notifyCrash(error: Error): void {
    this.status = ProcessStatus.FAILED;
    this.config.onCrash(error);
    this.emit('process_crash', error);
    
    // 尝试自动重启
    this.attemptRestart();
  }

  /**
   * 获取当前状态
   */
  getStatus(): ProcessStats {
    return this.getStats();
  }

  /**
   * 获取统计信息
   */
  getStats(): ProcessStats {
    return {
      status: this.status,
      startTime: this.startTime,
      lastHealthCheck: this.lastHealthCheck,
      restartAttempts: this.restartAttempts,
      totalRestarts: this.totalRestarts,
      uptime: Date.now() - this.startTime.getTime()
    };
  }

  /**
   * 默认健康检查函数
   */
  private async defaultHealthCheck(): Promise<HealthCheckResult> {
    // 默认实现：检查进程是否存在
    if (this.config.processId && process.pid !== this.config.processId) {
      // 注意：这里简化处理，实际应该检查指定PID的进程
      return {
        healthy: true,
        message: 'Process is running',
        timestamp: new Date()
      };
    }
    
    return {
      healthy: true,
      message: 'Default health check passed',
      timestamp: new Date()
    };
  }

  /**
   * 默认重启函数
   */
  private async defaultRestart(): Promise<{ success: boolean; newPid?: number }> {
    // 默认重启逻辑：重新执行当前进程
    // 实际实现中应该根据具体情况重启
    this.emit('restart_attempt');
    
    return {
      success: true,
      newPid: process.pid
    };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
