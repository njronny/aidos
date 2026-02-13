// RetryPolicy - 重试策略 (指数退避)
import { EventEmitter } from 'events';
import { ErrorLevel } from './ErrorClassifier';

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  multiplier: number;
  jitter?: boolean;
  retryableErrors?: ErrorLevel[];
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

/**
 * 最小重试配置（用于ExponentialBackoff）
 */
export interface BackoffConfig {
  baseDelay: number;
  maxDelay: number;
  multiplier: number;
  jitter?: boolean;
}

/**
 * 重试事件
 */
export interface RetryEvent {
  attempt: number;
  error: Error;
  delay: number;
  maxRetries: number;
}

/**
 * 重试结果
 */
export interface RetryResult {
  shouldRetry: boolean;
  delay?: number;
  reason?: string;
}

/**
 * 指数退避计算器
 */
export class ExponentialBackoff {
  private readonly config: Required<BackoffConfig>;

  constructor(config: BackoffConfig) {
    this.config = {
      baseDelay: config.baseDelay,
      maxDelay: config.maxDelay,
      multiplier: config.multiplier,
      jitter: config.jitter ?? false
    };
  }

  /**
   * 计算重试延迟
   */
  calculateDelay(attempt: number): number {
    // 指数退避: baseDelay * (multiplier ^ attempt)
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.multiplier, attempt);
    
    // 限制最大延迟
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);
    
    // 添加抖动
    if (this.config.jitter) {
      const jitterFactor = 0.5 + Math.random(); // 0.5 to 1.5
      return Math.floor(cappedDelay * jitterFactor);
    }
    
    return cappedDelay;
  }
}

/**
 * 重试策略
 */
export class RetryPolicy extends EventEmitter {
  public readonly config: Required<RetryConfig>;
  private attemptCount: number = 0;
  private backoff: ExponentialBackoff;

  constructor(config: RetryConfig) {
    super();
    this.config = {
      maxRetries: config.maxRetries,
      baseDelay: config.baseDelay,
      maxDelay: config.maxDelay,
      multiplier: config.multiplier,
      jitter: config.jitter ?? false,
      retryableErrors: config.retryableErrors ?? [ErrorLevel.L2_RECOVERABLE],
      onRetry: config.onRetry ?? (() => {})
    };
    this.backoff = new ExponentialBackoff(this.config);
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(error: Error, classification: { level: ErrorLevel }, attempt: number): RetryResult {
    // 检查是否超过最大重试次数
    if (attempt >= this.config.maxRetries) {
      return {
        shouldRetry: false,
        reason: `Max retries (${this.config.maxRetries}) exceeded`
      };
    }

    // 检查错误是否可重试
    const level = classification.level;
    if (!this.config.retryableErrors.includes(level)) {
      return {
        shouldRetry: false,
        reason: `Error level ${level} is not retryable`
      };
    }

    // 计算延迟
    const delay = this.backoff.calculateDelay(attempt);

    return {
      shouldRetry: true,
      delay
    };
  }

  /**
   * 获取重试延迟
   */
  getDelay(attempt: number): number {
    return this.backoff.calculateDelay(attempt);
  }

  /**
   * 记录重试尝试
   */
  recordAttempt(): void {
    this.attemptCount++;
  }

  /**
   * 获取尝试次数
   */
  getAttemptCount(): number {
    return this.attemptCount;
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.attemptCount = 0;
  }

  /**
   * 执行带重试的函数
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.reset();
    let lastError: Error;

    while (true) {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        lastError = error as Error;
        
        const classification = { level: ErrorLevel.L2_RECOVERABLE }; // Default
        const result = this.shouldRetry(lastError, classification, this.attemptCount);
        
        if (!result.shouldRetry) {
          this.emit('failure', { error: lastError, attempts: this.attemptCount });
          throw lastError;
        }

        this.recordAttempt();
        
        const retryEvent: RetryEvent = {
          attempt: this.attemptCount,
          error: lastError,
          delay: result.delay!,
          maxRetries: this.config.maxRetries
        };

        this.emit('retry', retryEvent);
        
        if (this.config.onRetry) {
          this.config.onRetry(this.attemptCount, lastError, result.delay!);
        }

        // 等待后重试
        await this.sleep(result.delay!);
      }
    }
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
