import { TaskScheduler } from './TaskScheduler';
import { Task, TaskStatus, TaskPriority } from '../../types';

/**
 * SchedulerGuardian configuration
 */
export interface SchedulerGuardianConfig {
  /** How often to check for pending/stuck tasks (ms) */
  checkIntervalMs?: number;
  /** Maximum age a PENDING task can have before being flagged (ms) */
  maxPendingAgeMs?: number;
  /** Maximum age a RUNNING task can have before being considered stuck (ms) */
  maxRunningAgeMs?: number;
  /** Callback when a pending task exceeds max age */
  onPendingTimeout?: (task: Task) => void;
  /** Callback when a running task becomes stuck */
  onTaskStuck?: (task: Task) => void;
  /** Callback on each check cycle */
  onCheck?: (status: GuardianCheckStatus) => void;
  /** Callback when task timeout is detected */
  onTaskTimeout?: (task: Task) => void;
}

/**
 * Status of a guardian check cycle
 */
export interface GuardianCheckStatus {
  timestamp: Date;
  pendingTasks: number;
  runningTasks: number;
  stuckTasks: number;
  totalTasks: number;
}

/**
 * Scheduler statistics
 */
export interface SchedulerStatus {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  blocked: number;
}

/**
 * Guardian statistics
 */
export interface GuardianStats {
  checkCount: number;
  lastCheckTime: Date | null;
  pendingTimeoutsDetected: number;
  stuckTasksDetected: number;
}

/**
 * SchedulerGuardian - Ensures tasks never miss
 * Monitors the scheduler for pending tasks that have been waiting too long
 * and running tasks that might be stuck
 */
export class SchedulerGuardian {
  private scheduler: TaskScheduler;
  private config: Required<SchedulerGuardianConfig>;
  private intervalId: NodeJS.Timeout | null = null;
  private running: boolean = false;
  
  // Statistics
  private checkCount: number = 0;
  private lastCheckTime: Date | null = null;
  private pendingTimeoutsDetected: number = 0;
  private stuckTasksDetected: number = 0;

  private static readonly DEFAULT_CHECK_INTERVAL = 5000; // 5 seconds
  private static readonly DEFAULT_MAX_PENDING_AGE = 60000; // 1 minute
  private static readonly DEFAULT_MAX_RUNNING_AGE = 300000; // 5 minutes

  /**
   * Create a new SchedulerGuardian
   * @param scheduler The TaskScheduler to monitor
   * @param config Configuration options
   */
  constructor(scheduler: TaskScheduler, config: SchedulerGuardianConfig = {}) {
    if (!scheduler) {
      throw new Error('Scheduler is required');
    }

    // Validate and set config with defaults
    const checkIntervalMs = config.checkIntervalMs ?? SchedulerGuardian.DEFAULT_CHECK_INTERVAL;
    const maxPendingAgeMs = config.maxPendingAgeMs ?? SchedulerGuardian.DEFAULT_MAX_PENDING_AGE;
    const maxRunningAgeMs = config.maxRunningAgeMs ?? SchedulerGuardian.DEFAULT_MAX_RUNNING_AGE;

    // Ensure values are positive
    this.config = {
      checkIntervalMs: checkIntervalMs > 0 ? checkIntervalMs : SchedulerGuardian.DEFAULT_CHECK_INTERVAL,
      maxPendingAgeMs: maxPendingAgeMs > 0 ? maxPendingAgeMs : SchedulerGuardian.DEFAULT_MAX_PENDING_AGE,
      maxRunningAgeMs: maxRunningAgeMs > 0 ? maxRunningAgeMs : SchedulerGuardian.DEFAULT_MAX_RUNNING_AGE,
      onPendingTimeout: config.onPendingTimeout ?? (() => {}),
      onTaskStuck: config.onTaskStuck ?? (() => {}),
      onCheck: config.onCheck ?? (() => {}),
      onTaskTimeout: config.onTaskTimeout ?? (() => {}),
    };

    this.scheduler = scheduler;
  }

  /**
   * Start the guardian monitoring
   */
  start(): void {
    if (this.running) {
      return; // Already running
    }

    this.running = true;
    this.intervalId = setInterval(() => {
      this.check();
    }, this.config.checkIntervalMs);

    // Perform initial check immediately
    this.check();
  }

  /**
   * Stop the guardian monitoring
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check if the guardian is currently running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Perform a check cycle
   */
  private check(): void {
    this.checkCount++;
    this.lastCheckTime = new Date();

    const now = Date.now();
    const allTasks = this.scheduler.getAllTasks();
    const status = this.scheduler.getStatus();

    let stuckTasksCount = 0;

    // Check for pending tasks that have been waiting too long
    for (const task of allTasks) {
      if (task.status === TaskStatus.PENDING) {
        const waitTime = now - task.createdAt.getTime();
        if (waitTime > this.config.maxPendingAgeMs) {
          this.pendingTimeoutsDetected++;
          this.config.onPendingTimeout(task);
          this.config.onTaskTimeout(task);
        }
      }

      // Check for running tasks that might be stuck
      if (task.status === TaskStatus.RUNNING && task.startedAt) {
        const runTime = now - task.startedAt.getTime();
        if (runTime > this.config.maxRunningAgeMs) {
          stuckTasksCount++;
          this.stuckTasksDetected++;
          this.config.onTaskStuck(task);
        }
      }
    }

    // Call the onCheck callback with status
    const checkStatus: GuardianCheckStatus = {
      timestamp: this.lastCheckTime,
      pendingTasks: status.pending,
      runningTasks: status.running,
      stuckTasks: stuckTasksCount,
      totalTasks: status.total,
    };

    this.config.onCheck(checkStatus);
  }

  /**
   * Get the guardian statistics
   */
  getStats(): GuardianStats {
    return {
      checkCount: this.checkCount,
      lastCheckTime: this.lastCheckTime,
      pendingTimeoutsDetected: this.pendingTimeoutsDetected,
      stuckTasksDetected: this.stuckTasksDetected,
    };
  }

  /**
   * Get the scheduler status
   */
  getSchedulerStatus(): SchedulerStatus {
    return this.scheduler.getStatus();
  }

  /**
   * Get the monitored scheduler instance
   */
  getScheduler(): TaskScheduler {
    return this.scheduler;
  }

  /**
   * Manually trigger a check cycle (useful for testing)
   */
  triggerCheck(): void {
    this.check();
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.checkCount = 0;
    this.lastCheckTime = null;
    this.pendingTimeoutsDetected = 0;
    this.stuckTasksDetected = 0;
  }
}

export default SchedulerGuardian;
