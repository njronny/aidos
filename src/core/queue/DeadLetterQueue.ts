import { Queue } from 'bullmq';
import { QueueService, QUEUE_NAMES, RedisConnectionOptions } from './QueueService';

// Dead letter queue entry
export interface DLQEntry<T = any> {
  id: string;
  originalQueue: string;
  originalJobId: string;
  jobName: string;
  data: T;
  error: string;
  failedAt: Date;
  retryCount: number;
  maxRetries: number;
  manualInterventionRequired: boolean;
  resolution?: DLQResolution;
}

// DLQ resolution types
export type DLQResolution =
  | { action: 'retry'; delay?: number }
  | { action: 'discard' }
  | { action: 'requeue'; queue?: string };

// DLQ configuration
export interface DLQConfig {
  redisOptions?: RedisConnectionOptions;
  maxRetries?: number;
  manualInterventionThreshold?: number;
}

// DLQ stats
export interface DLQStats {
  totalEntries: number;
  pendingManualIntervention: number;
  resolvedToday: number;
  oldestEntryAge: number; // milliseconds
}

/**
 * DeadLetterQueue - Handles failed tasks that exceed retry limits
 * Supports manual intervention and automated retry/discard
 */
export class DeadLetterQueue {
  private queueService: QueueService;
  private dlqQueue: Queue;
  private config: Required<DLQConfig>;

  private static readonly DLQ_QUEUE_NAME = 'aidos:dlq';

  private static readonly DEFAULT_CONFIG: Required<DLQConfig> = {
    redisOptions: {},
    maxRetries: 3,
    manualInterventionThreshold: 3, // After 3 failures, require manual intervention
  };

  constructor(config: DLQConfig = {}) {
    this.config = { ...DeadLetterQueue.DEFAULT_CONFIG, ...config } as Required<DLQConfig>;
    this.queueService = new QueueService(this.config.redisOptions);
    this.dlqQueue = this.queueService.getQueue(DeadLetterQueue.DLQ_QUEUE_NAME);
  }

  /**
   * Add a failed job to the dead letter queue
   */
  async addEntry<T = any>(
    originalQueue: string,
    originalJobId: string,
    jobName: string,
    data: T,
    error: string,
    retryCount: number
  ): Promise<string> {
    const manualInterventionRequired = retryCount >= this.config.manualInterventionThreshold;

    const entry: DLQEntry<T> = {
      id: `${originalJobId}-${Date.now()}`,
      originalQueue,
      originalJobId,
      jobName,
      data,
      error,
      failedAt: new Date(),
      retryCount,
      maxRetries: this.config.maxRetries,
      manualInterventionRequired,
    };

    const job = await this.dlqQueue.add('dlq-entry', entry, {
      jobId: entry.id,
    });

    return job.id as string;
  }

  /**
   * Get all entries in the DLQ
   */
  async getEntries(limit: number = 100, start: number = 0): Promise<DLQEntry[]> {
    const jobs = await this.dlqQueue.getJobs();
    return jobs.slice(start, start + limit).map(job => job.data as DLQEntry);
  }

  /**
   * Get entries that require manual intervention
   */
  async getEntriesRequiringIntervention(limit: number = 100): Promise<DLQEntry[]> {
    const entries = await this.getEntries(limit);
    return entries.filter(entry => entry.manualInterventionRequired);
  }

  /**
   * Resolve a DLQ entry by retrying, discarding, or requeueing
   */
  async resolveEntry(entryId: string, resolution: DLQResolution): Promise<boolean> {
    const jobs = await this.dlqQueue.getJobs();
    const entryJob = jobs.find(job => job.id === entryId);

    if (!entryJob) {
      return false;
    }

    const entry = entryJob.data as DLQEntry;

    switch (resolution.action) {
      case 'retry':
        // Re-add to original queue with optional delay
        const originalQueue = this.queueService.getQueue(entry.originalQueue);
        await originalQueue.add(entry.jobName, entry.data, {
          delay: resolution.delay || 0,
          attempts: 1, // Single retry attempt
        });
        break;

      case 'requeue':
        // Re-add to specified queue (or original)
        const targetQueue = this.queueService.getQueue(
          resolution.queue || entry.originalQueue
        );
        await targetQueue.add(entry.jobName, entry.data);
        break;

      case 'discard':
        // Do nothing, entry stays in DLQ as resolved
        break;
    }

    // Remove from DLQ after resolution
    await entryJob.remove();

    return true;
  }

  /**
   * Retry all entries that haven't exceeded manual intervention threshold
   */
  async retryAllAutoRetryable(): Promise<number> {
    const entries = await this.getEntries();
    let retriedCount = 0;

    for (const entry of entries) {
      if (!entry.manualInterventionRequired) {
        const success = await this.resolveEntry(entry.id, { action: 'retry' });
        if (success) retriedCount++;
      }
    }

    return retriedCount;
  }

  /**
   * Get DLQ statistics
   */
  async getStats(): Promise<DLQStats> {
    const jobs = await this.dlqQueue.getJobs();
    const entries = jobs.map(job => job.data as DLQEntry);

    const pendingManualIntervention = entries.filter(
      e => e.manualInterventionRequired && !e.resolution
    ).length;

    const oldestEntry = entries.length > 0
      ? entries.reduce((oldest, entry) =>
          entry.failedAt < oldest.failedAt ? entry : oldest
        )
      : null;

    return {
      totalEntries: entries.length,
      pendingManualIntervention,
      resolvedToday: 0, // Would need to track this separately
      oldestEntryAge: oldestEntry
        ? Date.now() - oldestEntry.failedAt.getTime()
        : 0,
    };
  }

  /**
   * Check DLQ health
   */
  async isHealthy(): Promise<boolean> {
    const stats = await this.getStats();
    // Warning if too many entries or oldest entry is too old
    return stats.totalEntries < 1000 && stats.oldestEntryAge < 7 * 24 * 60 * 60 * 1000;
  }

  /**
   * Clear all entries from DLQ (use with caution)
   */
  async clear(): Promise<void> {
    const jobs = await this.dlqQueue.getJobs();
    await Promise.all(jobs.map(job => job.remove()));
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.queueService.close();
  }
}

export default DeadLetterQueue;
