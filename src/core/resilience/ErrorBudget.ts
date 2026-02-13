// ErrorBudget - 错误率监控与告警
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * 告警级别
 */
export enum AlertLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * 错误预算配置
 */
export interface ErrorBudgetConfig {
  /** 时间窗口（毫秒） */
  timeWindowMs: number;
  /** 错误阈值，超过此值触发ERROR告警 */
  errorThreshold: number;
  /** 警告阈值，超过此值触发WARNING告警 */
  warningThreshold: number;
  /** 关键阈值倍数，超过 errorThreshold * criticalMultiplier 触发CRITICAL告警 */
  criticalMultiplier?: number;
  /** 告警回调 */
  alertCallback?: (level: AlertLevel, message: string, details: any) => void;
}

/**
 * 告警记录
 */
export interface AlertRecord {
  id: string;
  timestamp: Date;
  level: AlertLevel;
  message: string;
  errorCount: number;
  errorRate: number;
  details?: any;
}

/**
 * 错误预算统计
 */
export interface ErrorBudgetStats {
  totalErrors: number;
  totalSuccess: number;
  currentErrorRate: number;
  errorPercentage: number;
  lastAlert?: AlertRecord;
  alertsTriggered: number;
}

/**
 * 错误预算 - 监控错误率并在超过阈值时告警
 */
export class ErrorBudget extends EventEmitter {
  public readonly config: Required<ErrorBudgetConfig>;
  private errors: number[] = []; // 存储错误时间戳
  private successes: number[] = [];
  private alerts: AlertRecord[] = [];
  private lastAlertTime?: Date;
  private alertCooldown: number = 30000; // 30秒告警冷却
  private isRunning: boolean = false;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: ErrorBudgetConfig) {
    super();
    this.config = {
      timeWindowMs: config.timeWindowMs,
      errorThreshold: config.errorThreshold,
      warningThreshold: config.warningThreshold,
      criticalMultiplier: config.criticalMultiplier ?? 2,
      alertCallback: config.alertCallback ?? (() => {})
    };
  }

  /**
   * 启动预算监控
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // 启动清理定时器
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredErrors();
    }, this.config.timeWindowMs);
    
    this.emit('started');
  }

  /**
   * 停止预算监控
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    this.emit('stopped');
  }

  /**
   * 记录错误
   */
  recordError(details?: any): void {
    const now = Date.now();
    this.errors.push(now);
    
    // 检查是否需要触发告警
    this.checkThresholds(details);
    
    this.emit('error_recorded', { totalErrors: this.getStats().totalErrors });
  }

  /**
   * 记录成功操作
   */
  recordSuccess(): void {
    this.successes.push(Date.now());
    this.emit('success_recorded');
  }

  /**
   * 获取当前错误率（在时间窗口内的错误数）
   */
  getErrorRate(): number {
    this.cleanupExpiredErrors();
    return this.errors.length;
  }

  /**
   * 获取错误百分比
   */
  getErrorPercentage(): number {
    const total = this.errors.length + this.successes.length;
    if (total === 0) return 0;
    
    return (this.errors.length / total) * 100;
  }

  /**
   * 获取统计数据
   */
  getStats(): ErrorBudgetStats {
    this.cleanupExpiredErrors();
    
    return {
      totalErrors: this.errors.length,
      totalSuccess: this.successes.length,
      currentErrorRate: this.errors.length,
      errorPercentage: this.getErrorPercentage(),
      lastAlert: this.alerts[this.alerts.length - 1],
      alertsTriggered: this.alerts.length
    };
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(): AlertRecord[] {
    return [...this.alerts];
  }

  /**
   * 重置预算
   */
  reset(): void {
    this.errors = [];
    this.successes = [];
    this.alerts = [];
    this.lastAlertTime = undefined;
    
    this.emit('reset');
  }

  /**
   * 检查阈值并触发告警
   */
  private checkThresholds(details?: any): void {
    const errorCount = this.errors.length;
    const errorRate = this.getErrorRate();
    
    // 检查是否在冷却期内
    if (this.lastAlertTime && 
        Date.now() - this.lastAlertTime.getTime() < this.alertCooldown) {
      return;
    }

    let alertLevel: AlertLevel | null = null;
    let message: string = '';

    // 检查关键阈值
    const criticalThreshold = this.config.errorThreshold * this.config.criticalMultiplier;
    if (errorRate >= criticalThreshold) {
      alertLevel = AlertLevel.CRITICAL;
      message = `Critical: Error rate (${errorRate}) exceeds critical threshold (${criticalThreshold})`;
    }
    // 检查错误阈值
    else if (errorRate >= this.config.errorThreshold) {
      alertLevel = AlertLevel.ERROR;
      message = `Error: Error rate (${errorRate}) exceeds threshold (${this.config.errorThreshold})`;
    }
    // 检查警告阈值
    else if (errorRate >= this.config.warningThreshold) {
      alertLevel = AlertLevel.WARNING;
      message = `Warning: Error rate (${errorRate}) exceeds warning threshold (${this.config.warningThreshold})`;
    }

    if (alertLevel) {
      this.triggerAlert(alertLevel, message, {
        errorCount,
        errorRate,
        warningThreshold: this.config.warningThreshold,
        errorThreshold: this.config.errorThreshold,
        criticalThreshold,
        ...details
      });
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(level: AlertLevel, message: string, details: any): void {
    const alert: AlertRecord = {
      id: uuidv4(),
      timestamp: new Date(),
      level,
      message,
      errorCount: details.errorCount,
      errorRate: details.errorRate,
      details
    };

    this.alerts.push(alert);
    this.lastAlertTime = new Date();
    
    // 限制告警历史大小
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-50);
    }

    // 触发回调和事件
    this.config.alertCallback(level, message, details);
    this.emit('alert', alert);
    
    // 根据告警级别触发不同事件
    switch (level) {
      case AlertLevel.CRITICAL:
        this.emit('critical', alert);
        break;
      case AlertLevel.ERROR:
        this.emit('error', alert);
        break;
      case AlertLevel.WARNING:
        this.emit('warning', alert);
        break;
      default:
        this.emit('info', alert);
    }
  }

  /**
   * 清理过期的错误记录
   */
  private cleanupExpiredErrors(): void {
    const cutoff = Date.now() - this.config.timeWindowMs;
    
    this.errors = this.errors.filter(timestamp => timestamp > cutoff);
    this.successes = this.successes.filter(timestamp => timestamp > cutoff);
  }

  /**
   * 获取预算是否健康（是否在阈值内）
   */
  isHealthy(): boolean {
    const rate = this.getErrorRate();
    return rate < this.config.warningThreshold;
  }

  /**
   * 获取剩余预算（距离下次告警还能容忍的错误数）
   */
  getRemainingBudget(): number {
    const rate = this.getErrorRate();
    return Math.max(0, this.config.warningThreshold - rate);
  }
}
