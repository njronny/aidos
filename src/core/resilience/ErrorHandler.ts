// ErrorHandler - 分层错误处理
import { EventEmitter } from 'events';
import { ErrorClassifier, ErrorLevel, ErrorCategory, ErrorClassification, classifyError } from './ErrorClassifier';
import { RetryPolicy, RetryConfig } from './RetryPolicy';

export { ErrorLevel, ErrorCategory, ErrorClassification } from './ErrorClassifier';
export { RetryPolicy, RetryConfig } from './RetryPolicy';

/**
 * 处理动作
 */
export type RecoveryAction = 'auto_fix' | 'retry' | 'notify_user' | 'shutdown' | 'ignore';

/**
 * 错误处理器配置
 */
export interface ErrorHandlerConfig {
  maxRetries?: number;
  enableRetry?: boolean;
  notifier?: {
    notify: (message: string, level: ErrorLevel) => Promise<void>;
  };
  onError?: (error: Error, classification: ErrorClassification) => void;
  onRecovery?: (error: Error, result: any) => void;
}

/**
 * 处理动作
 */
// export type RecoveryAction = 'auto_fix' | 'retry' | 'notify_user' | 'shutdown' | 'ignore';

/**
 * 错误处理结果
 */
export interface ErrorHandleResult {
  handled: boolean;
  action: RecoveryAction;
  level: ErrorLevel;
  classification?: ErrorClassification;
  recoveryResult?: any;
  error?: Error;
}

/**
 * 错误历史记录
 */
export interface ErrorHistoryEntry {
  id: string;
  timestamp: Date;
  error: Error;
  classification: ErrorClassification;
  action: RecoveryAction;
  recovered: boolean;
}

/**
 * 错误统计
 */
export interface ErrorStats {
  totalErrors: number;
  errorsByLevel: Record<ErrorLevel, number>;
  errorsByCategory: Record<ErrorCategory, number>;
  lastError?: Error;
  lastErrorTime?: Date;
}

/**
 * 恢复函数类型
 */
type RecoveryFunction = (error: Error, classification: ErrorClassification) => Promise<any>;

/**
 * 分层错误处理器
 */
export class ErrorHandler extends EventEmitter {
  private readonly config: Required<ErrorHandlerConfig>;
  private readonly classifier: ErrorClassifier;
  private readonly retryPolicies: Map<ErrorLevel, RetryPolicy>;
  private history: ErrorHistoryEntry[] = [];
  private recoveryFunctions: Map<ErrorLevel, RecoveryFunction> = new Map();

