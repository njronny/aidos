// ErrorClassifier - 分层异常分类 (L1-L4)
import { v4 as uuidv4 } from 'uuid';

/**
 * 错误级别定义
 * L1 - Operational: 可预知的操作错误，可自动修复
 * L2 - Recoverable: 临时性错误，可通过重试恢复
 * L3 - User Input: 用户输入错误，需要用户介入
 * L4 - Fatal: 致命错误，需要完全重启
 */
export enum ErrorLevel {
  L1_OPERATIONAL = 'L1_OPERATIONAL',
  L2_RECOVERABLE = 'L2_RECOVERABLE',
  L3_USER_INPUT = 'L3_USER_INPUT',
  L3_AUTH = 'L3_AUTH',
  L4_FATAL = 'L4_FATAL'
}

/**
 * 错误分类
 */
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  FILE_SYSTEM = 'FILE_SYSTEM',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  CONFIGURATION = 'CONFIGURATION',
  SYSTEM = 'SYSTEM',
  TIMEOUT = 'TIMEOUT',
  CUSTOM = 'CUSTOM',
  UNKNOWN = 'UNKNOWN'
}

/**
 * 错误分类结果
 */
export interface ErrorClassification {
  id: string;
  level: ErrorLevel;
  category: ErrorCategory;
  shouldRetry: boolean;
  maxRetries: number;
  originalError: Error;
  timestamp: Date;
  message: string;
}

/**
 * 自定义错误模式注册
 */
interface CustomErrorPattern {
  pattern: RegExp;
  level: ErrorLevel;
  category: ErrorCategory;
  shouldRetry: boolean;
  maxRetries: number;
}

/**
 * 错误分类器
 */
export class ErrorClassifier {
  private customPatterns: CustomErrorPattern[] = [];

  /**
   * 默认重试配置
   */
  private readonly defaultRetryConfig: Record<ErrorLevel, { shouldRetry: boolean; maxRetries: number }> = {
    [ErrorLevel.L1_OPERATIONAL]: { shouldRetry: true, maxRetries: 1 },
    [ErrorLevel.L2_RECOVERABLE]: { shouldRetry: true, maxRetries: 3 },
    [ErrorLevel.L3_USER_INPUT]: { shouldRetry: false, maxRetries: 0 },
    [ErrorLevel.L3_AUTH]: { shouldRetry: false, maxRetries: 0 },
    [ErrorLevel.L4_FATAL]: { shouldRetry: false, maxRetries: 0 }
  };

  /**
   * 错误模式匹配规则
   */
  private readonly errorPatterns: Array<{
    pattern: RegExp;
    level: ErrorLevel;
    category: ErrorCategory;
  }> = [
    // Network errors - L2
    { pattern: /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ENETUNREACH/i, level: ErrorLevel.L2_RECOVERABLE, category: ErrorCategory.NETWORK },
    { pattern: /ECONNRESET|EPIPE|ESHUTDOWN/i, level: ErrorLevel.L2_RECOVERABLE, category: ErrorCategory.NETWORK },
    
    // Timeout errors - L2
    { pattern: /ETIMEDOUT|TIMEOUT|timeout/i, level: ErrorLevel.L2_RECOVERABLE, category: ErrorCategory.TIMEOUT },
    
    // File system errors - L2 (usually temporary)
    { pattern: /ENOENT|ENOTDIR|EISDIR|EBUSY|EMFILE/i, level: ErrorLevel.L2_RECOVERABLE, category: ErrorCategory.FILE_SYSTEM },
    
    // Validation errors - L3
    { pattern: /validation|invalid|malformed|schema/i, level: ErrorLevel.L3_USER_INPUT, category: ErrorCategory.VALIDATION },
    
    // Authentication errors - L3
    { pattern: /401|403|unauthorized|forbidden|authentication|auth.*fail/i, level: ErrorLevel.L3_AUTH, category: ErrorCategory.AUTHENTICATION },
    
    // Configuration errors - L1
    { pattern: /config|configuration|not found|missing.*config/i, level: ErrorLevel.L1_OPERATIONAL, category: ErrorCategory.CONFIGURATION },
    
    // System errors - L4
    { pattern: /fatal|crash|segfault|SIGSEGV|SIGABRT|out of memory|ENOMEM/i, level: ErrorLevel.L4_FATAL, category: ErrorCategory.SYSTEM },
    
    // Rate limiting - L2
    { pattern: /429|rate.limit|too many requests/i, level: ErrorLevel.L2_RECOVERABLE, category: ErrorCategory.NETWORK }
  ];

  /**
   * 对错误进行分类
   */
  classify(error: Error): ErrorClassification {
    const message = error.message || error.toString();
    
    // 首先检查自定义模式
    for (const custom of this.customPatterns) {
      if (custom.pattern.test(message)) {
        return this.createClassification(error, custom.level, custom.category, custom.shouldRetry, custom.maxRetries);
      }
    }

    // 检查内置模式
    for (const rule of this.errorPatterns) {
      if (rule.pattern.test(message)) {
        const config = this.defaultRetryConfig[rule.level];
        return this.createClassification(error, rule.level, rule.category, config.shouldRetry, config.maxRetries);
      }
    }

    // 默认归类为L1操作错误
    return this.createClassification(error, ErrorLevel.L1_OPERATIONAL, ErrorCategory.UNKNOWN, true, 1);
  }

  /**
   * 注册自定义错误模式
   */
  registerPattern(pattern: CustomErrorPattern): void {
    this.customPatterns.push(pattern);
  }

  /**
   * 创建分类结果
   */
  private createClassification(
    error: Error,
    level: ErrorLevel,
    category: ErrorCategory,
    shouldRetry: boolean,
    maxRetries: number
  ): ErrorClassification {
    return {
      id: uuidv4(),
      level,
      category,
      shouldRetry,
      maxRetries,
      originalError: error,
      timestamp: new Date(),
      message: error.message
    };
  }
}

/**
 * 便捷函数：对错误进行分类
 */
export function classifyError(error: Error): ErrorClassification {
  const classifier = new ErrorClassifier();
  return classifier.classify(error);
}
