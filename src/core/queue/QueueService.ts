import { Queue, Worker, JobsOptions } from 'bullmq';

// Queue names
export const QUEUE_NAMES = {
  TASK_QUEUE: 'aidos:tasks',
  SCHEDULER_QUEUE: 'aidos:scheduler',
} as const;

// Redis connection options
export interface RedisConnectionOptions {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
}

const DEFAULT_REDIS_OPTIONS: RedisConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
};

/**
 * QueueService - Manages BullMQ queues and connections
 */
export class QueueService {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private connectionOptions: RedisConnectionOptions;

  constructor(options: RedisConnectionOptions = DEFAULT_REDIS_OPTIONS) {
    this.connectionOptions = { ...DEFAULT_REDIS_OPTIONS, ...options };
  }

  /**
   * Get connection options for BullMQ
   */
  private getConnectionConfig() {
    return {
      ...this.connectionOptions,
      maxRetriesPerRequest: 3,
    };
  }

  /**
   * Get or create a queue
   */
  getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.getConnectionConfig(),
        defaultJobOptions: {
          removeOnComplete: {
            count: 1000,
            age: 24 * 3600, // 24 hours
          },
          removeOnFail: {
            count: 5000,
            age: 7 * 24 * 3600, // 7 days
          },
        },
      });
      this.queues.set(name, queue);
    }
    return this.queues.get(name)!;
  }

  /**
   * Create a worker to process jobs
   */
  createWorker<T = any>(
    name: string,
    processor: (job: any) => Promise<T>,
    options?: { concurrency?: number }
  ): Worker<T> {
    const worker = new Worker<T>(name, processor, {
      connection: this.getConnectionConfig(),
      concurrency: options?.concurrency || 1,
    });

    this.workers.set(name, worker);
    return worker;
  }

  /**
   * Add a job to a queue
   */
  async addJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobsOptions
  ): Promise<string> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(jobName, data, options);
    return job.id as string;
  }

  /**
   * Add a delayed job
   */
  async addDelayedJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    delay: number,
    options?: JobsOptions
  ): Promise<string> {
    return this.addJob(queueName, jobName, data, {
      delay,
      ...options,
    });
  }

  /**
   * Add a job with retry
   */
  async addJobWithRetry<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    attempts: number = 3,
    backoff?: { type: 'exponential' | 'fixed'; delay: number }
  ): Promise<string> {
    return this.addJob(queueName, jobName, data, {
      attempts,
      backoff: backoff || {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  /**
   * Get job counts for a queue
   */
  async getJobCounts(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getQueue(queueName);
    const counts = await queue.getJobCounts();
    return counts as unknown as {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
  }

  /**
   * Clean up all queues and connections
   */
  async close(): Promise<void> {
    // Close all workers
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    this.workers.clear();

    // Close all queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.queues.clear();
  }

  /**
   * Check if Redis is connected (ping)
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Create a temporary connection to check health
      const { Redis } = require('ioredis');
      const testRedis = new Redis(this.getConnectionConfig());
      const result = await testRedis.ping();
      await testRedis.quit();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

export default QueueService;
