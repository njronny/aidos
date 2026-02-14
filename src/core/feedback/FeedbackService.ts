/**
 * FeedbackService - 反馈闭环服务
 * 用户反馈收集、失败案例学习、Prompt 优化
 */

import { EventEmitter } from 'events';

export type FeedbackCategory = 'quality' | 'speed' | 'ui' | 'feature' | 'bug' | 'other';
export type FeedbackStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

export interface Feedback {
  id: string;
  content: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  createdAt: Date;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export interface Failure {
  id: string;
  taskId: string;
  error: string;
  details?: Record<string, any>;
  status: 'open' | 'analyzing' | 'learned' | 'dismissed';
  createdAt: Date;
}

export interface PromptLearning {
  id: string;
  originalPrompt: string;
  improvedPrompt: string;
  reason: string;
  applied: boolean;
  createdAt: Date;
}

export interface FailurePatterns {
  total: number;
  byType: Record<string, number>;
  recent: Failure[];
  recommendations: string[];
}

export class FeedbackService extends EventEmitter {
  private feedbacks: Map<string, Feedback> = new Map();
  private failures: Map<string, Failure> = new Map();
  private learnings: Map<string, PromptLearning> = new Map();

  constructor() {
    super();
  }

  /**
   * 提交用户反馈
   */
  async submitFeedback(content: string, category: FeedbackCategory = 'other'): Promise<Feedback> {
    if (!content || content.trim().length === 0) {
      throw new Error('反馈内容不能为空');
    }

    const feedback: Feedback = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      category,
      status: 'pending',
      createdAt: new Date(),
    };

    this.feedbacks.set(feedback.id, feedback);
    this.emit('feedback', feedback);

    console.log(`[Feedback] New feedback: ${feedback.id}`);
    return feedback;
  }

  /**
   * 记录失败案例
   */
  async recordFailure(taskId: string, error: string, details?: Record<string, any>): Promise<Failure> {
    const failure: Failure = {
      id: `fail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      error,
      details,
      status: 'open',
      createdAt: new Date(),
    };

    this.failures.set(failure.id, failure);
    this.emit('failure', failure);

    console.log(`[Feedback] Failure recorded: ${failure.id} - ${error}`);
    return failure;
  }

  /**
   * 分析失败模式
   */
  async analyzeFailurePatterns(): Promise<FailurePatterns> {
    const allFailures = Array.from(this.failures.values());
    
    // 按错误类型分组
    const byType: Record<string, number> = {};
    
    for (const failure of allFailures) {
      const errorType = this.categorizeError(failure.error);
      byType[errorType] = (byType[errorType] || 0) + 1;
    }

    // 生成建议
    const recommendations = this.generateRecommendations(byType);

    return {
      total: allFailures.length,
      byType,
      recent: allFailures
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10),
      recommendations,
    };
  }

  /**
   * 从反馈中学习，生成 Prompt 改进
   */
  async learnFromFeedback(): Promise<{ improvements: string[] }> {
    const improvements: string[] = [];
    
    // 分析反馈
    const feedbackList = Array.from(this.feedbacks.values());
    const qualityFeedbacks = feedbackList.filter(f => f.category === 'quality');
    
    if (qualityFeedbacks.length > 0) {
      improvements.push('建议在生成代码时添加更多注释和文档');
    }

    // 分析失败
    const patterns = await this.analyzeFailurePatterns();
    
    if (patterns.byType['syntax'] > 0) {
      improvements.push('改进代码生成 prompt，增加语法检查步骤');
    }
    
    if (patterns.byType['test'] > 0) {
      improvements.push('生成代码后自动运行测试，确保功能正确');
    }

    // 创建学习记录
    for (const improvement of improvements) {
      const learning: PromptLearning = {
        id: `learn_${Date.now()}`,
        originalPrompt: '请生成代码',
        improvedPrompt: improvement,
        reason: 'Based on feedback analysis',
        applied: false,
        createdAt: new Date(),
      };
      this.learnings.set(learning.id, learning);
    }

    return { improvements };
  }

  /**
   * 获取反馈统计
   */
  async getFeedbackStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    resolved: number;
  }> {
    const feedbacks = Array.from(this.feedbacks.values());
    
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    
    for (const fb of feedbacks) {
      byCategory[fb.category] = (byCategory[fb.category] || 0) + 1;
      byStatus[fb.status] = (byStatus[fb.status] || 0) + 1;
    }

    return {
      total: feedbacks.length,
      byCategory,
      byStatus,
      resolved: feedbacks.filter(f => f.status === 'resolved').length,
    };
  }

  /**
   * 解决反馈
   */
  async resolveFeedback(feedbackId: string): Promise<Feedback | null> {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) return null;

    feedback.status = 'resolved';
    feedback.resolvedAt = new Date();
    this.feedbacks.set(feedbackId, feedback);

    return feedback;
  }

  /**
   * 获取所有反馈
   */
  async getFeedbacks(status?: FeedbackStatus, limit: number = 50): Promise<Feedback[]> {
    let list = Array.from(this.feedbacks.values());
    
    if (status) {
      list = list.filter(f => f.status === status);
    }
    
    return list
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * 获取学习记录
   */
  async getLearnings(applied?: boolean): Promise<PromptLearning[]> {
    let list = Array.from(this.learnings.values());
    
    if (applied !== undefined) {
      list = list.filter(l => l.applied === applied);
    }
    
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 应用学习到的改进
   */
  async applyLearning(learningId: string): Promise<boolean> {
    const learning = this.learnings.get(learningId);
    if (!learning) return false;

    learning.applied = true;
    this.learnings.set(learningId, learning);
    
    console.log(`[Feedback] Applied learning: ${learningId}`);
    return true;
  }

  /**
   * 分类错误类型
   */
  private categorizeError(error: string): string {
    const lower = error.toLowerCase();
    
    if (lower.includes('syntax') || lower.includes('语法')) return 'syntax';
    if (lower.includes('test') || lower.includes('测试')) return 'test';
    if (lower.includes('timeout') || lower.includes('超时')) return 'timeout';
    if (lower.includes('memory') || lower.includes('内存')) return 'memory';
    if (lower.includes('network') || lower.includes('网络')) return 'network';
    
    return 'other';
  }

  /**
   * 生成建议
   */
  private generateRecommendations(byType: Record<string, number>): string[] {
    const recommendations: string[] = [];
    
    if ((byType['syntax'] || 0) > 2) {
      recommendations.push('代码语法错误较多，建议增加代码验证步骤');
    }
    
    if ((byType['test'] || 0) > 2) {
      recommendations.push('测试失败频繁，建议改进测试生成 prompt');
    }
    
    if ((byType['timeout'] || 0) > 1) {
      recommendations.push('任务超时较多，建议优化执行策略');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('系统运行稳定，继续保持');
    }
    
    return recommendations;
  }
}

export const feedbackService = new FeedbackService();
