import { TaskQueue, TaskJobData, TaskQueueConfig } from '../queue';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskResult,
  SchedulerConfig,
  SchedulerEvent,
  SchedulerEventHandler,
} from '../../types';
import { v4 as uuidv4 } from 'uuid';

// Validation constants
const MIN_TASK_NAME_LENGTH = 1;
const MAX_TASK_NAME_LENGTH = 200;
const MAX_DEPENDENCIES = 100;
const MAX_TIMEOUT = 3600000;
const MIN_TIMEOUT = 1000;
const DEFAULT_MAX_RETRIES = 3;
const MAX_MAX_RETRIES = 10;

function validateTaskName(name: unknown): asserts name is string {
  if (typeof name !== 'string') {
    throw new Error('Task name must be a string');
  }
  if (name.trim().length < MIN_TASK_NAME_LENGTH) {
    throw new Error(`Task name must be at least ${MIN_TASK_NAME_LENGTH} character`);
  }
  if (name.length > MAX_TASK_NAME_LENGTH) {
    throw new Error(`Task name must not exceed ${MAX_TASK_NAME_LENGTH} characters`);
  }
}

function validateDependencies(deps: unknown): asserts deps is string[] {
  if (!Array.isArray(deps)) {
    throw new Error('Task dependencies must be an array');
  }
  if (deps.length > MAX_DEPENDENCIES) {
    throw new Error(`Task dependencies must not exceed ${MAX_DEPENDENCIES}`);
  }
  for (const dep of deps) {
    if (typeof dep !== 'string') {
      throw new Error('Each dependency must be a string (task ID)');
    }
  }
}

function validateTimeout(timeout: unknown, fieldName: string): asserts timeout is number {
  if (typeof timeout !== 'number') {
    throw new Error(`${fieldName} must be a number`);
  }
  if (timeout < MIN_TIMEOUT || timeout > MAX_TIMEOUT) {
    throw new Error(`${fieldName} must be between ${MIN_TIMEOUT}ms and ${MAX_TIMEOUT}ms`);
  }
}

function validateMaxRetries(maxRetries: unknown): asserts maxRetries is number {
  if (typeof maxRetries !== 'number') {
    throw new Error('maxRetries must be a number');
  }
  if (maxRetries < 0 || maxRetries > MAX_MAX_RETRIES) {
    throw new Error(`maxRetries must be between 0 and ${MAX_MAX_RETRIES}`);
  }
}

function validatePriority(priority: unknown): void {
  const validPriorities = [0, 1, 2, 3];
  if (!validPriorities.includes(priority as number)) {
    throw new Error('Priority must be 0 (LOW), 1 (NORMAL), 2 (HIGH), or 3 (CRITICAL)');
  }
}

interface TaskMetadata {
  task: Task;
  retryCount: number;
  scheduledAt?: Date;
}

export interface QueueSchedulerConfig {
  schedulerConfig?: Partial<SchedulerConfig>;
  queueConfig?: TaskQueueConfig;
}

/**
 * QueueScheduler - Task Scheduler with BullMQ backend
 * Provides persistent task queue with retries, delays, and priority support
 */
export class QueueScheduler {
  private taskQueue: TaskQueue;
  private config: SchedulerConfig;
  private eventHandlers: SchedulerEventHandler[] = [];
  private taskMetadata: Map<string, TaskMetadata> = new Map();
  private taskExecutors: Map<string, (task: Task) => Promise<TaskResult>> = new Map();
  private isInitialized: boolean = false;

  constructor(config: QueueSchedulerConfig = {}) {
    // Validate config
    if (config.schedulerConfig?.maxConcurrentTasks !== undefined) {
      if (typeof config.schedulerConfig.maxConcurrentTasks !== 'number' || 
          config.schedulerConfig.maxConcurrentTasks < 1) {
        throw new Error('maxConcurrentTasks must be a positive number');
      }
    }
    if (config.schedulerConfig?.taskTimeout !== undefined) {
      validateTimeout(config.schedulerConfig.taskTimeout, 'taskTimeout');
    }
    if (config.schedulerConfig?.retryDelay !== undefined) {
      validateTimeout(config.schedulerConfig.retryDelay, 'retryDelay');
    }

    this.config = {
      maxConcurrentTasks: config.schedulerConfig?.maxConcurrentTasks ?? 5,
      taskTimeout: config.schedulerConfig?.taskTimeout ?? 300000,
      retryDelay: config.schedulerConfig?.retryDelay ?? 5000,
      enableParallelExecution: config.schedulerConfig?.enableParallelExecution ?? true,
    };

    this.taskQueue = new TaskQueue(config.queueConfig);
  }

