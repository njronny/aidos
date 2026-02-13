/**
 * TaskWorker - 后台任务执行器
 * 负责检查待处理任务并分配给代理执行
 */

import { EventEmitter } from 'events';
import { dataStore } from '../../api/store';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  requirementId?: string;
  agentId?: string;
  result?: string;
  errorLog?: string;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  currentTaskId?: string;
}

export class TaskWorker extends EventEmitter {
  private running: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private pollInterval: number = 5000; // 5秒检查一次

  constructor() {
    super();
  }

  start(): void {
    if (this.running) return;
    
    this.running = true;
    console.log('[TaskWorker] Started');
    
    // 定时检查待处理任务
    this.intervalId = setInterval(() => {
      this.pollTasks();
    }, this.pollInterval);
    
    // 立即执行一次
    this.pollTasks();
  }

  stop(): void {
    if (!this.running) return;
    
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log('[TaskWorker] Stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  private async pollTasks(): Promise<void> {
    if (!this.running) return;
    
    try {
      const pendingTasks = await this.findPendingTasks();
      
      for (const task of pendingTasks) {
        await this.processTask(task);
      }
      
      const runningTasks = await this.findRunningTasks();
      for (const task of runningTasks) {
        await this.checkTaskCompletion(task);
      }
    } catch (error) {
      console.error('[TaskWorker] Poll error:', error);
    }
  }

  async findPendingTasks(): Promise<Task[]> {
    try {
      // 获取所有任务，过滤pending状态
      const result = await (dataStore as any).getAllTasks();
      if (result && Array.isArray(result)) {
        return result.filter((t: any) => t.status === 'pending' || !t.status);
      }
      return [];
    } catch (error) {
      console.error('[TaskWorker] Find pending tasks error:', error);
      return [];
    }
  }

  async findRunningTasks(): Promise<Task[]> {
    try {
      const result = await (dataStore as any).getAllTasks();
      if (result && Array.isArray(result)) {
        return result.filter((t: any) => t.status === 'in_progress' || t.status === 'running');
      }
      return [];
    } catch (error) {
      console.error('[TaskWorker] Find running tasks error:', error);
      return [];
    }
  }

  private async processTask(task: Task): Promise<void> {
    try {
      console.log(`[TaskWorker] Processing task: ${task.title}`);
      
      const agent = await this.findAvailableAgent();
      if (!agent) {
        console.log('[TaskWorker] No available agent');
        return;
      }
      
      await this.assignTaskToAgent(task, agent);
      await this.executeTask(task, agent);
      
    } catch (error) {
      console.error(`[TaskWorker] Process task error:`, error);
    }
  }

  async findAvailableAgent(): Promise<Agent | null> {
    try {
      const agents = await dataStore.getAllAgents();
      const idleAgent = agents?.find((a: any) => a.status === 'idle');
      return idleAgent || null;
    } catch (error) {
      console.error('[TaskWorker] Find agent error:', error);
      return null;
    }
  }

  async assignTaskToAgent(task: Task, agent: Agent): Promise<void> {
    try {
      await this.updateTaskStatus(task.id, 'in_progress');
      console.log(`[TaskWorker] Assigned task ${task.id} to agent ${agent.name}`);
    } catch (error) {
      console.error('[TaskWorker] Assign task error:', error);
    }
  }

  async executeTask(task: Task, agent: Agent): Promise<void> {
    try {
      console.log(`[TaskWorker] Executing task: ${task.title}`);
      
      const result = await this.runAgentTask(task, agent);
      
      // 更新任务结果
      await dataStore.updateTask(task.id, {
        status: 'completed',
        result: JSON.stringify(result),
      } as any);
      
      // 释放代理
      await this.updateAgentStatus(agent.id, 'idle');
      
      console.log(`[TaskWorker] Task completed: ${task.id}`);
      this.emit('taskCompleted', task);
      
    } catch (error: any) {
      console.error(`[TaskWorker] Execute task error:`, error);
      
      await dataStore.updateTask(task.id, {
        status: 'failed',
      } as any);
      
      await this.updateAgentStatus(agent.id, 'idle');
    }
  }

  private async runAgentTask(task: Task, agent: Agent): Promise<any> {
    const taskType = this.getTaskType(task.title);
    
    switch (taskType) {
      case 'code':
        return this.executeCodeTask(task);
      case 'test':
        return this.executeTestTask(task);
      case 'review':
        return this.executeReviewTask(task);
      default:
        return this.executeDefaultTask(task);
    }
  }

  private getTaskType(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('实现') || t.includes('开发') || t.includes('代码')) return 'code';
    if (t.includes('测试') || t.includes('单元')) return 'test';
    if (t.includes('审查') || t.includes('review')) return 'review';
    return 'default';
  }

  private async executeCodeTask(task: Task): Promise<any> {
    return {
      type: 'code_generation',
      taskId: task.id,
      result: `Generated code for: ${task.title}`,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeTestTask(task: Task): Promise<any> {
    return {
      type: 'test_generation',
      taskId: task.id,
      result: `Generated tests for: ${task.title}`,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeReviewTask(task: Task): Promise<any> {
    return {
      type: 'code_review',
      taskId: task.id,
      result: `Reviewed code for: ${task.title}`,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeDefaultTask(task: Task): Promise<any> {
    return {
      type: 'default',
      taskId: task.id,
      result: `Processed: ${task.title}`,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkTaskCompletion(task: Task): Promise<void> {
    // 可以添加外部检查逻辑
  }

  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    try {
      await dataStore.updateTask(taskId, { status } as any);
    } catch (error) {
      console.error('[TaskWorker] Update task status error:', error);
    }
  }

  async updateAgentStatus(agentId: string, status: string, taskId?: string): Promise<void> {
    console.log(`[TaskWorker] Agent ${agentId} -> ${status}`);
  }
}

export default TaskWorker;
