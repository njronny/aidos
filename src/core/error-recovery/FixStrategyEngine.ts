/**
 * FixStrategyEngine - 修复策略引擎
 * 
 * 根据错误类型生成修复策略
 */

import { ErrorType, ClassifiedError } from './ErrorClassifier';

export interface FixAction {
  type: 'analyze' | 'fix' | 'retry' | 'rollback' | 'skip' | 'notify';
  description: string;
  patch?: string;
  params?: Record<string, any>;
}

export interface FixStrategy {
  errorType: ErrorType;
  confidence: number;
  actions: FixAction[];
  estimatedTime?: number;
}

export class FixStrategyEngine {
  private strategyTemplates: Map<ErrorType, FixStrategy> = new Map();

  constructor() {
    this.initTemplates();
  }

  /**
   * 初始化修复模板
   */
  private initTemplates(): void {
    // 语法错误
    this.strategyTemplates.set(ErrorType.SYNTAX, {
      errorType: ErrorType.SYNTAX,
      confidence: 0.9,
      actions: [
        { type: 'analyze', description: '分析语法错误位置' },
        { type: 'fix', description: '修复语法错误' },
      ],
    });

    // 类型错误
    this.strategyTemplates.set(ErrorType.TYPE, {
      errorType: ErrorType.TYPE,
      confidence: 0.8,
      actions: [
        { type: 'analyze', description: '分析类型错误' },
        { type: 'fix', description: '添加类型注解或修复类型' },
      ],
    });

    // 引用错误
    this.strategyTemplates.set(ErrorType.REFERENCE, {
      errorType: ErrorType.REFERENCE,
      confidence: 0.85,
      actions: [
        { type: 'analyze', description: '查找未定义的引用' },
        { type: 'fix', description: '声明或导入缺失的变量' },
      ],
    });

    // 网络错误
    this.strategyTemplates.set(ErrorType.NETWORK, {
      errorType: ErrorType.NETWORK,
      confidence: 0.7,
      actions: [
        { type: 'retry', description: '重试网络请求', params: { maxRetries: 3, delay: 1000 } },
      ],
    });

    // 超时错误
    this.strategyTemplates.set(ErrorType.TIMEOUT, {
      errorType: ErrorType.TIMEOUT,
      confidence: 0.75,
      actions: [
        { type: 'retry', description: '增加超时时间并重试', params: { maxRetries: 2 } },
      ],
    });

    // Git 错误
    this.strategyTemplates.set(ErrorType.GIT, {
      errorType: ErrorType.GIT,
      confidence: 0.6,
      actions: [
        { type: 'analyze', description: '分析 Git 冲突' },
        { type: 'fix', description: '解决 Git 冲突' },
      ],
    });

    // 测试失败
    this.strategyTemplates.set(ErrorType.TEST, {
      errorType: ErrorType.TEST,
      confidence: 0.7,
      actions: [
        { type: 'analyze', description: '分析测试失败原因' },
        { type: 'fix', description: '修复测试或代码' },
        { type: 'retry', description: '重新运行测试' },
      ],
    });

    // 构建错误
    this.strategyTemplates.set(ErrorType.BUILD, {
      errorType: ErrorType.BUILD,
      confidence: 0.8,
      actions: [
        { type: 'analyze', description: '分析构建错误' },
        { type: 'fix', description: '修复构建问题' },
      ],
    });

    // 运行时错误
    this.strategyTemplates.set(ErrorType.RUNTIME, {
      errorType: ErrorType.RUNTIME,
      confidence: 0.5,
      actions: [
        { type: 'analyze', description: '分析运行时错误' },
        { type: 'notify', description: '通知开发者', params: { urgent: true } },
      ],
    });

    // 未知错误
    this.strategyTemplates.set(ErrorType.UNKNOWN, {
      errorType: ErrorType.UNKNOWN,
      confidence: 0.3,
      actions: [
        { type: 'analyze', description: '记录错误信息' },
        { type: 'notify', description: '通知开发者' },
        { type: 'skip', description: '跳过该任务' },
      ],
    });
  }

  /**
   * 生成修复策略
   */
  generateStrategy(errorType: ErrorType, errorMessage: string): FixStrategy {
    const template = this.strategyTemplates.get(errorType);
    
    if (!template) {
      return this.getDefaultStrategy(errorType);
    }

    // 根据错误消息调整置信度
    const confidence = this.adjustConfidence(template.confidence, errorMessage);

    return {
      ...template,
      confidence,
      actions: [...template.actions],
    };
  }

  /**
   * 根据错误消息调整置信度
   */
  private adjustConfidence(base: number, errorMessage: string): number {
    let confidence = base;

    // 如果错误消息包含具体位置，置信度更高
    if (/\d+:\d+/.test(errorMessage)) {
      confidence += 0.1;
    }

    // 如果错误消息很长，置信度更高（更有信息量）
    if (errorMessage.length > 100) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1);
  }

  /**
   * 获取默认策略
   */
  private getDefaultStrategy(errorType: ErrorType): FixStrategy {
    return {
      errorType,
      confidence: 0.3,
      actions: [
        { type: 'analyze', description: '分析错误' },
        { type: 'notify', description: '通知开发者' },
      ],
    };
  }

  /**
   * 应用修复
   */
  applyFix(code: string, action: FixAction): string {
    if (action.patch) {
      return action.patch;
    }
    return code;
  }

  /**
   * 是否应该重试
   */
  shouldRetry(errorType: ErrorType): boolean {
    const retryable = [ErrorType.NETWORK, ErrorType.TIMEOUT, ErrorType.TEST];
    return retryable.includes(errorType);
  }

  /**
   * 是否应该回滚
   */
  shouldRollback(errorType: ErrorType): boolean {
    const critical = [ErrorType.RUNTIME, ErrorType.BUILD];
    return critical.includes(errorType);
  }

  /**
   * 获取最大重试次数
   */
  getMaxRetries(errorType: ErrorType): number {
    const retryMap: Partial<Record<ErrorType, number>> = {
      [ErrorType.NETWORK]: 3,
      [ErrorType.TIMEOUT]: 2,
      [ErrorType.TEST]: 2,
    };
    return retryMap[errorType] || 1;
  }
}

export default FixStrategyEngine;