  constructor(config: ErrorHandlerConfig = {}) {
    super();
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      enableRetry: config.enableRetry ?? true,
      notifier: config.notifier ?? { notify: async () => {} },
      onError: config.onError ?? (() => {}),
      onRecovery: config.onRecovery ?? (() => {})
    };
    this.classifier = new ErrorClassifier();
    this.retryPolicies = new Map();
    this.initializeRetryPolicies();
  }

  /**
   * 初始化各错误级别的重试策略
   */
  private initializeRetryPolicies(): void {
    const retryableLevels = [ErrorLevel.L1_OPERATIONAL, ErrorLevel.L2_RECOVERABLE];
    
    for (const level of retryableLevels) {
      const retryConfig: RetryConfig = {
        maxRetries: this.config.maxRetries,
        baseDelay: 100,
        maxDelay: 5000,
        multiplier: 2,
        jitter: true,
        retryableErrors: [level]
      };
      this.retryPolicies.set(level, new RetryPolicy(retryConfig));
    }
  }

  /**
   * 处理错误
   */
  async handle(error: Error): Promise<ErrorHandleResult> {
    // 分类错误
    const classification = this.classifier.classify(error);
    
    // 触发错误事件
    this.emit('error', error, classification);
    this.config.onError(error, classification);

    // 确定处理动作
    const action = this.determineAction(classification);

    let recoveryResult: any;
    let recovered = false;

    try {
      // 执行恢复动作
      recoveryResult = await this.executeAction(error, classification, action);
      recovered = true;
    } catch (recoveryError) {
      recoveryResult = { error: recoveryError };
      recovered = false;
    }

    // 记录到历史
    this.recordHistory(error, classification, action, recovered);

    // 根据错误级别处理
    const result: ErrorHandleResult = {
      handled: true,
      action,
      level: classification.level,
      classification,
      recoveryResult
    };

    return result;
  }

  /**
   * 确定处理动作
   */
  private determineAction(classification: ErrorClassification): RecoveryAction {
    switch (classification.level) {
      case ErrorLevel.L1_OPERATIONAL:
        return 'auto_fix';
      case ErrorLevel.L2_RECOVERABLE:
        return this.config.enableRetry ? 'retry' : 'notify_user';
      case ErrorLevel.L3_USER_INPUT:
        return 'notify_user';
      case ErrorLevel.L4_FATAL:
        return 'shutdown';
      default:
        return 'notify_user';
    }
  }

  /**
   * 执行恢复动作
   */
  private async executeAction(
    error: Error,
    classification: ErrorClassification,
    action: RecoveryAction
  ): Promise<any> {
    switch (action) {
      case 'auto_fix':
        return await this.handleOperationalError(error, classification);
      
      case 'retry':
        return await this.handleRecoverableError(error, classification);
      
      case 'notify_user':
        return await this.handleUserError(error, classification);
      
      case 'shutdown':
        return await this.handleFatalError(error, classification);
      
      default:
        return { handled: false };
    }
  }

  /**
   * 处理L1操作错误 - 自动修复
   */
  private async handleOperationalError(error: Error, classification: ErrorClassification): Promise<any> {
    // 检查是否有注册的自定义恢复函数
    const customRecovery = this.recoveryFunctions.get(ErrorLevel.L1_OPERATIONAL);
    if (customRecovery) {
      const result = await customRecovery(error, classification);
      this.config.onRecovery(error, result);
      return result;
    }
    
    // 默认自动修复逻辑
    return { action: 'auto_fix', attempted: true, success: true };
  }

  /**
   * 处理L2可恢复错误 - 重试
   */
  private async handleRecoverableError(error: Error, classification: ErrorClassification): Promise<any> {
    const policy = this.retryPolicies.get(ErrorLevel.L2_RECOVERABLE);
    if (!policy) {
      return { retryAttempted: false, reason: 'No retry policy' };
    }

    const retryFn = async () => {
      // 触发重试事件，让调用者决定如何处理
      this.emit('retry', { error, classification });
      throw error; // Re-throw to trigger retry
    };

    try {
      await policy.execute(retryFn);
      return { recovered: true, attempts: policy.getAttemptCount() };
    } catch (e) {
      // 重试耗尽，通知用户
      await this.config.notifier.notify(
        `重试失败: ${error.message}`,
        classification.level
      );
      return { recovered: false, attempts: policy.getAttemptCount() };
    }
  }

  /**
   * 处理L3用户输入错误 - 通知用户
   */
  private async handleUserError(error: Error, classification: ErrorClassification): Promise<any> {
    await this.config.notifier.notify(
      `用户输入错误: ${error.message}`,
      classification.level
    );
    
    this.emit('user_error', error, classification);
    
    return { notified: true, requiresInput: true };
  }

  /**
   * 处理L4致命错误 - 关闭系统
   */
  private async handleFatalError(error: Error, classification: ErrorClassification): Promise<any> {
    await this.config.notifier.notify(
      `致命错误: ${error.message} - 系统将关闭`,
      classification.level
    );
    
    this.emit('fatal', error, classification);
    
    return { systemShutdown: true };
  }

  /**
   * 注册自定义恢复函数
   */
  registerRecovery(level: ErrorLevel, fn: RecoveryFunction): void {
    this.recoveryFunctions.set(level, fn);
  }

  /**
   * 记录错误历史
   */
  private recordHistory(
    error: Error,
    classification: ErrorClassification,
    action: RecoveryAction,
    recovered: boolean
  ): void {
    this.history.push({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      error,
      classification,
      action,
      recovered
    });

    // 限制历史记录大小
    if (this.history.length > 1000) {
      this.history = this.history.slice(-500);
    }
  }

  /**
   * 获取错误历史
   */
  getHistory(): ErrorHistoryEntry[] {
    return [...this.history];
  }

  /**
   * 获取错误统计
   */
  getStats(): ErrorStats {
    const stats: ErrorStats = {
      totalErrors: this.history.length,
      errorsByLevel: {
        [ErrorLevel.L1_OPERATIONAL]: 0,
        [ErrorLevel.L2_RECOVERABLE]: 0,
        [ErrorLevel.L3_USER_INPUT]: 0,
        [ErrorLevel.L3_AUTH]: 0,
        [ErrorLevel.L4_FATAL]: 0
      },
      errorsByCategory: {
        [ErrorCategory.NETWORK]: 0,
        [ErrorCategory.FILE_SYSTEM]: 0,
        [ErrorCategory.VALIDATION]: 0,
        [ErrorCategory.AUTHENTICATION]: 0,
        [ErrorCategory.CONFIGURATION]: 0,
        [ErrorCategory.SYSTEM]: 0,
        [ErrorCategory.TIMEOUT]: 0,
        [ErrorCategory.CUSTOM]: 0,
        [ErrorCategory.UNKNOWN]: 0
      }
    };

    for (const entry of this.history) {
      stats.errorsByLevel[entry.classification.level]++;
      stats.errorsByCategory[entry.classification.category]++;
      
      if (!stats.lastErrorTime || entry.timestamp > stats.lastErrorTime) {
        stats.lastError = entry.error;
        stats.lastErrorTime = entry.timestamp;
      }
    }

    return stats;
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.history = [];
  }
}
