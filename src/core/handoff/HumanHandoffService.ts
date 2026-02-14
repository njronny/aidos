/**
 * HumanHandoffService - 人工接管服务
 * 关键节点等待人工确认、异常时呼叫人工
 */

import { EventEmitter } from 'events';

export type HandoffPriority = 'low' | 'normal' | 'high' | 'critical';
export type HandoffStatus = 'pending' | 'approved' | 'rejected' | 'timeout' | 'cancelled';

export interface HandoffEvent {
  id: string;
  taskId: string;
  message: string;
  priority: HandoffStatus extends HandoffStatus ? HandoffStatus : HandoffPriority;
  status: HandoffStatus;
  createdAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  metadata?: Record<string, any>;
}

export interface HandoffConfig {
  timeoutMs: number;
  autoApprove: boolean;
  maxConcurrent: number;
}

export class HumanHandoffService extends EventEmitter {
  private handoffs: Map<string, HandoffEvent> = new Map();
  private config: HandoffConfig = {
    timeoutMs: 300000, // 5分钟默认超时
    autoApprove: false,
    maxConcurrent: 10,
  };
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<HandoffConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 请求人工接管
   */
  async requestHandoff(
    taskId: string,
    message: string,
    priority: HandoffPriority = 'normal'
  ): Promise<HandoffEvent> {
    const id = `handoff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const event: HandoffEvent = {
      id,
      taskId,
      message,
      priority: priority as any,
      status: 'pending',
      createdAt: new Date(),
    };

    this.handoffs.set(id, event);

    // 设置超时
    if (this.config.timeoutMs > 0) {
      const timeout = setTimeout(() => {
        this.handleTimeout(id);
      }, this.config.timeoutMs);
      this.timeouts.set(id, timeout);
    }

    // 触发通知
    this.emit('handoff', event);
    console.log(`[Handoff] Request created: ${id} - ${message}`);

    return event;
  }

  /**
   * 批准接管
   */
  async approveHandoff(id: string, approvedBy: string = 'admin'): Promise<HandoffEvent | null> {
    const event = this.handoffs.get(id);
    if (!event || event.status !== 'pending') {
      return null;
    }

    event.status = 'approved';
    event.approvedAt = new Date();
    event.approvedBy = approvedBy;

    // 清除超时
    this.clearTimeout(id);

    this.emit('approved', event);
    console.log(`[Handoff] Approved: ${id}`);

    return event;
  }

  /**
   * 拒绝接管
   */
  async rejectHandoff(id: string, reason: string): Promise<HandoffEvent | null> {
    const event = this.handoffs.get(id);
    if (!event || event.status !== 'pending') {
      return null;
    }

    event.status = 'rejected';
    event.rejectedAt = new Date();
    event.rejectionReason = reason;

    // 清除超时
    this.clearTimeout(id);

    this.emit('rejected', event);
    console.log(`[Handoff] Rejected: ${id} - ${reason}`);

    return event;
  }

  /**
   * 取消接管请求
   */
  async cancelHandoff(id: string): Promise<boolean> {
    const event = this.handoffs.get(id);
    if (!event || event.status !== 'pending') {
      return false;
    }

    event.status = 'cancelled';

    // 清除超时
    this.clearTimeout(id);

    this.emit('cancelled', event);
    return true;
  }

  /**
   * 获取待处理的接管请求
   */
  getPendingHandoffs(): HandoffEvent[] {
    const priorityOrder: Record<HandoffPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
    return Array.from(this.handoffs.values())
      .filter(e => e.status === 'pending')
      .sort((a, b) => {
        return priorityOrder[a.priority as HandoffPriority] - priorityOrder[b.priority as HandoffPriority];
      });
  }

  /**
   * 获取所有接管请求
   */
  getAllHandoffs(): HandoffEvent[] {
    return Array.from(this.handoffs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 获取单个接管请求
   */
  getHandoff(id: string): HandoffEvent | undefined {
    return this.handoffs.get(id);
  }

  /**
   * 处理超时
   */
  private handleTimeout(id: string): void {
    const event = this.handoffs.get(id);
    if (!event || event.status !== 'pending') {
      return;
    }

    if (this.config.autoApprove) {
      // 自动批准
      event.status = 'approved';
      event.approvedAt = new Date();
      event.approvedBy = 'auto';
      this.emit('approved', event);
    } else {
      // 标记超时
      event.status = 'timeout';
      this.emit('timeout', event);
    }

    this.timeouts.delete(id);
    console.log(`[Handoff] Timeout: ${id}`);
  }

  /**
   * 清除超时
   */
  private clearTimeout(id: string): void {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    pending: number;
    approved: number;
    rejected: number;
    timeout: number;
  } {
    const handoffs = this.getAllHandoffs();
    return {
      pending: handoffs.filter(h => h.status === 'pending').length,
      approved: handoffs.filter(h => h.status === 'approved').length,
      rejected: handoffs.filter(h => h.status === 'rejected').length,
      timeout: handoffs.filter(h => h.status === 'timeout').length,
    };
  }
}

export const humanHandoffService = new HumanHandoffService();
