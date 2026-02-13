import { TaskScheduler } from './TaskScheduler';
import { DeadLetterQueue, DLQEntry, DLQResolution } from '../queue/DeadLetterQueue';
import { Task, TaskStatus, TaskPriority } from '../../types';

/**
 * TaskTimeoutManager configuration
 */
export interface TaskTimeoutManagerConfig {
  /** How often to check for timed out tasks (ms) */
  checkIntervalMs?: number;
  /** Default timeout for tasks (ms) */
  taskTimeoutMs?: number;
  /** Maximum number of retries before moving to DLQ */
  maxRetries?: number;
  /** Whether to enable DLQ integration */
  enableDLQ?: boolean;
  /** Callback when a task times out */
  onTimeout?: (task: Task, action: TimeoutAction) => void;
  /** Callback when a task is moved to DLQ */
  onDLQ?: (task: Task) => void;
  /** Callback when dependency failure is detected */
  onDependencyFailed?: (task: Task, failedDependency: Task) => void;
  /** Callback on each check cycle */
  onCheck?: (status: TimeoutCheckStatus) => void;
}

/**
 * Action taken when a task times out
 */
export type TimeoutAction = 'retry' | 'dlq' | 'cancel';

/**
 * Status of a timeout check cycle
 */
export interface TimeoutCheckStatus {
  timestamp: Date;
  runningTasks: number;
  timedOutTasks: number;
  totalTasks: number;
}

/**
 * Timeout statistics
 */
export interface TimeoutStats {
  checkCount: number;
  lastCheckTime: Date | null;
  timeoutsDetected: number;
  tasksRetried: number;
  tasksMovedToDLQ: number;
  tasksCancelled: number;
}

/**
 * TaskTimeoutManager - Handles task timeout automatically
 * Monitors running tasks for timeout and takes appropriate action:
 * - Retry the task if retries remaining
 * - Move to DLQ if max retries exceeded
 * - Cancel the task if configured
 */
export class TaskTimeoutManager {
  private scheduler: TaskScheduler;
  private dlq: DeadLetterQueue | null;
  private config: Required<TaskTimeoutManagerConfig>;
  private intervalId: NodeJS.Timeout | null = null;
  private running: boolean = false;

  // Statistics
  private checkCount: number = 0;
  private lastCheckTime: Date | null = null;
  private timeoutsDetected: number = 0;
  private tasksRetried: number = 0;
  private tasksMovedToDLQ: number = 0;
  private tasksCancelled: number = 0;

  // Track tasks that have been handled for timeout
  private timedOutTaskIds: Set<string> = new Set();

  private static readonly DEFAULT_CHECK_INTERVAL = 1000; // 1 second
  private static readonly DEFAULT_TASK_TIMEOUT = 300000; // 5 minutes
  private static readonly DEFAULT_MAX_RETRIES = 3;

  /**
   * Create a new TaskTimeoutManager
   * @param scheduler The TaskScheduler to monitor
   * @param dlq Optional DeadLetterQueue for failed tasks
   * @param config Configuration options
   */
  constructor(
    scheduler: TaskScheduler, 
    dlq: DeadLetterQueue | null, 
    config: TaskTimeoutManagerConfig = {}
  ) {
    if (!scheduler) {
      throw new Error('Scheduler is required');
    }

    // Validate and set config with defaults
    const checkIntervalMs = config.checkIntervalMs ?? TaskTimeoutManager.DEFAULT_CHECK_INTERVAL;
    const taskTimeoutMs = config.taskTimeoutMs ?? TaskTimeoutManager.DEFAULT_TASK_TIMEOUT;
    const maxRetries = config.maxRetries ?? TaskTimeoutManager.DEFAULT_MAX_RETRIES;

    // Ensure values are positive
    this.config = {
      checkIntervalMs: checkIntervalMs > 0 ? checkIntervalMs : TaskTimeoutManager.DEFAULT_CHECK_INTERVAL,
      taskTimeoutMs: taskTimeoutMs > 0 ? taskTimeoutMs : TaskTimeoutManager.DEFAULT_TASK_TIMEOUT,
      maxRetries: maxRetries > 0 ? maxRetries : TaskTimeoutManager.DEFAULT_MAX_RETRIES,
      enableDLQ: config.enableDLQ ?? true,
      onTimeout: config.onTimeout ?? (() => {}),
      onDLQ: config.onDLQ ?? (() => {}),
      onDependencyFailed: config.onDependencyFailed ?? (() => {}),
      onCheck: config.onCheck ?? (() => {}),
    };

    this.scheduler = scheduler;
    this.dlq = dlq;
  }

  /**
   * Start the timeout manager
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
   * Stop the timeout manager
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
   * Check if the timeout manager is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get tasks that have timed out
   */
  getTimedOutTasks(): Task[] {
    const now = Date.now();
    const allTasks = this.scheduler.getAllTasks();
    const timedOutTasks: Task[] = [];

    for (const task of allTasks) {
      if (task.status === TaskStatus.RUNNING && task.startedAt) {
        const runTime = now - task.startedAt.getTime();
        if (runTime > this.config.taskTimeoutMs) {
          timedOutTasks.push(task);
        }
      }
    }

    return timedOutTasks;
  }

