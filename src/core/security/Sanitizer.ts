/**
 * Sanitizer - 输入净化器
 * 提供XSS防护和其他输入净化功能
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// HTML实体映射（不包含斜杠以保持HTML可读性）
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#96;',
  '=': '&#x3D;',
};

// 需要净化的字段配置
export interface SanitizeField {
  /** 字段名（支持嵌套路径，如 user.profile.name） */
  field: string;
  /** 净化类型 */
  type: 'html' | 'sql' | 'command' | 'all';
}

// 净化配置
export interface SanitizerConfig {
  /** 要净化的字段 */
  fields?: SanitizeField[];
  /** 是否启用全局净化 */
  sanitizeAll?: boolean;
  /** 跳过净化的路径 */
  skipPaths?: string[];
  /** 自定义净化函数 */
  customSanitizers?: Record<string, (value: any) => any>;
}

/**
 * 输入净化器类
 */
export class Sanitizer {
  private config: SanitizerConfig;

  constructor(config: SanitizerConfig = {}) {
    this.config = {
      fields: config.fields || [],
      sanitizeAll: config.sanitizeAll ?? false,
      skipPaths: config.skipPaths || ['/health'],
      customSanitizers: config.customSanitizers || {},
    };
  }

  /**
   * 净化数据
   */
  sanitize(data: any, type: 'html' | 'sql' | 'command' | 'all' = 'html'): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.sanitizeString(data, type);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item, type));
    }

    if (typeof data === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.sanitize(value, type);
      }
      return result;
    }

    return data;
  }

  /**
   * 净化字符串
   */
  sanitizeString(input: string, type: 'html' | 'sql' | 'command' | 'all'): string {
    let result = input;

    if (type === 'html' || type === 'all') {
      result = this.escapeHtml(result);
    }

    if (type === 'sql' || type === 'all') {
      result = this.escapeSql(result);
    }

    if (type === 'command' || type === 'all') {
      result = this.escapeCommand(result);
    }

    return result;
  }

  /**
   * HTML转义
   */
  escapeHtml(input: string): string {
    return input.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char] || char);
  }

  /**
   * SQL转义（基础防护）
   */
  escapeSql(input: string): string {
    // 注意：这是基础防护，推荐使用参数化查询
    return input
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\x1a/g, '\\Z');
  }

  /**
   * 命令注入防护
   */
  escapeCommand(input: string): string {
    // 移除危险的shell元字符
    return input
      .replace(/[;&|`$(){}<>\[\]!#*?~]/g, '')
      .replace(/\\+/g, '\\\\')
      .replace(/'/g, "'\\''")
      .replace(/"/g, '\\"');
  }

  /**
   * 移除HTML标签
   */
  stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  }

  /**
   * 移除JavaScript事件处理器
   */
  removeEventHandlers(input: string): string {
    // 移除on开头的属性（包括带引号和不带引号的）
    return input
      .replace(/\s+on\w+\s*=\s*(["'])[^"']*\1/gi, '')
      .replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');
  }

  /**
   * 移除javascript:协议
   */
  removeJavascriptProtocol(input: string): string {
    return input.replace(/javascript:/gi, '');
  }

  /**
   * 移除data:协议（防止base64 XSS）
   */
  removeDataProtocol(input: string): string {
    return input.replace(/data:/gi, '');
  }

  /**
   * 净化URL
   */
  sanitizeUrl(input: string): string {
    try {
      const url = new URL(input);
      // 只允许http/https协议
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }
      // 移除javascript:和data:协议
      if (url.protocol === 'javascript:' || url.protocol === 'data:') {
        return '';
      }
      return input;
    } catch {
      // 如果不是有效URL，进行基础净化
      return this.escapeHtml(input);
    }
  }

  /**
   * 根据字段配置净化数据
   */
  sanitizeByFields(data: Record<string, any>): Record<string, any> {
    if (!this.config.fields || this.config.fields.length === 0) {
      return data;
    }

    const result = { ...data };

    for (const fieldConfig of this.config.fields) {
      const value = this.getNestedValue(result, fieldConfig.field);
      if (value !== undefined) {
        const sanitized = this.sanitize(value, fieldConfig.type);
        this.setNestedValue(result, fieldConfig.field, sanitized);
      }
    }

    return result;
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    if (lastKey) {
      target[lastKey] = value;
    }
  }

  /**
   * 净化请求体
   */
  sanitizeRequest(request: FastifyRequest): void {
    if (this.config.skipPaths?.includes(request.url)) {
      return;
    }

    if (request.body && typeof request.body === 'object') {
      const body = request.body as Record<string, any>;
      
      if (this.config.sanitizeAll) {
        // 全局净化
        const sanitized = this.sanitize(body, 'all');
        Object.assign(request.body, sanitized);
      } else if (this.config.fields && this.config.fields.length > 0) {
        // 按字段净化
        const sanitized = this.sanitizeByFields(body);
        Object.assign(request.body, sanitized);
      }

      // 应用自定义净化器
      if (this.config.customSanitizers) {
        for (const [name, sanitizer] of Object.entries(this.config.customSanitizers)) {
          const fieldConfig = this.config.fields?.find(f => f.field === name);
          if (fieldConfig) {
            const value = this.getNestedValue(request.body, name);
            if (value !== undefined) {
              const sanitized = sanitizer(value);
              this.setNestedValue(request.body, name, sanitized);
            }
          }
        }
      }
    }

    // 净化查询参数
    if (request.query && typeof request.query === 'object') {
      const sanitized = this.sanitize(request.query, 'html');
      Object.assign(request.query, sanitized);
    }
  }

  /**
   * 创建净化中间件
   */
  createMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      this.sanitizeRequest(request);
    };
  }
}

/**
 * 默认净化配置
 */
export const defaultSanitizerConfig: SanitizerConfig = {
  sanitizeAll: false,
  skipPaths: ['/health', '/api/auth/login'],
  fields: [
    { field: 'name', type: 'html' },
    { field: 'title', type: 'html' },
    { field: 'description', type: 'html' },
    { field: 'content', type: 'html' },
    { field: 'username', type: 'html' },
    { field: 'email', type: 'html' },
  ],
};

/**
 * 创建净化器的辅助函数
 */
export function createSanitizer(config?: SanitizerConfig) {
  return new Sanitizer(config || defaultSanitizerConfig);
}

export default fp(async function (fastify, options) {
  const sanitizer = new Sanitizer(options);
  fastify.addHook('preHandler', sanitizer.createMiddleware());
}, {
  name: 'sanitizer',
  fastify: '4.x',
});
