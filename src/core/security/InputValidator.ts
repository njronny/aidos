/**
 * Input Validator - 输入验证器
 * 提供请求输入验证功能
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// 验证规则接口
export interface ValidationRule {
  /** 字段名 */
  field: string;
  /** 验证类型 */
  type: 'string' | 'number' | 'boolean' | 'email' | 'uuid' | 'url' | 'date' | 'array' | 'object' | 'enum';
  /** 是否必填 */
  required?: boolean;
  /** 最小值/最小长度 */
  min?: number;
  /** 最大值/最大长度 */
  max?: number;
  /** 正则表达式 */
  pattern?: RegExp;
  /** 枚举值 */
  enumValues?: any[];
  /** 自定义验证函数 */
  custom?: (value: any) => boolean | string;
  /** 错误消息 */
  message?: string;
}

// 验证模式接口
export interface ValidationSchema {
  /** 验证规则 */
  rules: ValidationRule[];
  /** 是否验证全部字段 */
  validateAll?: boolean;
  /** 自定义错误处理器 */
  onError?: (errors: ValidationError[]) => void;
}

// 验证错误接口
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * 输入验证器类
 */
export class InputValidator {
  private schema: ValidationSchema;

  constructor(schema: ValidationSchema) {
    this.schema = schema;
  }

  /**
   * 验证数据
   */
  validate(data: Record<string, any>): ValidationError[] {
    const errors: ValidationError[] = [];
    const { rules, validateAll = false } = this.schema;

    for (const rule of rules) {
      const value = data[rule.field];
      const error = this.validateField(rule, value);

      if (error) {
        errors.push(error);
        if (!validateAll) {
          break;
        }
      }
    }

    return errors;
  }

  /**
   * 验证单个字段
   */
  private validateField(rule: ValidationRule, value: any): ValidationError | null {
    // 检查必填
    if (rule.required && (value === undefined || value === null || value === '')) {
      return {
        field: rule.field,
        message: rule.message || `${rule.field} is required`,
        value,
      };
    }

    // 如果值为空且不是必填，则跳过验证
    if (value === undefined || value === null || value === '') {
      return null;
    }

    // 类型验证
    const typeError = this.validateType(rule, value);
    if (typeError) {
      return typeError;
    }

    // 范围验证
    const rangeError = this.validateRange(rule, value);
    if (rangeError) {
      return rangeError;
    }

    // 正则验证
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        return {
          field: rule.field,
          message: rule.message || `${rule.field} format is invalid`,
          value,
        };
      }
    }

    // 枚举验证
    if (rule.enumValues) {
      if (!rule.enumValues.includes(value)) {
        return {
          field: rule.field,
          message: rule.message || `${rule.field} must be one of: ${rule.enumValues.join(', ')}`,
          value,
        };
      }
    }

    // 自定义验证
    if (rule.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        return {
          field: rule.field,
          message: typeof result === 'string' ? result : (rule.message || `${rule.field} is invalid`),
          value,
        };
      }
    }

    return null;
  }

  /**
   * 验证类型
   */
  private validateType(rule: ValidationRule, value: any): ValidationError | null {
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be a string`,
            value,
          };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be a number`,
            value,
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be a boolean`,
            value,
          };
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be a valid email`,
            value,
          };
        }
        break;

      case 'uuid':
        if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be a valid UUID`,
            value,
          };
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be a valid URL`,
            value,
          };
        }
        break;

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be a valid date`,
            value,
          };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be an array`,
            value,
          };
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} must be an object`,
            value,
          };
        }
        break;
    }

    return null;
  }

  /**
   * 验证范围
   */
  private validateRange(rule: ValidationRule, value: any): ValidationError | null {
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.min !== undefined && value.length < rule.min) {
        return {
          field: rule.field,
          message: rule.message || `${rule.field} must be at least ${rule.min} characters`,
          value,
        };
      }
      if (rule.max !== undefined && value.length > rule.max) {
        return {
          field: rule.field,
          message: rule.message || `${rule.field} must be at most ${rule.max} characters`,
          value,
        };
      }
    }

    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return {
          field: rule.field,
          message: rule.message || `${rule.field} must be at least ${rule.min}`,
          value,
        };
      }
      if (rule.max !== undefined && value > rule.max) {
        return {
          field: rule.field,
          message: rule.message || `${rule.field} must be at most ${rule.max}`,
          value,
        };
      }
    }

    if (rule.type === 'array' && Array.isArray(value)) {
      if (rule.min !== undefined && value.length < rule.min) {
        return {
          field: rule.field,
          message: rule.message || `${rule.field} must have at least ${rule.min} items`,
          value,
        };
      }
      if (rule.max !== undefined && value.length > rule.max) {
        return {
          field: rule.field,
          message: rule.message || `${rule.field} must have at most ${rule.max} items`,
          value,
        };
      }
    }

    return null;
  }

  /**
   * 验证请求
   */
  validateRequest(request: FastifyRequest): ValidationError[] {
    const body = request.body as Record<string, any> || {};
    return this.validate(body);
  }

  /**
   * 创建验证中间件
   */
  createMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const errors = this.validateRequest(request);
      
      if (errors.length > 0) {
        if (this.schema.onError) {
          this.schema.onError(errors);
        }
        reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: errors,
        });
      }
    };
  }
}

/**
 * 常用验证模式工厂
 */
export const ValidationPatterns = {
  /** 用户名验证 */
  username: {
    type: 'string' as const,
    required: true,
    min: 3,
    max: 30,
    pattern: /^[a-zA-Z0-9_-]+$/,
  },

  /** 密码验证 */
  password: {
    type: 'string' as const,
    required: true,
    min: 6,
    max: 100,
  },

  /** 邮箱验证 */
  email: {
    type: 'email' as const,
    required: true,
  },

  /** UUID验证 */
  uuid: {
    type: 'uuid' as const,
    required: true,
  },

  /** 分页参数 */
  pagination: {
    page: {
      type: 'number' as const,
      required: false,
      min: 1,
      max: 1000,
    },
    limit: {
      type: 'number' as const,
      required: false,
      min: 1,
      max: 100,
    },
  },
};

/**
 * 创建验证中间件的辅助函数
 */
export function createValidator(schema: ValidationSchema) {
  const validator = new InputValidator(schema);
  return validator.createMiddleware();
}
