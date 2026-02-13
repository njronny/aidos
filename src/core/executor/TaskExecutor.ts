import { v4 as uuidv4 } from 'uuid';
import { Task, TaskStatus, TaskResult, TaskPriority } from '../../types';
import { Notifier } from '../notifier/Notifier';

/**
 * Executor Types
 */
export enum ExecutorType {
  AGENT = 'agent',
  CODE_GENERATOR = 'code_generator',
  GIT_COMMIT = 'git_commit',
  SHELL = 'shell',
}

/**
 * Executor Task - 执行器任务
 */
export interface ExecutorTask {
  id: string;
  taskId: string;
  type: ExecutorType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
}

/**
 * Agent Result - 代理执行结果
 */
export interface AgentExecutionResult {
  agentId: string;
  agentName: string;
  success: boolean;
  output: string;
  artifacts?: string[];
  gitCommit?: {
    hash: string;
    message: string;
  };
  duration: number;
}

/**
 * Task Executor Configuration
 */
export interface TaskExecutorConfig {
  enableGitCommit: boolean;
  enableCodeGeneration: boolean;
  autoRetry: boolean;
  maxRetries: number;
  shellTimeout: number;
}

/**
 * Task Executor - 任务执行器
 * 检测到新任务后，自动spawn代理执行开发任务
 * 支持代码生成、Git提交
 */
export class TaskExecutor {
  private config: TaskExecutorConfig;
  private notifier: Notifier;
  private runningTasks: Map<string, ExecutorTask> = new Map();
  private completedTasks: Map<string, ExecutorTask> = new Map();
  private taskHandlers: Map<string, (task: Task) => Promise<TaskResult>> = new Map();

  constructor(
    config: Partial<TaskExecutorConfig> = {},
    notifier?: Notifier
  ) {
    this.config = {
      enableGitCommit: config.enableGitCommit ?? true,
      enableCodeGeneration: config.enableCodeGeneration ?? true,
      autoRetry: config.autoRetry ?? true,
      maxRetries: config.maxRetries ?? 3,
      shellTimeout: config.shellTimeout ?? 60000,
    };

    this.notifier = notifier ?? new Notifier();
  }

  /**
   * Register a task handler
   */
  registerHandler(type: string, handler: (task: Task) => Promise<TaskResult>): void {
    this.taskHandlers.set(type, handler);
  }

  /**
   * Execute a task
   */
  async execute(task: Task): Promise<TaskResult> {
    console.log(`[TaskExecutor] Executing task: ${task.name}`);

    // Create executor task
    const executorTask: ExecutorTask = {
      id: uuidv4(),
      taskId: task.id,
      type: ExecutorType.AGENT,
      status: 'running',
      input: {
        taskName: task.name,
        taskDescription: task.description,
        priority: task.priority,
      },
      createdAt: new Date(),
      startedAt: new Date(),
    };

    this.runningTasks.set(executorTask.id, executorTask);

    try {
      // Execute task based on description/action
      const result = await this.performTaskExecution(task);

      // Update executor task
      executorTask.status = 'completed';
      executorTask.output = result as unknown as Record<string, unknown>;
      executorTask.completedAt = new Date();
      executorTask.duration = executorTask.completedAt.getTime() - executorTask.startedAt!.getTime();

      this.runningTasks.delete(executorTask.id);
      this.completedTasks.set(executorTask.id, executorTask);

      // Notify completion
      await this.notifier.notify(
        'completion',
        '✅ Task Completed',
        `Task "${task.name}" completed successfully`,
        'normal'
      );

      return {
        success: true,
        output: JSON.stringify(result),
        duration: executorTask.duration,
      };
    } catch (error) {
      executorTask.status = 'failed';
      executorTask.error = error instanceof Error ? error.message : String(error);
      executorTask.completedAt = new Date();
      executorTask.duration = executorTask.completedAt.getTime() - executorTask.startedAt!.getTime();

      this.runningTasks.delete(executorTask.id);
      this.completedTasks.set(executorTask.id, executorTask);

      await this.notifier.notifyError(
        `Task "${task.name}" failed: ${executorTask.error}`,
        'TaskExecutor'
      );

      return {
        success: false,
        output: executorTask.error,
        duration: executorTask.duration,
      };
    }
  }

  /**
   * Perform actual task execution based on task type
   */
  private async performTaskExecution(task: Task): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const taskDesc = task.description.toLowerCase();
    const taskName = task.name.toLowerCase();

    // Simulate agent execution
    let output = '';
    let success = true;
    const artifacts: string[] = [];

    // Analyze task and generate appropriate response
    if (taskName.includes('api') || taskDesc.includes('api') || taskDesc.includes('接口')) {
      output = await this.generateAPI(task);
      artifacts.push('src/api/generated.ts');
    } else if (taskName.includes('前端') || taskDesc.includes('frontend') || taskDesc.includes('界面')) {
      output = await this.generateFrontend(task);
      artifacts.push('src/ui/generated/');
    } else if (taskName.includes('数据库') || taskDesc.includes('database') || taskDesc.includes('数据')) {
      output = await this.generateDatabaseSchema(task);
      artifacts.push('src/database/schema.sql');
    } else if (taskName.includes('测试') || taskDesc.includes('test')) {
      output = await this.generateTests(task);
      artifacts.push('src/__tests__/generated.test.ts');
    } else if (taskName.includes('文档') || taskDesc.includes('docs')) {
      output = await this.generateDocs(task);
      artifacts.push('docs/generated.md');
    } else if (taskName.includes('代码审查') || taskDesc.includes('review')) {
      output = await this.performCodeReview(task);
    } else if (taskName.includes('分析')) {
      output = await this.analyzeRequirement(task);
    } else {
      // Generic implementation
      output = await this.implementFeature(task);
      artifacts.push(`src/features/${task.id}.ts`);
    }

