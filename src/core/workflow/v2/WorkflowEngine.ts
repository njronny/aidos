/**
 * WorkflowEngine - Task Execution Engine
 * 
 * 任务执行引擎
 * - 任务队列
 * - 状态机
 * - 重试机制
 * - 事件驱动
 */

import { EventEmitter } from 'events';

export type TaskType = 'analyze' | 'generate' | 'test' | 'commit' | 'fix';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface WorkflowTask {
  id: string;
  name: string;
  type: TaskType;
  priority?: TaskPriority;
  retry?: boolean;
  maxRetries?: number;
  dependencies?: string[];
  handler?: () => Promise<any>;
  result?: any;
  error?: string;
}

export interface WorkflowState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  currentTask?: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
}

export interface WorkflowConfig {
  maxConcurrent?: number;
  retryDelay?: number;
  enableAutoFix?: boolean;
}

export class WorkflowEngine extends EventEmitter {
  private queue: WorkflowTask[] = [];
  private runningTasks: Set<string> = new Set();
  private config: Required<WorkflowConfig>;
  private state: WorkflowState;
  private taskAttempts: Map<string, number> = new Map();

  constructor(config: WorkflowConfig = {}) {
    super();
    
    this.config = {
      maxConcurrent: config.maxConcurrent || 3,
      retryDelay: config.retryDelay || 1000,
      enableAutoFix: config.enableAutoFix ?? true,
    };

    this.state = {
      status: 'idle',
      progress: 0,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
    };
  }

  /**
   * 添加任务到队列
   */
  addTask(task: WorkflowTask): void {
    // 按优先级排序
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priority = task.priority || 'medium';
    
    let insertIndex = this.queue.findIndex(t => {
      const tPriority = t.priority || 'medium';
      return priorityOrder[priority] < priorityOrder[tPriority];
    });
    
    if (insertIndex === -1) {
      insertIndex = this.queue.length;
    }
    
    this.queue.splice(insertIndex, 0, task);
    this.state.totalTasks = this.queue.length;
    
    this.emit('task:added', task);
  }

  /**
   * 获取队列大小
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * 获取当前状态
   */
  getState(): WorkflowState {
    return { ...this.state };
  }

  /**
   * 运行工作流
   */
  async run(): Promise<void> {
    if (this.state.status === 'running') {
      return;
    }

    this.state.status = 'running';
    this.emit('workflow:start');

    while (this.queue.length > 0 || this.runningTasks.size > 0) {
      // 处理队列中的任务
      while (this.queue.length > 0 && this.runningTasks.size < this.config.maxConcurrent) {
        const task = this.queue.shift();
        if (task) {
          this.executeTask(task);
        }
      }

      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.state.status = this.state.failedTasks > 0 ? 'failed' : 'completed';
    this.emit('workflow:complete', this.state);
  }

  /**
   * 执行任务
   */
  private async executeTask(task: WorkflowTask): Promise<void> {
    this.runningTasks.add(task.id);
    this.state.currentTask = task.id;
    this.emit('task:start', task);

    try {
      // 执行任务处理器
      if (task.handler) {
        task.result = await task.handler();
      } else {
        // 默认处理：模拟执行
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // 成功
      this.state.completedTasks++;
      this.updateProgress();
      this.emit('task:complete', task);
      
    } catch (error) {
      // 处理失败
      task.error = error instanceof Error ? error.message : String(error);
      
      // 检查是否需要重试
      if (task.retry && this.shouldRetry(task)) {
        this.taskAttempts.set(task.id, (this.taskAttempts.get(task.id) || 0) + 1);
        
        this.emit('task:retry', { task, attempt: this.taskAttempts.get(task.id) });
        
        // 延迟重试
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        
        // 重新加入队列
        this.queue.unshift(task);
      } else {
        this.state.failedTasks++;
        this.updateProgress();
        this.emit('task:failed', task);
      }
    } finally {
      this.runningTasks.delete(task.id);
      this.state.currentTask = undefined;
    }
  }

  /**
   * 检查是否应该重试
   */
  private shouldRetry(task: WorkflowTask): boolean {
    const attempts = this.taskAttempts.get(task.id) || 0;
    const maxRetries = task.maxRetries ?? 2;
    return attempts < maxRetries;
  }

  /**
   * 更新进度
   */
  private updateProgress(): void {
    const total = this.state.totalTasks;
    const completed = this.state.completedTasks + this.state.failedTasks;
    this.state.progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  /**
   * 暂停工作流
   */
  pause(): void {
    if (this.state.status === 'running') {
      this.state.status = 'paused';
      this.emit('workflow:paused');
    }
  }

  /**
   * 恢复工作流
   */
  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'running';
      this.emit('workflow:resumed');
      this.run();
    }
  }

  /**
   * 取消工作流
   */
  cancel(): void {
    this.queue = [];
    this.runningTasks.clear();
    this.state.status = 'failed';
    this.emit('workflow:cancelled');
  }

  /**
   * 获取任务结果
   */
  getTaskResult(taskId: string): any {
    const task = this.queue.find(t => t.id === taskId);
    return task?.result;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    running: number;
  } {
    return {
      total: this.state.totalTasks,
      completed: this.state.completedTasks,
      failed: this.state.failedTasks,
      pending: this.queue.length,
      running: this.runningTasks.size,
    };
  }
}

export default WorkflowEngine;