  /**
   * Initialize the scheduler
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.taskQueue.initialize();
    
    // Register default task processor
    this.taskQueue.registerProcessor('default', async (payload) => {
      const { taskId, agentId } = payload;
      const metadata = this.taskMetadata.get(taskId);
      
      if (!metadata) {
        throw new Error(`Task ${taskId} not found`);
      }

      const executor = this.taskExecutors.get(agentId);
      if (!executor) {
        throw new Error(`No executor registered for agent ${agentId}`);
      }

      return executor(metadata.task);
    });

    this.isInitialized = true;
  }

  /**
   * Add a task to the scheduler
   */
  addTask(task: Omit<Task, 'id' | 'status' | 'createdAt' | 'retries'>): string {
    validateTaskName(task.name);
    validateDependencies(task.dependencies);
    validatePriority(task.priority);
    validateMaxRetries(task.maxRetries ?? DEFAULT_MAX_RETRIES);

    const id = uuidv4();
    const newTask: Task = {
      ...task,
      id,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      retries: 0,
      maxRetries: task.maxRetries ?? DEFAULT_MAX_RETRIES,
    };

    this.taskMetadata.set(id, {
      task: newTask,
      retryCount: 0,
    });

    return id;
  }

  /**
   * Register a task executor
   */
  registerExecutor(agentId: string, executor: (task: Task) => Promise<TaskResult>): void {
    this.taskExecutors.set(agentId, executor);
  }

  /**
   * Schedule a task for execution
   */
  async scheduleTask(taskId: string, agentId: string): Promise<void> {
    const metadata = this.taskMetadata.get(taskId);
    if (!metadata) {
      throw new Error(`Task ${taskId} not found`);
    }

    const task = metadata.task;
    task.status = TaskStatus.RUNNING;
    task.startedAt = new Date();
    task.assignedAgent = agentId;

    this.emitEvent({
      type: 'task_started',
      taskId,
      timestamp: new Date(),
      data: { agentId },
    });

    try {
      // Add to queue
      await this.taskQueue.addTask(
        taskId,
        task.name,
        agentId,
        { taskId, agentId, payload: task },
        {
          priority: task.priority,
          timeout: this.config.taskTimeout,
          retries: task.maxRetries,
        }
      );
    } catch (error) {
      task.status = TaskStatus.FAILED;
      task.error = error instanceof Error ? error.message : String(error);
      
      this.emitEvent({
        type: 'task_failed',
        taskId,
        timestamp: new Date(),
        data: { retry: false, error: task.error },
      });
      
      throw error;
    }
  }

  /**
   * Schedule a delayed task
   */
  async scheduleDelayedTask(taskId: string, agentId: string, delayMs: number): Promise<void> {
    const metadata = this.taskMetadata.get(taskId);
    if (!metadata) {
      throw new Error(`Task ${taskId} not found`);
    }

    const task = metadata.task;
    metadata.scheduledAt = new Date(Date.now() + delayMs);

    await this.taskQueue.addDelayedTask(
      taskId,
      task.name,
      agentId,
      { taskId, agentId, payload: task },
      delayMs,
      {
        priority: task.priority,
        timeout: this.config.taskTimeout,
        retries: task.maxRetries,
      }
    );

    this.emitEvent({
      type: 'task_retry_scheduled',
      taskId,
      timestamp: new Date(),
      data: { delay: delayMs },
    });
  }

  /**
   * Get scheduler status
   */
  async getStatus(): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    blocked: number;
    queueStats: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
  }> {
    let pending = 0,
      running = 0,
      completed = 0,
      failed = 0,
      blocked = 0;

    for (const metadata of this.taskMetadata.values()) {
      switch (metadata.task.status) {
        case TaskStatus.PENDING:
          pending++;
          break;
        case TaskStatus.RUNNING:
          running++;
          break;
        case TaskStatus.COMPLETED:
          completed++;
          break;
        case TaskStatus.FAILED:
          failed++;
          break;
        case TaskStatus.BLOCKED:
          blocked++;
          break;
      }
    }

    const queueStats = await this.taskQueue.getStats();

    return {
      total: this.taskMetadata.size,
      pending,
      running,
      completed,
      failed,
      blocked,
      queueStats,
    };
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.taskMetadata.values()).map((m) => m.task);
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.taskMetadata.get(taskId)?.task;
  }

  /**
   * Subscribe to events
   */
  onEvent(handler: SchedulerEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Emit event
   */
  private emitEvent(event: SchedulerEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    }
  }

  /**
   * Check if all tasks are complete
   */
  isComplete(): boolean {
    if (this.taskMetadata.size === 0) return false;
    
    return Array.from(this.taskMetadata.values()).every(
      (m) => m.task.status === TaskStatus.COMPLETED || m.task.status === TaskStatus.FAILED
    );
  }

  /**
   * Get queue health status
   */
  async isHealthy(): Promise<boolean> {
    return this.taskQueue.isHealthy();
  }

  /**
   * Close the scheduler
   */
  async close(): Promise<void> {
    await this.taskQueue.close();
  }
}

export default QueueScheduler;
