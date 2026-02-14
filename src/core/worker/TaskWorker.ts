/**
 * TaskWorker - 后台任务执行器
 * 负责检查待处理任务并分配给代理执行
 * 集成 AgentPool 使用6个专业代理
 */

import { EventEmitter } from 'events';
import { Queue, Worker } from 'bullmq';
import { dataStore } from '../../api/store';
import { AgentPool, Agent, AgentType, AgentStatus } from '../agents';
import { WorkflowService } from '../workflow';
import { TaskExecutor } from '../executor';
import { GitOps } from '../gitops';
import { AutoFix } from '../autofix';

// Redis 连接配置
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  requirementId?: string;
  agentId?: string;
  result?: string;
  errorLog?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RetryConfig {
  maxRetries: number;        // 最大重试次数
  baseDelayMs: number;        // 基础延迟（毫秒）
  maxDelayMs: number;         // 最大延迟（毫秒）
  backoffMultiplier: number; // 退避倍数
}

export class TaskWorker extends EventEmitter {
  private running: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private pollInterval: number = 5000; // 5秒检查一次
  private taskTimeoutMs: number = 5 * 60 * 1000; // 任务超时5分钟
  private agentPool: AgentPool;
  private workflowService: WorkflowService;
  
  // 重试配置
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  };
  
  // 任务重试计数
  private taskRetryCount: Map<string, number> = new Map();
  
  // BullMQ 队列（用于持久化）
  private taskQueue: Queue;
  private worker?: Worker;
  
  // TaskExecutor 用于真实任务执行（含 Git 自动化）
  private taskExecutor: TaskExecutor;
  private gitOps: GitOps;
  private autoFix: AutoFix;

  constructor(options?: { taskTimeoutMs?: number; agentPool?: AgentPool; retryConfig?: Partial<RetryConfig> }) {
    super();
    if (options?.taskTimeoutMs) {
      this.taskTimeoutMs = options.taskTimeoutMs;
    }
    if (options?.retryConfig) {
      this.retryConfig = { ...this.retryConfig, ...options.retryConfig };
    }
    
    // 使用传入的 AgentPool 或从 WorkflowService 获取
    this.agentPool = options?.agentPool || this.getAgentPool();
    this.workflowService = this.getWorkflowService();
    
    // 初始化 GitOps
    this.gitOps = new GitOps({
      repoPath: process.cwd(),
      authorName: 'AIDOS',
      authorEmail: 'aidos@dev.local',
    });
    
    // 初始化 TaskExecutor（包含 Git 自动化）
    this.taskExecutor = new TaskExecutor({
      enableGitCommit: true,
      enableCodeGeneration: true,
      gitAutoPush: false,
    }, undefined, this.gitOps);
    
    // 初始化 AutoFix（自动修复）
    this.autoFix = new AutoFix({
      maxRetries: 2,
      enableLinting: true,
      enableTesting: true,
    });
    
    // 初始化 BullMQ 队列
    this.taskQueue = new Queue('aidos-tasks', { connection: redisConnection });
    
    // 设置任务处理 worker
    this.setupWorker();
  }
  
  /**
   * 设置 BullMQ Worker 处理任务
   */
  private setupWorker(): void {
    this.worker = new Worker('aidos-tasks', async (job) => {
      const task = job.data as Task;
      console.log(`[TaskWorker] Processing queued task: ${task.title}`);
      
      const agent = await this.findAvailableAgent();
      if (!agent) {
        throw new Error('No available agent');
      }
      
      await this.assignTaskToAgent(task, agent);
      await this.executeTask(task, agent);
      
      return { success: true, taskId: task.id };
    }, {
      connection: redisConnection,
      concurrency: 5,
    });
    
    this.worker.on('completed', (job) => {
      console.log(`[TaskWorker] Job ${job.id} completed`);
    });
    
    this.worker.on('failed', (job, err) => {
      console.error(`[TaskWorker] Job ${job?.id} failed:`, err.message);
    });
  }
  
  private getAgentPool(): AgentPool {
    // 通过 WorkflowService 获取 AgentPool
    const workflowService = this.getWorkflowService();
    return workflowService.getAgentPool();
  }
  
  private getWorkflowService(): WorkflowService {
    const { getWorkflowService } = require('../workflow');
    return getWorkflowService();
  }
  
  /**
   * 计算重试延迟（指数退避）
   */
  private calculateRetryDelay(taskId: string): number {
    const retryCount = this.taskRetryCount.get(taskId) || 0;
    const delay = Math.min(
      this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, retryCount),
      this.retryConfig.maxDelayMs
    );
    return delay;
  }
  
  /**
   * 检查任务是否需要重试
   */
  private shouldRetry(taskId: string): boolean {
    const retryCount = this.taskRetryCount.get(taskId) || 0;
    return retryCount < this.retryConfig.maxRetries;
  }
  
  /**
   * 增加任务重试计数
   */
  private incrementRetryCount(taskId: string): number {
    const current = this.taskRetryCount.get(taskId) || 0;
    const newCount = current + 1;
    this.taskRetryCount.set(taskId, newCount);
    return newCount;
  }
  
  /**
   * 清除任务重试计数
   */
  private clearRetryCount(taskId: string): void {
    this.taskRetryCount.delete(taskId);
  }
  
  /**
   * 将任务添加到持久化队列
   */
  async enqueueTask(task: Task): Promise<void> {
    await this.taskQueue.add('process-task', task, {
      jobId: task.id,
      removeOnComplete: true,
      removeOnFail: 100,
    });
    console.log(`[TaskWorker] Task ${task.id} added to queue`);
  }
  
  /**
   * 获取队列状态
   */
  async getQueueStatus(): Promise<{ waiting: number; active: number; completed: number; failed: number }> {
    const counts = await this.taskQueue.getJobCounts();
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
    };
  }
  
  /**
   * 关闭队列和 worker
   */
  async shutdown(): Promise<void> {
    await this.taskQueue.close();
    if (this.worker) {
      await this.worker.close();
    }
    console.log('[TaskWorker] Queue and worker closed');
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

  /**
   * 健康检查：检测并恢复所有卡住的任务
   */
  async healthCheck(): Promise<{ recovered: number; stuck: Task[] }> {
    const runningTasks = await this.findRunningTasks();
    const stuckTasks: Task[] = [];
    
    for (const task of runningTasks) {
      const updatedAt = task.updatedAt ? new Date(task.updatedAt).getTime() : 0;
      const taskAge = Date.now() - updatedAt;
      
      if (taskAge > this.taskTimeoutMs) {
        stuckTasks.push(task);
        await this.updateTaskStatus(task.id, 'pending');
        console.log(`[TaskWorker] Health check: recovered stuck task ${task.title}`);
      }
    }
    
    return { recovered: stuckTasks.length, stuck: stuckTasks };
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
      // 使用 AgentPool 获取可用代理（支持6个专业代理）
      const availableAgents = this.agentPool.getIdleAgents();
      if (availableAgents.length > 0) {
        // 按代理类型选择合适的代理
        const taskType = this.getTaskType('');
        const preferredType = this.mapTaskTypeToAgentType(taskType);
        
        // 优先选择匹配类型的代理
        const matched = availableAgents.find((a: Agent) => a.type === preferredType);
        return matched || availableAgents[0];
      }
      
      return null;
    } catch (error) {
      console.error('[TaskWorker] Find agent error:', error);
      return null;
    }
  }
  
  /**
   * 将任务类型映射到代理类型
   */
  private mapTaskTypeToAgentType(taskType: string): string {
    switch (taskType) {
      case 'code':
        return 'full_stack_developer';
      case 'test':
        return 'qa_engineer';
      case 'review':
        return 'architect';
      case 'pm':
        return 'project_manager';
      case 'product':
        return 'product_manager';
      case 'db':
        return 'database_expert';
      default:
        return 'full_stack_developer';
    }
  }

  async assignTaskToAgent(task: Task, agent: Agent): Promise<void> {
    try {
      await this.updateTaskStatus(task.id, 'in_progress');
      console.log(`[TaskWorker] Assigned task ${task.id} to agent ${agent.name} (${agent.type})`);
    } catch (error) {
      console.error('[TaskWorker] Assign task error:', error);
    }
  }

  async executeTask(task: Task, agent: Agent): Promise<void> {
    try {
      console.log(`[TaskWorker] Executing task: ${task.title} with agent ${agent.name}`);
      
      // 使用 TaskExecutor 执行真实任务（含 Git 自动化）
      const executorTask = {
        id: task.id,
        name: task.title,
        description: task.description || '',
        status: 'pending',
        priority: 1,
        createdAt: new Date().toISOString(),
      };
      
      const result = await this.taskExecutor.execute(executorTask as any);
      
      // 更新任务结果
      await dataStore.updateTask(task.id, {
        status: result.success ? 'completed' : 'failed',
        result: JSON.stringify(result),
      } as any);
      
      if (result.success) {
        this.clearRetryCount(task.id);
        console.log(`[TaskWorker] Task completed: ${task.id}`);
        
        this.emit('taskCompleted', task);
      } else {
        // 执行失败，尝试重试
        const errorMsg = result.output || 'Unknown error';
        await this.handleTaskFailure(task, agent, errorMsg);
      }
      
    } catch (error: any) {
      console.error(`[TaskWorker] Execute task error:`, error);
      await this.handleTaskFailure(task, agent, error.message);
    }
  }
  
  /**
   * 处理任务失败（带重试机制）
   */
  private async handleTaskFailure(task: Task, agent: Agent, error: string): Promise<void> {
    if (this.shouldRetry(task.id)) {
      const retryCount = this.incrementRetryCount(task.id);
      const delay = this.calculateRetryDelay(task.id);
      
      console.log(`[TaskWorker] Task ${task.id} failed, retry ${retryCount}/${this.retryConfig.maxRetries} in ${delay}ms: ${error}`);
      
      // 更新任务状态为 pending 并设置重试信息
      await dataStore.updateTask(task.id, {
        status: 'pending',
        errorLog: `Retry ${retryCount}: ${error}`,
      } as any);
      
      // 延迟后重新加入队列
      setTimeout(async () => {
        await this.processTask(task);
      }, delay);
      
      this.emit('taskRetry', { task, retryCount, delay, error });
    } else {
      // 超过最大重试次数，标记为失败
      console.log(`[TaskWorker] Task ${task.id} failed after ${this.retryConfig.maxRetries} retries`);
      
      await dataStore.updateTask(task.id, {
        status: 'failed',
        errorLog: `Failed after ${this.retryConfig.maxRetries} retries: ${error}`,
      } as any);
      
      this.clearRetryCount(task.id);
      this.emit('taskFailed', { task, error });
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
    // 自愈机制：检测卡住的任务并自动恢复
    const updatedAt = task.updatedAt ? new Date(task.updatedAt).getTime() : 0;
    const taskAge = Date.now() - updatedAt;
    
    // 如果任务处于 in_progress 状态超过超时时间，认为是卡住了
    if (task.status === 'in_progress' && taskAge > this.taskTimeoutMs) {
      console.log(`[TaskWorker] Task stuck detected: ${task.title} (age: ${Math.round(taskAge/1000)}s)`);
      
      // 自动重置为 pending，让系统重新处理
      await this.updateTaskStatus(task.id, 'pending');
      console.log(`[TaskWorker] Auto-recovered stuck task: ${task.title}`);
      this.emit('taskRecovered', task);
    }
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