  /**
   * Perform a check cycle
   */
  private check(): void {
    this.checkCount++;
    this.lastCheckTime = new Date();

    const timedOutTasks = this.getTimedOutTasks();
    
    // Handle dependency failures
    this.checkDependencyFailures();

    // Process timed out tasks
    for (const task of timedOutTasks) {
      this.handleTimeout(task);
    }

    // Call the onCheck callback
    const status = this.scheduler.getStatus();
    const checkStatus: TimeoutCheckStatus = {
      timestamp: this.lastCheckTime,
      runningTasks: status.running,
      timedOutTasks: timedOutTasks.length,
      totalTasks: status.total,
    };

    this.config.onCheck(checkStatus);
  }

  /**
   * Check for tasks with failed dependencies
   */
  private checkDependencyFailures(): void {
    const allTasks = this.scheduler.getAllTasks();
    
    for (const task of allTasks) {
      if (task.status === TaskStatus.PENDING || task.status === TaskStatus.BLOCKED) {
        // Check if any dependency has failed
        for (const depId of task.dependencies) {
          const depTask = this.scheduler.getTask(depId);
          if (depTask && depTask.status === TaskStatus.FAILED) {
            // Notify about dependency failure
            this.config.onDependencyFailed(task, depTask);
          }
        }
      }
    }
  }

  /**
   * Handle a timed out task
   * @param task The task that timed out
   */
  private async handleTimeout(task: Task): Promise<void> {
    // Skip if already handled
    if (this.timedOutTaskIds.has(task.id)) {
      return;
    }

    this.timeoutsDetected++;
    this.timedOutTaskIds.add(task.id);

    const canRetry = task.retries < task.maxRetries;

    if (canRetry) {
      // Retry the task
      await this.retryTask(task);
      this.tasksRetried++;
      this.config.onTimeout(task, 'retry');
    } else if (this.config.enableDLQ && this.dlq) {
      // Move to DLQ
      await this.moveToDLQ(task);
      this.tasksMovedToDLQ++;
      this.config.onTimeout(task, 'dlq');
    } else {
      // Cancel the task
      this.cancelTask(task);
      this.tasksCancelled++;
      this.config.onTimeout(task, 'cancel');
    }
  }

  /**
   * Retry a timed out task
   * @param task The task to retry
   */
  private async retryTask(task: Task): Promise<void> {
    // Update task for retry
    task.status = TaskStatus.PENDING;
    task.retries++;
    task.error = `Task timed out after ${this.config.taskTimeoutMs}ms`;
    
    // The scheduler's executeTask method will handle the actual retry
    // when the task is picked up again
  }

  /**
   * Move a task to the dead letter queue
   * @param task The task to move to DLQ
   */
  private async moveToDLQ(task: Task): Promise<void> {
    if (!this.dlq) {
      return;
    }

    try {
      await this.dlq.addEntry(
        'scheduler',
        task.id,
        task.name,
        {
          description: task.description,
          priority: task.priority,
          dependencies: task.dependencies,
        },
        task.error || `Task timed out after ${this.config.taskTimeoutMs}ms`,
        task.retries
      );

      task.status = TaskStatus.FAILED;
      this.config.onDLQ(task);
    } catch (error) {
      console.error('Failed to move task to DLQ:', error);
    }
  }

  /**
   * Cancel a timed out task
   * @param task The task to cancel
   */
  private cancelTask(task: Task): void {
    task.status = TaskStatus.FAILED;
    task.error = `Task cancelled due to timeout after ${this.config.taskTimeoutMs}ms`;
  }

  /**
   * Manually trigger a check cycle (useful for testing)
   */
  triggerCheck(): void {
    this.check();
  }

  /**
   * Get the timeout statistics
   */
  getStats(): TimeoutStats {
    return {
      checkCount: this.checkCount,
      lastCheckTime: this.lastCheckTime,
      timeoutsDetected: this.timeoutsDetected,
      tasksRetried: this.tasksRetried,
      tasksMovedToDLQ: this.tasksMovedToDLQ,
      tasksCancelled: this.tasksCancelled,
    };
  }

  /**
   * Reset statistics and tracked timeouts
   */
  resetStats(): void {
    this.checkCount = 0;
    this.lastCheckTime = null;
    this.timeoutsDetected = 0;
    this.tasksRetried = 0;
    this.tasksMovedToDLQ = 0;
    this.tasksCancelled = 0;
    this.timedOutTaskIds.clear();
  }

  /**
   * Get the monitored scheduler instance
   */
  getScheduler(): TaskScheduler {
    return this.scheduler;
  }
}

export default TaskTimeoutManager;
