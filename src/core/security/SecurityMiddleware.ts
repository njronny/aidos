/**
 * Security Middleware - 安全中间件
 * 提供安全头、CORS、Helmet等安全功能
 */

import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';

// 安全头配置接口
export interface SecurityHeadersConfig {
  /** 是否启用HSTS */
  hsts?: boolean;
  /** HSTS最大过期时间（秒） */
  hstsMaxAge?: number;
  /** 是否包含子域名 */
  hstsIncludeSubDomains?: boolean;
  /** 是否预加载 */
  hstsPreload?: boolean;
  /** 是否启用X-Frame-Options */
  xFrameOptions?: 'DENY' | 'SAMEORIGIN' | string;
  /** 是否启用X-Content-Type-Options */
  xContentTypeOptions?: boolean;
  /** 是否启用X-XSS-Protection */
  xXssProtection?: boolean;
  /** 是否启用Referrer-Policy */
  referrerPolicy?: string;
  /** 允许的内容安全策略 */
  contentSecurityPolicy?: string;
  /** Permissions Policy */
  permissionsPolicy?: string;
}

// CORS配置接口
export interface SecurityCorsConfig {
  /** 允许的源 */
  origin?: string | string[] | boolean;
  /** 允许的HTTP方法 */
  methods?: string[];
  /** 允许的请求头 */
  allowedHeaders?: string[];
  /** 允许暴露的响应头 */
  exposedHeaders?: string[];
  /** 是否允许携带凭证 */
  credentials?: boolean;
  /** 预检缓存时间 */
  maxAge?: number;
}

// 安全中间件配置
export interface SecurityMiddlewareConfig {
  /** 安全头配置 */
  headers?: SecurityHeadersConfig;
  /** CORS配置 */
  cors?: SecurityCorsConfig;
  /** 启用严格模式 */
  strictMode?: boolean;
  /** 跳过安全检查的路径 */
  skipPaths?: string[];
}

/**
 * 默认安全头配置
 */
const DEFAULT_SECURITY_HEADERS: SecurityHeadersConfig = {
  hsts: true,
  hstsMaxAge: 31536000, // 1年
  hstsIncludeSubDomains: true,
  hstsPreload: true,
  xFrameOptions: 'DENY',
  xContentTypeOptions: true,
  xXssProtection: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  contentSecurityPolicy: "default-src 'self'",
  permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
};

/**
 * 默认CORS配置
 */
const DEFAULT_CORS_CONFIG: SecurityCorsConfig = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  credentials: true,
  maxAge: 86400, // 24小时
};

/**
 * 安全中间件类
 */
export class SecurityMiddleware {
  private app: FastifyInstance;
  private config: SecurityMiddlewareConfig;

  constructor(app: FastifyInstance, config: SecurityMiddlewareConfig = {}) {
    this.app = app;
    this.config = {
      headers: { ...DEFAULT_SECURITY_HEADERS, ...config.headers },
      cors: { ...DEFAULT_CORS_CONFIG, ...config.cors },
      strictMode: config.strictMode ?? true,
      skipPaths: config.skipPaths || ['/health', '/api/auth/login'],
    };
  }

  /**
   * 初始化安全中间件
   */
  async init(): Promise<void> {
    await this.setupCors();
    this.setupSecurityHeaders();
    this.setupRequestValidation();
    this.setupIpFilter();
  }

  /**
   * 设置CORS
   */
  private async setupCors(): Promise<void> {
    await this.app.register(cors, {
      origin: this.config.cors?.origin,
      methods: this.config.cors?.methods,
      allowedHeaders: this.config.cors?.allowedHeaders,
      exposedHeaders: this.config.cors?.exposedHeaders,
      credentials: this.config.cors?.credentials,
      maxAge: this.config.cors?.maxAge,
    });
  }

