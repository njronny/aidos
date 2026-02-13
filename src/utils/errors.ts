/**
 * Aidos 错误处理工具
 * 定义基础错误类和自定义错误类型
 */

/**
 * 基础应用错误类
 */
export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly timestamp: Date;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date();
    this.details = details;
    
    // 保持错误栈追踪
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * 通用错误类 - 用于非特定场景
 */
export class GeneralError extends AppError {
  constructor(message: string, statusCode: number = 500, details?: unknown) {
    super(message, 'GENERAL_ERROR', statusCode, details);
  }
}

/**
 * 配置相关错误
 */
export class ConfigError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIG_ERROR', 500, details);
  }
}

/**
 * 技能加载错误
 */
export class SkillLoadError extends AppError {
  public readonly skillId?: string;

  constructor(message: string, skillId?: string, details?: unknown) {
    super(message, 'SKILL_LOAD_ERROR', 500, details);
    this.skillId = skillId;
  }
}

/**
 * JSON解析错误
 */
export class JSONParseError extends AppError {
  public readonly rawContent: string;
  public readonly position?: number;

  constructor(message: string, rawContent: string, position?: number, details?: unknown) {
    super(message, 'JSON_PARSE_ERROR', 400, details);
    this.rawContent = rawContent.substring(0, 200); // 限制长度
    this.position = position;
  }
}

/**
 * 安全验证错误
 */
export class SecurityError extends AppError {
  public readonly blockedOperation?: string;

  constructor(message: string, blockedOperation?: string, details?: unknown) {
    super(message, 'SECURITY_ERROR', 403, details);
    this.blockedOperation = blockedOperation;
  }
}

/**
 * 网络请求错误
 */
export class NetworkError extends AppError {
  public readonly url?: string;

  constructor(message: string, url?: string, statusCode: number = 500, details?: unknown) {
    super(message, 'NETWORK_ERROR', statusCode, details);
    this.url = url;
  }
}

/**
 * 超时错误
 */
export class TimeoutError extends AppError {
  public readonly timeout: number;
  public readonly operation?: string;

  constructor(message: string, timeout: number, operation?: string, details?: unknown) {
    super(message, 'TIMEOUT_ERROR', 408, details);
    this.timeout = timeout;
    this.operation = operation;
  }
}

/**
 * 文件系统错误
 */
export class FileSystemError extends AppError {
  public readonly path?: string;
  public readonly operation?: string;

  constructor(message: string, path?: string, operation?: string, details?: unknown) {
    super(message, 'FILE_SYSTEM_ERROR', 500, details);
    this.path = path;
    this.operation = operation;
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.field = field;
  }
}

/**
 * 工具函数：安全地解析JSON
 * @param content JSON字符串
 * @param fallback 返回失败时的默认值
 * @returns 解析后的对象或fallback
 */
export function safeJSONParse<T = unknown>(
  content: string,
  fallback?: T
): { success: true; data: T } | { success: false; error: JSONParseError } {
  try {
    const data = JSON.parse(content);
    return { success: true, data };
  } catch (e) {
    const error = e as SyntaxError;
    const message = error.message || 'Invalid JSON';
    
    // 尝试提取错误位置
    let position: number | undefined;
    const posMatch = message.match(/position (\d+)/);
    if (posMatch) {
      position = parseInt(posMatch[1], 10);
    }

    const jsonError = new JSONParseError(
      `JSON解析失败: ${message}`,
      content,
      position,
      { originalError: error.message }
    );

    if (fallback !== undefined) {
      return { success: false, error: jsonError };
    }
    throw jsonError;
  }
}

/**
 * 工具函数：创建错误处理器
 */
export function createErrorHandler(
  defaultMessage: string = 'An error occurred'
) {
  return (error: unknown): AppError => {
    if (error instanceof AppError) {
      return error;
    }
    
    if (error instanceof SyntaxError) {
      return new JSONParseError(
        error.message,
        '',
        undefined,
        { originalError: error.message }
      );
    }
    
    if (error instanceof Error) {
      return new GeneralError(
        error.message || defaultMessage,
        500,
        { originalError: error.message }
      );
    }
    
    return new GeneralError(
      defaultMessage,
      500,
      { error }
    );
  };
}
