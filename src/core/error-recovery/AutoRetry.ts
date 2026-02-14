/**
 * AutoRetry - 自动重试机制
 * 
 * 支持指数退避、条件重试
 */

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  shouldRetry?: (error: Error) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  lastError?: Error;
}

export class AutoRetry {
  private defaultOptions: Required<RetryOptions> = {
    maxRetries: 3,
    delay: 1000,
    backoff: 'exponential',
    shouldRetry: () => true,
    onRetry: () => {},
  };

  /**
   * 执行带重试的操作
   */
  async execute<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<RetryResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error | undefined;
    let attempts = 0;

    for (let i = 0; i <= opts.maxRetries; i++) {
      attempts++;

      try {
        const data = await fn();
        
        return {
          success: true,
          data,
          attempts,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 检查是否应该重试
        if (i < opts.maxRetries && opts.shouldRetry(lastError)) {
          opts.onRetry(lastError, i + 1);
          
          // 计算延迟
          const delay = this.calculateDelay(i, opts.delay, opts.backoff);
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
      lastError,
    };
  }

  /**
   * 计算延迟
   */
  private calculateDelay(attempt: number, baseDelay: number, backoff: 'linear' | 'exponential'): number {
    if (backoff === 'exponential') {
      return baseDelay * Math.pow(2, attempt);
    }
    return baseDelay * (attempt + 1);
  }

  /**
   * 睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 同步版本重试
   */
  executeSync<T>(fn: () => T, options?: RetryOptions): RetryResult<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error | undefined;
    let attempts = 0;

    for (let i = 0; i <= opts.maxRetries; i++) {
      attempts++;

      try {
        const data = fn();
        
        return {
          success: true,
          data,
          attempts,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (i < opts.maxRetries && opts.shouldRetry(lastError)) {
          // 同步版本不支持延迟，直接继续
          continue;
        } else {
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
      lastError,
    };
  }
}

export default AutoRetry;
