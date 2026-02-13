import {
  QueueService,
  QUEUE_NAMES,
  RedisConnectionOptions,
} from './QueueService';
import { Task, TaskStatus, TaskPriority, TaskResult } from '../../types';

// Task job data structure
export interface TaskJobData {
  taskId: string;
  taskName: string;
  agentId: string;
  payload: any;
  priority: TaskPriority;
  timeout?: number;
  retries?: number;
}

// Task job result
export interface TaskJobResult {
  success: boolean;
  taskId: string;
  result?: TaskResult;
  error?: string;
}

// Queue configuration
export interface TaskQueueConfig {
  redisOptions?: RedisConnectionOptions;
  concurrency?: number;
  defaultTimeout?: number;
  defaultRetries?: number;
}

const DEFAULT_CONFIG: Required<TaskQueueConfig> = {
  redisOptions: {},
  concurrency: 5,
  defaultTimeout: 300000, // 5 minutes
  defaultRetries: 3,
};

/**
 * TaskQueue - High-level task queue interface for AIDOS
 * Wraps BullMQ to provide task scheduling with priorities, delays, and retries
 */
export class TaskQueue {
  private queueService: QueueService;
  private config: Required<TaskQueueConfig>;
  private taskProcessors: Map<string, (payload: any) => Promise<TaskResult>> =
    new Map();

  constructor(config: TaskQueueConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<TaskQueueConfig>;
    this.queueService = new QueueService(this.config.redisOptions);
  }

  /**
   * Initialize the task queue and workers
   */
  async initialize(): Promise<void> {
    // Create worker for processing tasks
    this.queueService.createWorker(
      QUEUE_NAMES.TASK_QUEUE,
      async (job) => {
        return this.processTask(job.data as TaskJobData);
      },
      { concurrency: this.config.concurrency }
    );
  }

  /**
   * Register a task processor for an agent
   */
  registerProcessor(
    agentId: string,
    processor: (payload: any) => Promise<TaskResult>
  ): void {
    this.taskProcessors.set(agentId, processor);
  }

  /**
   * Process a task job
   */
  private async processTask(data: TaskJobData): Promise<TaskJobResult> {
    const processor = this.taskProcessors.get(data.agentId);

    if (!processor) {
      return {
        success: false,
        taskId: data.taskId,
        error: `No processor registered for agent ${data.agentId}`,
      };
    }

    try {
      const result = await processor(data.payload);
      return {
        success: true,
        taskId: data.taskId,
        result,
      };
    } catch (error) {
      return {
        success: false,
        taskId: data.taskId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Add a task to the queue
   */
  async addTask(
    taskId: string,
    taskName: string,
    agentId: string,
    payload: any,
    options?: {
      priority?: TaskPriority;
      timeout?: number;
      retries?: number;
    }
  ): Promise<string> {
    const jobData: TaskJobData = {
      taskId,
      taskName,
      agentId,
      payload,
      priority: options?.priority || TaskPriority.NORMAL,
      timeout: options?.timeout || this.config.defaultTimeout,
      retries: options?.retries || this.config.defaultRetries,
    };

    // Map priority to BullMQ priority (1 = lowest, 10 = highest)
    const bullPriority = 10 - jobData.priority;

    return this.queueService.addJob(QUEUE_NAMES.TASK_QUEUE, taskName, jobData, {
      priority: bullPriority,
      attempts: jobData.retries,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  /**
   * Add a delayed task (will be processed after delay)
   */
  async addDelayedTask(
    taskId: string,
    taskName: string,
    agentId: string,
    payload: any,
    delayMs: number,
    options?: {
      priority?: TaskPriority;
      timeout?: number;
      retries?: number;
    }
  ): Promise<string> {
    const jobData: TaskJobData = {
      taskId,
      taskName,
      agentId,
      payload,
      priority: options?.priority || TaskPriority.NORMAL,
      timeout: options?.timeout || this.config.defaultTimeout,
      retries: options?.retries || this.config.defaultRetries,
    };

    const bullPriority = 10 - jobData.priority;

    return this.queueService.addDelayedJob(
      QUEUE_NAMES.TASK_QUEUE,
      taskName,
      jobData,
      delayMs,
      {
        priority: bullPriority,
        attempts: jobData.retries,
      }
    );
  }

  /**
   * Add a task with retry configuration
   */
  async addTaskWithRetry(
    taskId: string,
    taskName: string,
    agentId: string,
    payload: any,
    attempts: number = 3,
    backoffDelay: number = 1000
  ): Promise<string> {
    const jobData: TaskJobData = {
      taskId,
      taskName,
      agentId,
      payload,
      priority: TaskPriority.NORMAL,
      timeout: this.config.defaultTimeout,
      retries: attempts,
    };

    return this.queueService.addJobWithRetry(
      QUEUE_NAMES.TASK_QUEUE,
      taskName,
      jobData,
      attempts,
      {
        type: 'exponential',
        delay: backoffDelay,
      }
    );
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    return this.queueService.getJobCounts(QUEUE_NAMES.TASK_QUEUE);
  }

  /**
   * Check if queue is healthy
   */
  async isHealthy(): Promise<boolean> {
    return this.queueService.isHealthy();
  }

  /**
   * Close the queue and cleanup resources
   */
  async close(): Promise<void> {
    await this.queueService.close();
  }

  /**
   * Get the underlying queue service (for advanced usage)
   */
  getQueueService(): QueueService {
    return this.queueService;
  }
}

export default TaskQueue;
