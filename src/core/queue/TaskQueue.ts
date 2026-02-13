import {
  QueueService,
  QUEUE_NAMES,
  RedisConnectionOptions,
} from './QueueService';
import { DeadLetterQueue, DLQEntry, DLQStats } from './DeadLetterQueue';
import { IdempotencyService, IdempotencyCheckResult } from './IdempotencyService';
import { QueueMonitor, QueueHealthReport, QueueMetrics } from './QueueMonitor';
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
  idempotencyKey?: string;
}

// Task job result
export interface TaskJobResult {
  success: boolean;
  taskId: string;
  result?: TaskResult;
  error?: string;
  retryCount?: number;
}

// Queue configuration
export interface TaskQueueConfig {
  redisOptions?: RedisConnectionOptions;
  concurrency?: number;
  defaultTimeout?: number;
  defaultRetries?: number;
  enableDLQ?: boolean;
  enableIdempotency?: boolean;
  enableMonitoring?: boolean;
  dlqMaxRetries?: number;
  idempotencyTTL?: number;
  monitorIntervalMs?: number;
}

const DEFAULT_CONFIG: Required<TaskQueueConfig> = {
  redisOptions: {},
  concurrency: 5,
  defaultTimeout: 300000, // 5 minutes
  defaultRetries: 3,
  enableDLQ: true,
  enableIdempotency: true,
  enableMonitoring: true,
  dlqMaxRetries: 3,
  idempotencyTTL: 7 * 24 * 60 * 60, // 7 days
  monitorIntervalMs: 60000, // 1 minute
};

/**
 * TaskQueue - High-level task queue interface for AIDOS
 * Wraps BullMQ to provide task scheduling with priorities, delays, retries,
 * dead letter queue, idempotency, and monitoring
 */
export class TaskQueue {
  private queueService: QueueService;
  private dlq?: DeadLetterQueue;
  private idempotency?: IdempotencyService;
  private monitor?: QueueMonitor;
  private config: Required<TaskQueueConfig>;
  private taskProcessors: Map<string, (payload: any) => Promise<TaskResult>> =
    new Map();
  private initialized: boolean = false;

  constructor(config: TaskQueueConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<TaskQueueConfig>;
    this.queueService = new QueueService(this.config.redisOptions);

    // Initialize optional components
    if (this.config.enableDLQ) {
      this.dlq = new DeadLetterQueue({
        redisOptions: this.config.redisOptions,
        maxRetries: this.config.dlqMaxRetries,
      });
    }

    if (this.config.enableIdempotency) {
      this.idempotency = new IdempotencyService({
        redisOptions: this.config.redisOptions,
        ttlSeconds: this.config.idempotencyTTL,
      });
    }

    if (this.config.enableMonitoring) {
      this.monitor = new QueueMonitor({
        redisOptions: this.config.redisOptions,
        checkIntervalMs: this.config.monitorIntervalMs,
      });
    }
  }

  /**
   * Initialize the task queue and workers
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create worker for processing tasks with DLQ handling
    this.queueService.createWorker(
      QUEUE_NAMES.TASK_QUEUE,
      async (job) => {
        return this.processTask(job.data as TaskJobData, job.attemptsMade || 0);
      },
      { concurrency: this.config.concurrency }
    );

    this.initialized = true;
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
   * Check idempotency before processing
   */
  private async checkIdempotency(data: TaskJobData): Promise<IdempotencyCheckResult | null> {
    if (!this.idempotency || !data.idempotencyKey) {
      return null;
    }

    return this.idempotency.check(data.idempotencyKey);
  }

  /**
   * Process a task job with DLQ and idempotency support
   */
  private async processTask(data: TaskJobData, retryCount: number): Promise<TaskJobResult> {
    // Check idempotency first
    const idempotencyCheck = await this.checkIdempotency(data);
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.existingResult !== undefined) {
      return {
        success: true,
        taskId: data.taskId,
        result: idempotencyCheck.existingResult,
        error: undefined,
        retryCount,
      };
    }

    const processor = this.taskProcessors.get(data.agentId);

    if (!processor) {
      const error = `No processor registered for agent ${data.agentId}`;
      
      // Send to DLQ if enabled
      if (this.dlq) {
        await this.dlq.addEntry(
          QUEUE_NAMES.TASK_QUEUE,
          data.taskId,
          data.taskName,
          data,
          error,
          retryCount
        );
      }

      return {
        success: false,
        taskId: data.taskId,
        error,
        retryCount,
      };
    }