    // Auto Git commit if enabled
    let gitCommit;
    if (this.config.enableGitCommit && artifacts.length > 0) {
      gitCommit = await this.autoGitCommit(task, artifacts);
    }

    return {
      agentId: 'executor-agent',
      agentName: 'Task Executor Agent',
      success,
      output,
      artifacts,
      gitCommit,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Generate API code
   */
  private async generateAPI(task: Task): Promise<string> {
    console.log(`[TaskExecutor] Generating API for: ${task.name}`);
    // Simulate code generation
    return `
# API Implementation: ${task.name}

## Generated Code
- Endpoint: /api/${task.id}
- Method: POST
- Handler: ${task.name}Handler

\`\`\`typescript
export async function ${task.name.replace(/\s+/g, '')}Handler(req: Request, res: Response) {
  // Implementation for ${task.name}
  return res.json({ success: true, data: {} });
}
\`\`\`
    `.trim();
  }

  /**
   * Generate Frontend code
   */
  private async generateFrontend(task: Task): Promise<string> {
    console.log(`[TaskExecutor] Generating Frontend for: ${task.name}`);
    return `
# Frontend Implementation: ${task.name}

## Generated Components
- ${task.name}Page
- ${task.name}Form
- ${task.name}List

\`\`\`tsx
export const ${task.name.replace(/\s+/g, '')}Page: React.FC = () => {
  return <div>${task.description}</div>;
};
\`\`\`
    `.trim();
  }

  /**
   * Generate Database Schema
   */
  private async generateDatabaseSchema(task: Task): Promise<string> {
    console.log(`[TaskExecutor] Generating Database Schema for: ${task.name}`);
    return `
# Database Schema: ${task.name}

## Generated SQL
\`\`\`sql
CREATE TABLE ${task.id.replace(/-/g, '_')} (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`
    `.trim();
  }

  /**
   * Generate Tests
   */
  private async generateTests(task: Task): Promise<string> {
    console.log(`[TaskExecutor] Generating Tests for: ${task.name}`);
    return `
# Test Cases: ${task.name}

## Generated Tests
\`\`\`typescript
describe('${task.name}', () => {
  it('should work correctly', () => {
    expect(true).toBe(true);
  });
});
\`\`\`
    `.trim();
  }

  /**
   * Generate Documentation
   */
  private async generateDocs(task: Task): Promise<string> {
    console.log(`[TaskExecutor] Generating Documentation for: ${task.name}`);
    return `
# Documentation: ${task.name}

## Overview
${task.description}

## Usage
TODO: Add usage examples
    `.trim();
  }

  /**
   * Perform Code Review
   */
  private async performCodeReview(task: Task): Promise<string> {
    console.log(`[TaskExecutor] Performing Code Review for: ${task.name}`);
    return `
# Code Review: ${task.name}

## Review Summary
- Status: Approved ✅
- Code Quality: Good
- Suggestions: None

## Files Reviewed
- All modified files in this task
    `.trim();
  }

  /**
   * Analyze Requirement
   */
  private async analyzeRequirement(task: Task): Promise<string> {
    console.log(`[TaskExecutor] Analyzing Requirement: ${task.name}`);
    return `
# Requirement Analysis: ${task.name}

## Analysis Result
- Priority: ${TaskPriority[task.priority]}
- Estimated Duration: 60 minutes
- Dependencies: None identified
- Risks: Low

## Recommendations
1. Proceed with implementation
2. Add unit tests
    `.trim();
  }

  /**
   * Implement Feature
   */
  private async implementFeature(task: Task): Promise<string> {
    console.log(`[TaskExecutor] Implementing Feature: ${task.name}`);
    return `
# Feature Implementation: ${task.name}

## Implementation Details
- Feature: ${task.name}
- Description: ${task.description}
- Status: Implemented ✅
    `.trim();
  }

  /**
   * Auto Git Commit
   */
  private async autoGitCommit(
    task: Task,
    artifacts: string[]
  ): Promise<{ hash: string; message: string } | undefined> {
    if (!this.config.enableGitCommit) return undefined;

    console.log(`[TaskExecutor] Performing Git commit for: ${task.name}`);

    // In a real implementation, this would:
    // 1. Stage files: git add <artifacts>
    // 2. Commit: git commit -m "feat: ${task.name}"
    // 3. Return commit hash

    const commitHash = uuidv4().substring(0, 7);
    const commitMessage = `feat: ${task.name}`;

    // Simulate git commit
    return {
      hash: commitHash,
      message: commitMessage,
    };
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeParallel(tasks: Task[]): Promise<TaskResult[]> {
    const promises = tasks.map((task) => this.execute(task));
    return Promise.all(promises);
  }

  /**
   * Get executor task status
   */
  getStatus(): {
    running: number;
    completed: number;
    total: number;
  } {
    return {
      running: this.runningTasks.size,
      completed: this.completedTasks.size,
      total: this.runningTasks.size + this.completedTasks.size,
    };
  }

  /**
   * Get running tasks
   */
  getRunningTasks(): ExecutorTask[] {
    return Array.from(this.runningTasks.values());
  }

  /**
   * Get completed tasks
   */
  getCompletedTasks(): ExecutorTask[] {
    return Array.from(this.completedTasks.values());
  }

  /**
   * Get executor configuration
   */
  getConfig(): TaskExecutorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TaskExecutorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default TaskExecutor;