  /**
   * 设置安全头
   */
  private setupSecurityHeaders(): void {
    this.app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
      // 跳过指定路径
      if (this.shouldSkipPath(request.url)) {
        return;
      }

      const headers = this.config.headers || {};

      // HSTS - HTTP Strict Transport Security
      if (headers.hsts) {
        let hstsValue = `max-age=${headers.hstsMaxAge || 31536000}`;
        if (headers.hstsIncludeSubDomains) {
          hstsValue += '; includeSubDomains';
        }
        if (headers.hstsPreload) {
          hstsValue += '; preload';
        }
        reply.header('Strict-Transport-Security', hstsValue);
      }

      // X-Frame-Options
      if (headers.xFrameOptions) {
        reply.header('X-Frame-Options', headers.xFrameOptions);
      }

      // X-Content-Type-Options
      if (headers.xContentTypeOptions) {
        reply.header('X-Content-Type-Options', 'nosniff');
      }

      // X-XSS-Protection
      if (headers.xXssProtection) {
        reply.header('X-XSS-Protection', '1; mode=block');
      }

      // Referrer-Policy
      if (headers.referrerPolicy) {
        reply.header('Referrer-Policy', headers.referrerPolicy);
      }

      // Content-Security-Policy
      if (headers.contentSecurityPolicy) {
        reply.header('Content-Security-Policy', headers.contentSecurityPolicy);
      }

      // Permissions-Policy
      if (headers.permissionsPolicy) {
        reply.header('Permissions-Policy', headers.permissionsPolicy);
      }

      // 移除敏感信息头
      reply.header('X-Powered-By', 'AIDOS');
      reply.header('Server', 'AIDOS-Secure');
    });
  }

  /**
   * 设置请求验证
   */
  private setupRequestValidation(): void {
    this.app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      if (this.shouldSkipPath(request.url)) {
        return;
      }

      // 检查请求体大小
      const contentLength = request.headers['content-length'];
      if (contentLength && parseInt(contentLength as string, 10) > 10 * 1024 * 1024) {
        // 10MB限制
        return reply.status(413).send({
          success: false,
          error: 'Payload Too Large',
        });
      }

      // 检查请求方法
      const allowedMethods = this.config.cors?.methods || ['GET', 'POST', 'PUT', 'DELETE'];
      if (request.method === 'OPTIONS') {
        // 预检请求由CORS处理
        return;
      }

      if (!allowedMethods.includes(request.method)) {
        return reply.status(405).send({
          success: false,
          error: 'Method Not Allowed',
        });
      }
    });
  }

  /**
   * 设置IP过滤
   */
  private setupIpFilter(): void {
    this.app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      if (this.shouldSkipPath(request.url)) {
        return;
      }

      // 获取真实IP（支持代理）
      const clientIp = this.getClientIp(request);
      
      // 检查是否为黑名单IP
      const ipBlacklist = this.getIpBlacklist();
      if (ipBlacklist.has(clientIp)) {
        return reply.status(403).send({
          success: false,
          error: 'Access Denied',
        });
      }
    });
  }

  /**
   * 获取客户端IP
   */
  private getClientIp(request: FastifyRequest): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || 'unknown';
  }

  /**
   * 获取IP黑名单
   */
  private getIpBlacklist(): Set<string> {
    const blacklistStr = process.env.IP_BLACKLIST || '';
    return new Set(blacklistStr.split(',').filter(Boolean));
  }

  /**
   * 检查是否应跳过路径
   */
  private shouldSkipPath(url: string): boolean {
    const skipPaths = this.config.skipPaths || [];
    return skipPaths.some(path => url.startsWith(path));
  }
}

/**
 * Fastify插件方式导出
 */
async function securityPlugin(
  fastify: FastifyInstance,
  options: SecurityMiddlewareConfig
): Promise<void> {
  const middleware = new SecurityMiddleware(fastify, options);
  await middleware.init();
}

export default fp(securityPlugin, {
  name: 'security-middleware',
  fastify: '4.x',
});