    try {
      const result = await processor(data.payload);

      // Store result for idempotency
      if (this.idempotency && data.idempotencyKey) {
        await this.idempotency.storeResult(data.idempotencyKey, result);
      }

      return {
        success: true,
        taskId: data.taskId,
        result,
        retryCount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if we should send to DLQ (after all retries exhausted)
      const isLastAttempt = retryCount >= (data.retries || this.config.defaultRetries) - 1;
      
      if (isLastAttempt && this.dlq) {
        await this.dlq.addEntry(
          QUEUE_NAMES.TASK_QUEUE,
          data.taskId,
          data.taskName,
          data,
          errorMessage,
          retryCount + 1
        );
      }

      return {
        success: false,
        taskId: data.taskId,
        error: errorMessage,
        retryCount,
      };
    }
  }

  /**
   * Add a task to the queue with optional idempotency
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
      idempotencyKey?: string;
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
      idempotencyKey: options?.idempotencyKey,
    };

    // Check idempotency before adding to queue
    if (this.idempotency && jobData.idempotencyKey) {
      const check = await this.idempotency.check(jobData.idempotencyKey);
      if (check.isDuplicate && check.existingResult !== undefined) {
        // Return existing result indicator (use taskId as job id)
        return `cached:${taskId}`;
      }
    }

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
      idempotencyKey?: string;
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
      idempotencyKey: options?.idempotencyKey,
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
  async getStats(): Promise<QueueMetrics> {
    return this.queueService.getJobCounts(QUEUE_NAMES.TASK_QUEUE);
  }

  /**
   * Get DLQ statistics
   */
  async getDLQStats(): Promise<DLQStats | null> {
    if (!this.dlq) return null;
    return this.dlq.getStats();
  }

  /**
   * Get DLQ entries
   */
  async getDLQEntries(limit?: number): Promise<DLQEntry[]> {
    if (!this.dlq) return [];
    return this.dlq.getEntries(limit);
  }

  /**
   * Resolve a DLQ entry
   */
  async resolveDLQEntry(
    entryId: string,
    action: 'retry' | 'discard' | 'requeue',
    options?: { delay?: number; queue?: string }
  ): Promise<boolean> {
    if (!this.dlq) return false;
    
    const resolution = { 
      action, 
      ...(options?.delay !== undefined && { delay: options.delay }),
      ...(options?.queue && { queue: options.queue }),
    };
    
    return this.dlq.resolveEntry(entryId, resolution);
  }

  /**
   * Retry all auto-retryable DLQ entries
   */
  async retryAutoRetryableDLQ(): Promise<number> {
    if (!this.dlq) return 0;
    return this.dlq.retryAllAutoRetryable();
  }

  /**
   * Get queue health report
   */
  async getHealthReport(): Promise<QueueHealthReport | null> {
    if (!this.monitor) return null;
    return this.monitor.checkHealth();
  }

  /**
   * Get queue backlog
   */
  async getBacklog(): Promise<{ taskQueue: number; schedulerQueue: number; total: number } | null> {
    if (!this.monitor) return null;
    return this.monitor.getBacklog();
  }

  /**
   * Invalidate idempotency key
   */
  async invalidateIdempotency(key: string): Promise<void> {
    if (this.idempotency) {
      await this.idempotency.invalidate(key);
    }
  }

  /**
   * Execute task with idempotency protection
   */
  async executeIdempotent<T>(
    taskName: string,
    payload: any,
    executor: () => Promise<T>
  ): Promise<{ result: T; isCached: boolean }> {
    if (!this.idempotency) {
      const result = await executor();
      return { result, isCached: false };
    }
    return this.idempotency.executeIdempotent(taskName, payload, executor);
  }

  /**
   * Check if queue is healthy
   */
  async isHealthy(): Promise<boolean> {
    const queueHealthy = await this.queueService.isHealthy();
    if (!queueHealthy) return false;
    
    if (this.monitor) {
      return this.monitor.isHealthy();
    }
    
    return true;
  }

  /**
   * Start monitoring with callback
   */
  startMonitoring(onAlert?: (report: QueueHealthReport) => void): void {
    if (this.monitor) {
      this.monitor.startMonitoring(onAlert);
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitor) {
      this.monitor.stopMonitoring();
    }
  }

  /**
   * Close the queue and cleanup resources
   */
  async close(): Promise<void> {
    this.stopMonitoring();
    await this.queueService.close();
    if (this.dlq) await this.dlq.close();
    if (this.idempotency) await this.idempotency.close();
  }

  /**
   * Get the underlying queue service (for advanced usage)
   */
  getQueueService(): QueueService {
    return this.queueService;
  }

  /**
   * Get DLQ instance (for advanced usage)
   */
  getDLQ(): DeadLetterQueue | undefined {
    return this.dlq;
  }

  /**
   * Get IdempotencyService instance (for advanced usage)
   */
  getIdempotencyService(): IdempotencyService | undefined {
    return this.idempotency;
  }

  /**
   * Get QueueMonitor instance (for advanced usage)
   */
  getMonitor(): QueueMonitor | undefined {
    return this.monitor;
  }
}

export default TaskQueue;
