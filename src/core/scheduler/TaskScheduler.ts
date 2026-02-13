import { v4 as uuidv4 } from 'uuid';
import {
  Task,
  TaskStatus,
  TaskDAG,
  TaskResult,
  SchedulerConfig,
  SchedulerEvent,
  SchedulerEventHandler,
} from '../../types';

// Validation constants
const MIN_TASK_NAME_LENGTH = 1;
const MAX_TASK_NAME_LENGTH = 200;
const MAX_DEPENDENCIES = 100;
const MAX_TIMEOUT = 3600000; // 1 hour
const MIN_TIMEOUT = 1000; // 1 second
const DEFAULT_MAX_RETRIES = 3;
const MAX_MAX_RETRIES = 10;

/**
 * Input validation helpers
 */
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

/**
 * Task Scheduler - Core task scheduling engine
 * Handles task dependency resolution, parallel execution, and state management
 */
export class TaskScheduler {
  private dag: TaskDAG;
  private config: SchedulerConfig;
  private eventHandlers: SchedulerEventHandler[] = [];
  private runningTasks: Set<string> = new Set();
  private completedTasks: Set<string> = new Set();
  private failedTasks: Set<string> = new Set();
  private taskExecutors: Map<string, (task: Task) => Promise<TaskResult>> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<SchedulerConfig> = {}) {
    // Validate config
    if (config.maxConcurrentTasks !== undefined) {
      if (typeof config.maxConcurrentTasks !== 'number' || config.maxConcurrentTasks < 1) {
        throw new Error('maxConcurrentTasks must be a positive number');
      }
    }
    if (config.taskTimeout !== undefined) {
      validateTimeout(config.taskTimeout, 'taskTimeout');
    }
    if (config.retryDelay !== undefined) {
      validateTimeout(config.retryDelay, 'retryDelay');
    }

    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks ?? 5,
      taskTimeout: config.taskTimeout ?? 300000, // 5 minutes
      retryDelay: config.retryDelay ?? 5000,
      enableParallelExecution: config.enableParallelExecution ?? true,
    };

    this.dag = {
      tasks: new Map(),
      adjacencyList: new Map(), // task -> tasks that depend on it
      reverseAdjacencyList: new Map(), // task -> tasks it depends on
    };
  }

  /**
   * Add a task to the scheduler with input validation
   */
  addTask(task: Omit<Task, 'id' | 'status' | 'createdAt' | 'retries'>): string {
    // Validate task name
    validateTaskName(task.name);
    // Validate dependencies
    validateDependencies(task.dependencies);
    // Validate priority
    validatePriority(task.priority);
    // Validate maxRetries
    validateMaxRetries(task.maxRetries ?? DEFAULT_MAX_RETRIES);

    // Check that all dependency IDs exist
    for (const depId of task.dependencies) {
      if (!this.dag.tasks.has(depId)) {
        throw new Error(`Dependency task "${depId}" does not exist`);
      }
    }

    const id = uuidv4();
    const newTask: Task = {
      ...task,
      id,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      retries: 0,
      maxRetries: task.maxRetries ?? DEFAULT_MAX_RETRIES,
    };

    this.dag.tasks.set(id, newTask);
    this.updateDAG(id, task.dependencies);

    return id;
  }

  /**
   * Update DAG adjacency lists for dependency tracking
   */
  private updateDAG(taskId: string, dependencies: string[]): void {
    // Forward adjacency: this task -> tasks that depend on it
    if (!this.dag.adjacencyList.has(taskId)) {
      this.dag.adjacencyList.set(taskId, []);
    }

    // Reverse adjacency: dependencies -> this task
    this.dag.reverseAdjacencyList.set(taskId, dependencies);

    // Update dependents of each dependency
    for (const depId of dependencies) {
      if (!this.dag.adjacencyList.has(depId)) {
        this.dag.adjacencyList.set(depId, []);
      }
      this.dag.adjacencyList.get(depId)!.push(taskId);
    }
  }

  /**
   * Register a task executor function
   */
  registerExecutor(agentId: string, executor: (task: Task) => Promise<TaskResult>): void {
    this.taskExecutors.set(agentId, executor);
  }

  /**
   * Get all tasks that are ready to execute (dependencies met)
   */
  getRunnableTasks(): Task[] {
    const runnable: Task[] = [];

    for (const [id, task] of this.dag.tasks) {
      if (task.status !== TaskStatus.PENDING) continue;
      if (this.runningTasks.has(id)) continue;
      if (this.runningTasks.size >= this.config.maxConcurrentTasks) break;

      // Check if all dependencies are completed
      const deps = this.dag.reverseAdjacencyList.get(id) || [];
      const allDepsCompleted = deps.every((depId) => this.completedTasks.has(depId));

      if (allDepsCompleted) {
        runnable.push(task);
      }
    }

    // Sort by priority (highest first)
    runnable.sort((a, b) => b.priority - a.priority);

    return runnable;
  }

  /**
   * Check if a task is blocked (dependencies failed)
   */
  private isTaskBlocked(taskId: string): boolean {
    const deps = this.dag.reverseAdjacencyList.get(taskId) || [];
    return deps.some((depId) => this.failedTasks.has(depId));
  }

  /**
   * Execute a single task
   */
  async executeTask(taskId: string, agentId: string): Promise<TaskResult> {
    const task = this.dag.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const executor = this.taskExecutors.get(agentId);
    if (!executor) {
      throw new Error(`No executor registered for agent ${agentId}`);
    }

    // Update task status
    task.status = TaskStatus.RUNNING;
    task.startedAt = new Date();
    task.assignedAgent = agentId;
    this.runningTasks.add(taskId);

    this.emitEvent({
      type: 'task_started',
      taskId,
      timestamp: new Date(),
      data: { agentId },
    });

    try {
      // Execute with timeout
      const result = await Promise.race([
        executor(task),
        this.createTimeout(this.config.taskTimeout),
      ]);

      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date();
      task.result = result;
      this.completedTasks.add(taskId);
      this.runningTasks.delete(taskId);

      this.emitEvent({
        type: 'task_completed',
        taskId,
        timestamp: new Date(),
        data: result,
      });

      return result;
    } catch (error) {
      task.status = TaskStatus.FAILED;
      task.error = error instanceof Error ? error.message : String(error);
      this.runningTasks.delete(taskId);

      // Retry logic with exponential backoff delay
      if (task.retries < task.maxRetries) {
        task.retries++;
        const retryDelay = this.calculateRetryDelay(task.retries);
        
        // Schedule retry with delay
        const timeoutId = setTimeout(() => {
          task.status = TaskStatus.PENDING;
          this.retryTimeouts.delete(taskId);
          this.emitEvent({
            type: 'task_retry_scheduled',
            taskId,
            timestamp: new Date(),
            data: { attempt: task.retries, delay: retryDelay },
          });
        }, retryDelay);
        
        this.retryTimeouts.set(taskId, timeoutId);
        
        this.emitEvent({
          type: 'task_failed',
          taskId,
          timestamp: new Date(),
          data: { retry: true, attempt: task.retries, retryDelay },
        });
      } else {
        this.failedTasks.add(taskId);
        this.checkBlockedTasks();

        this.emitEvent({
          type: 'task_failed',
          taskId,
          timestamp: new Date(),
          data: { retry: false },
        });
      }

      throw error;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   * Formula: baseDelay * 2^(attempt-1) with jitter
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay;
    const maxDelay = 60000; // Cap at 1 minute
    const jitterFactor = 0.2; // 20% jitter
    
    // Exponential backoff: baseDelay * 2^(attempt-1)
    let delay = baseDelay * Math.pow(2, attempt - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = delay * jitterFactor * Math.random();
    delay = delay + jitter;
    
    // Cap at maxDelay
    return Math.min(delay, maxDelay);
  }

  /**
   * Cancel a scheduled retry
   */
  cancelRetry(taskId: string): boolean {
    const timeoutId = this.retryTimeouts.get(taskId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.retryTimeouts.delete(taskId);
      return true;
    }
    return false;
  }

  /**
   * Check and update blocked tasks
   */
  private checkBlockedTasks(): void {
    for (const [id, task] of this.dag.tasks) {
      if (task.status === TaskStatus.PENDING && this.isTaskBlocked(id)) {
        task.status = TaskStatus.BLOCKED;
        this.emitEvent({
          type: 'task_blocked',
          taskId: id,
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Task timed out after ${ms}ms`)), ms);
    });
  }

  /**
   * Subscribe to scheduler events
   */
  onEvent(handler: SchedulerEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Emit event to all handlers
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
   * Get scheduler status
   */
  getStatus(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    blocked: number;
  } {
    let pending = 0,
      running = 0,
      completed = 0,
      failed = 0,
      blocked = 0;

    for (const task of this.dag.tasks.values()) {
      switch (task.status) {
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

    return {
      total: this.dag.tasks.size,
      pending,
      running,
      completed,
      failed,
      blocked,
    };
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.dag.tasks.values());
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.dag.tasks.get(taskId);
  }

  /**
   * Check if all tasks are complete
   */
  isComplete(): boolean {
    return (
      this.dag.tasks.size > 0 &&
      this.completedTasks.size + this.failedTasks.size === this.dag.tasks.size
    );
  }

  /**
   * Get execution order (topological sort)
   */
  getExecutionOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (taskId: string) => {
      if (visited.has(taskId)) return;
      if (visiting.has(taskId)) return; // Cycle detected

      visiting.add(taskId);

      const deps = this.dag.reverseAdjacencyList.get(taskId) || [];
      for (const depId of deps) {
        visit(depId);
      }

      visiting.delete(taskId);
      visited.add(taskId);
      order.push(taskId);
    };

    for (const taskId of this.dag.tasks.keys()) {
      visit(taskId);
    }

    return order;
  }
}

export default TaskScheduler;
