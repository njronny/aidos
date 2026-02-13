// Task status enum
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked'
}

// Task priority levels
export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

// Task interface
export interface Task {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies: string[]; // Task IDs this task depends on
  assignedAgent?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: TaskResult;
  error?: string;
  retries: number;
  maxRetries: number;
}

// Task result
export interface TaskResult {
  success: boolean;
  output?: string;
  artifacts?: string[];
  duration?: number;
}

// Task DAG for dependency management
export interface TaskDAG {
  tasks: Map<string, Task>;
  adjacencyList: Map<string, string[]>;
  reverseAdjacencyList: Map<string, string[]>;
}

// Scheduler configuration
export interface SchedulerConfig {
  maxConcurrentTasks: number;
  taskTimeout: number; // milliseconds
  retryDelay: number; // milliseconds
  enableParallelExecution: boolean;
}

// Scheduler events
export interface SchedulerEvent {
  type: 'task_started' | 'task_completed' | 'task_failed' | 'task_blocked' | 'scheduler_idle';
  taskId?: string;
  timestamp: Date;
  data?: unknown;
}

// Scheduler event handler type
export type SchedulerEventHandler = (event: SchedulerEvent) => void;
