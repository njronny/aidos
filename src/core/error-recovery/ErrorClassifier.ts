/**
 * ErrorClassifier - 错误分类器
 * 
 * 分析错误类型和严重程度
 */

export enum ErrorType {
  SYNTAX = 'SYNTAX',           // 语法错误
  TYPE = 'TYPE',               // 类型错误
  REFERENCE = 'REFERENCE',     // 引用错误
  NETWORK = 'NETWORK',        // 网络错误
  TIMEOUT = 'TIMEOUT',         // 超时错误
  GIT = 'GIT',                // Git 错误
  TEST = 'TEST',              // 测试失败
  BUILD = 'BUILD',            // 构建错误
  RUNTIME = 'RUNTIME',        // 运行时错误
  UNKNOWN = 'UNKNOWN',        // 未知错误
}

export interface ClassifiedError {
  original: string;
  type: ErrorType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: Record<string, any>;
}

export class ErrorClassifier {
  private patterns: Map<ErrorType, RegExp[]> = new Map();

  constructor() {
    this.initPatterns();
  }

  /**
   * 初始化错误模式
   */
  private initPatterns(): void {
    this.patterns.set(ErrorType.SYNTAX, [
      /SyntaxError/i,
      /unexpected token/i,
      /unexpected string/i,
      /parse error/i,
    ]);

    this.patterns.set(ErrorType.TYPE, [
      /TypeError/i,
      /is not a function/i,
      /cannot read.*undefined/i,
      /cannot set property/i,
    ]);

    this.patterns.set(ErrorType.REFERENCE, [
      /ReferenceError/i,
      /is not defined/i,
      /is not found/i,
    ]);

    this.patterns.set(ErrorType.NETWORK, [
      /ECONNREFUSED/i,
      /ENOTFOUND/i,
      /ETIMEDOUT/i,
      /socket hang up/i,
      /fetch failed/i,
    ]);

    this.patterns.set(ErrorType.TIMEOUT, [
      /timeout/i,
      /timed out/i,
      /exceeded/i,
    ]);

    this.patterns.set(ErrorType.GIT, [
      /error:.*git/i,
      /failed to push/i,
      /failed to pull/i,
      /conflict/i,
      /merge failed/i,
    ]);

    this.patterns.set(ErrorType.TEST, [
      /FAIL.*test/i,
      /AssertionError/i,
      /expect.*toBe/i,
      /Test failed/i,
    ]);

    this.patterns.set(ErrorType.BUILD, [
      /build failed/i,
      /compilation error/i,
      /webpack error/i,
      /esbuild error/i,
    ]);

    this.patterns.set(ErrorType.RUNTIME, [
      /RuntimeError/i,
      /throw new/i,
      /uncaught/i,
    ]);
  }

  /**
   * 分类错误
   */
  classify(error: string): ClassifiedError {
    const type = this.detectType(error);
    const severity = this.assignSeverity(type);
    const message = this.extractMessage(error);

    return {
      original: error,
      type,
      severity,
      message,
    };
  }

  /**
   * 检测错误类型
   */
  private detectType(error: string): ErrorType {
    for (const [type, patterns] of this.patterns) {
      for (const pattern of patterns) {
        if (pattern.test(error)) {
          return type;
        }
      }
    }
    return ErrorType.UNKNOWN;
  }

  /**
   * 分配严重程度
   */
  private assignSeverity(type: ErrorType): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<ErrorType, 'low' | 'medium' | 'high' | 'critical'> = {
      [ErrorType.SYNTAX]: 'high',
      [ErrorType.TYPE]: 'high',
      [ErrorType.REFERENCE]: 'high',
      [ErrorType.NETWORK]: 'medium',
      [ErrorType.TIMEOUT]: 'medium',
      [ErrorType.GIT]: 'medium',
      [ErrorType.TEST]: 'medium',
      [ErrorType.BUILD]: 'high',
      [ErrorType.RUNTIME]: 'critical',
      [ErrorType.UNKNOWN]: 'low',
    };
    return severityMap[type];
  }

  /**
   * 提取错误消息
   */
  private extractMessage(error: string): string {
    // 提取第一行或主要错误信息
    const lines = error.split('\n');
    return lines[0].trim();
  }

  /**
   * 是否可自动修复
   */
  canAutoFix(type: ErrorType): boolean {
    const autoFixable = [
      ErrorType.SYNTAX,
      ErrorType.TYPE,
      ErrorType.REFERENCE,
      ErrorType.BUILD,
      ErrorType.TEST,
    ];
    return autoFixable.includes(type);
  }
}

export default ErrorClassifier;
