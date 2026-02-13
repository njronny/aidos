import { v4 as uuidv4 } from 'uuid';
import {
  Task,
  TaskStatus,
  TaskDAG,
  TaskResult,
  SchedulerConfig,
  SchedulerEvent,
  SchedulerEventHandler
} from '../../types';

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

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks ?? 5,
      taskTimeout: config.taskTimeout ?? 300000, // 5 minutes
      retryDelay: config.retryDelay ?? 5000,
      enableParallelExecution: config.enableParallelExecution ?? true
    };

    this.dag = {
      tasks: new Map(),
      adjacencyList: new Map(), // task -> tasks that depend on it
      reverseAdjacencyList: new Map() // task -> tasks it depends on
    };
  }

  /**
   * Add a task to the scheduler
   */
  addTask(task: Omit<Task, 'id' | 'status' | 'createdAt' | 'retries'>): string {
    const id = uuidv4();
    const newTask: Task = {
      ...task,
      id,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      retries: 0
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
      const allDepsCompleted = deps.every(depId => this.completedTasks.has(depId));

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
    return deps.some(depId => this.failedTasks.has(depId));
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
      data: { agentId }
    });

    try {
      // Execute with timeout
      const result = await Promise.race([
        executor(task),
        this.createTimeout(this.config.taskTimeout)
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
        data: result
      });

      return result;
    } catch (error) {
      task.status = TaskStatus.FAILED;
      task.error = error instanceof Error ? error.message : String(error);
      this.runningTasks.delete(taskId);

      // Retry logic
      if (task.retries < task.maxRetries) {
        task.retries++;
        task.status = TaskStatus.PENDING;
        this.emitEvent({
          type: 'task_failed',
          taskId,
          timestamp: new Date(),
          data: { retry: true, attempt: task.retries }
        });
      } else {
        this.failedTasks.add(taskId);
        this.checkBlockedTasks();

        this.emitEvent({
          type: 'task_failed',
          taskId,
          timestamp: new Date(),
          data: { retry: false }
        });
      }

      throw error;
    }
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
          timestamp: new Date()
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
    let pending = 0, running = 0, completed = 0, failed = 0, blocked = 0;

    for (const task of this.dag.tasks.values()) {
      switch (task.status) {
        case TaskStatus.PENDING: pending++; break;
        case TaskStatus.RUNNING: running++; break;
        case TaskStatus.COMPLETED: completed++; break;
        case TaskStatus.FAILED: failed++; break;
        case TaskStatus.BLOCKED: blocked++; break;
      }
    }

    return {
      total: this.dag.tasks.size,
      pending,
      running,
      completed,
      failed,
      blocked
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
    return this.dag.tasks.size > 0 &&
      this.completedTasks.size + this.failedTasks.size === this.dag.tasks.size;
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
