/**
 * RecoveryService - 恢复服务
 * 任务失败自动重试/回滚机制
 */

import { EventEmitter } from 'events';

export interface RecoveryPolicy {
  maxRetries: number;
  retryDelay: number; // ms
  enableRollback: boolean;
  alertAfterMaxRetries: boolean;
}

export interface RecoveryResult {
  taskId: string;
  action: 'retry' | 'rollback' | 'alert' | 'skip';
  retryCount: number;
  message: string;
}

export interface RollbackResult {
  success: boolean;
  taskId: string;
  message: string;
  timestamp: Date;
}

export interface RecoveryStats {
  totalFailures: number;
  totalRetries: number;
  totalRollbacks: number;
  totalAlerts: number;
  policy: RecoveryPolicy;
}

export class RecoveryService extends EventEmitter {
  private policy: RecoveryPolicy;
  private retryCounts: Map<string, number> = new Map();
  private stats = {
    totalFailures: 0,
    totalRetries: 0,
    totalRollbacks: 0,
    totalAlerts: 0,
  };

  constructor() {
    super();
    this.policy = {
      maxRetries: 3,
      retryDelay: 1000,
      enableRollback: true,
      alertAfterMaxRetries: true,
    };
  }

  /**
   * 设置恢复策略
   */
  setPolicy(policy: Partial<RecoveryPolicy>): void {
    this.policy = { ...this.policy, ...policy };
  }

  /**
   * 处理任务失败
   */
  async handleFailure(taskId: string, error: string): Promise<RecoveryResult> {
    this.stats.totalFailures++;
    
    const retryCount = (this.retryCounts.get(taskId) || 0) + 1;
    this.retryCounts.set(taskId, retryCount);

    // 检查是否超过最大重试次数
    if (retryCount > this.policy.maxRetries) {
      // 尝试回滚
      if (this.policy.enableRollback) {
        const rollback = await this.rollback(taskId);
        if (rollback.success) {
          this.stats.totalRollbacks++;
          return {
            taskId,
            action: 'rollback',
            retryCount,
            message: '重试次数过多，已回滚',
          };
        }
      }

      // 触发告警
      if (this.policy.alertAfterMaxRetries) {
        this.stats.totalAlerts++;
        this.emit('alert', { taskId, error, retryCount });
        return {
          taskId,
          action: 'alert',
          retryCount,
          message: '重试次数过多，触发告警',
        };
      }

      return {
        taskId,
        action: 'skip',
        retryCount,
        message: '跳过任务',
      };
    }

    // 执行重试
    this.stats.totalRetries++;
    
    // 延迟后重试
    setTimeout(() => {
      this.emit('retry', { taskId, retryCount, error });
    }, this.policy.retryDelay);

    return {
      taskId,
      action: 'retry',
      retryCount,
      message: `将在 ${this.policy.retryDelay}ms 后重试`,
    };
  }

  /**
   * 执行回滚
   */
  async rollback(taskId: string): Promise<RollbackResult> {
    // 检查任务是否存在 (模拟检查)
    if (!taskId || taskId === 'nonexistent') {
      return {
        success: false,
        taskId,
        message: '任务不存在',
        timestamp: new Date(),
      };
    }

    try {
      // 模拟回滚逻辑
      console.log(`[Recovery] Rolling back task: ${taskId}`);
      
      // 这里可以集成 GitOps 进行代码回滚
      // 或调用数据库进行状态回滚
      
      return {
        success: true,
        taskId,
        message: '回滚成功',
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        taskId,
        message: `回滚失败: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 获取恢复统计
   */
  getStats(): RecoveryStats {
    return {
      ...this.stats,
      policy: { ...this.policy },
    };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      totalFailures: 0,
      totalRetries: 0,
      totalRollbacks: 0,
      totalAlerts: 0,
    };
    this.retryCounts.clear();
  }

  /**
   * 检查任务是否需要恢复
   */
  needsRecovery(taskId: string): boolean {
    const retryCount = this.retryCounts.get(taskId) || 0;
    return retryCount > 0 && retryCount <= this.policy.maxRetries;
  }

  /**
   * 获取任务重试次数
   */
  getRetryCount(taskId: string): number {
    return this.retryCounts.get(taskId) || 0;
  }
}

export const recoveryService = new RecoveryService();
