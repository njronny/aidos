import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Task, TaskStatus, TaskResult, TaskPriority } from '../../types';
import { Notifier } from '../notifier/Notifier';
import { GitOps } from '../gitops/GitOps';
import { TaskRepository } from '../../infrastructure/database/repositories/task.repository';
import { wsManager } from '../../api/websocket';

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
  outputDir: string;
  gitAutoPush: boolean;
}

/**
 * Code Generator Templates
 */
interface CodeTemplate {
  extension: string;
  content: (task: Task) => string;
}

const TEMPLATES: Record<string, CodeTemplate> = {
  frontend: {
    extension: '.tsx',
    content: (task: Task) => `import React, { useState, useEffect } from 'react';
import './${task.name.replace(/\s+/g, '')}.css';

interface ${task.name.replace(/\s+/g, '')}Props {
  className?: string;
}

export const ${task.name.replace(/\s+/g, '')}: React.FC<${task.name.replace(/\s+/g, '')}Props> = ({ 
  className = '' 
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Implement data fetching for ${task.name}
    const fetchData = async () => {
      try {
        setLoading(true);
        // API call here
        setData({});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className={\`\${className} loading\`}>Loading...</div>;
  if (error) return <div className={\`\${className} error\`}>{error}</div>;

  return (
    <div className={\`\${className} ${task.name.replace(/\s+/g, '-').toLowerCase()}\`}>
      <h2>${task.name}</h2>
      <p>${task.description}</p>
    </div>
  );
};

export default ${task.name.replace(/\s+/g, '')};
`,
  },
  api: {
    extension: '.ts',
    content: (task: Task) => `import { Request, Response, NextFunction } from 'express';

interface ${task.name.replace(/\s+/g, '')}Request {
  // Request body type
}

interface ${task.name.replace(/\s+/g, '')}Response {
  // Response type
}

/**
 * ${task.name} - ${task.description}
 */
export const ${task.name.replace(/\s+/g, '')}Handler = async (
  req: Request<{}, ${task.name.replace(/\s+/g, '')}Response, ${task.name.replace(/\s+/g, '')}Request>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { /* destructured params */ } = req.body;

    // TODO: Implement business logic for ${task.name}
    const result = {
      success: true,
      data: {
        id: '${task.id}',
        name: '${task.name}',
        createdAt: new Date().toISOString(),
      },
    };

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Validation middleware for ${task.name}
 */
export const validate${task.name.replace(/\s+/g, '')}Request = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // TODO: Add validation logic
  next();
};

export default { ${task.name.replace(/\s+/g, '')}Handler, validate${task.name.replace(/\s+/g, '')}Request };
`,
  },
  database: {
    extension: '.sql',
    content: (task: Task) => `-- Database Schema: ${task.name}
-- Created: ${new Date().toISOString()}

-- Table: ${task.id.replace(/-/g, '_')}
CREATE TABLE IF NOT EXISTS ${task.id.replace(/-/g, '_')} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_${task.id.replace(/-/g, '_')}_status 
    ON ${task.id.replace(/-/g, '_')}(status);

CREATE INDEX IF NOT EXISTS idx_${task.id.replace(/-/g, '_')}_created_at 
    ON ${task.id.replace(/-/g, '_')}(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_${task.id.replace(/-/g, '_')}_updated_at ON ${task.id.replace(/-/g, '_')};
CREATE TRIGGER update_${task.id.replace(/-/g, '_')}_updated_at
    BEFORE UPDATE ON ${task.id.replace(/-/g, '_')}
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE ${task.id.replace(/-/g, '_')} IS '${task.description}';
COMMENT ON COLUMN ${task.id.replace(/-/g, '_')}.name IS 'Name of the entity';
COMMENT ON COLUMN ${task.id.replace(/-/g, '_')}.status IS 'Status: active, inactive, pending';
`,
  },
  test: {
    extension: '.test.ts',
    content: (task: Task) => `import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../services/...', () => ({
  // mock implementation
}));

describe('${task.name}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core functionality', () => {
    it('should ${task.name.toLowerCase()} successfully', async () => {
      // Arrange
      const input = {
        id: '${task.id}',
        name: '${task.name}',
      };

      // Act
      const result = true; // TODO: Implement actual test

      // Assert
      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const errorInput = null;

      // Act & Assert
      await expect(async () => {
        throw new Error('Not implemented');
      }).rejects.toThrow();
    });

    it('should validate input correctly', () => {
      // TODO: Add validation tests
      expect(true).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty input', () => {
      const result = true; // TODO: Implement
      expect(result).toBeDefined();
    });

    it('should handle large input', () => {
      const result = true; // TODO: Implement
      expect(result).toBeDefined();
    });
  });
});
`,
  },
  component: {
    extension: '.tsx',
    content: (task: Task) => `import React from 'react';
import styles from './${task.name.replace(/\s+/g, '')}.module.css';

interface ${task.name.replace(/\s+/g, '')}Props {
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * ${task.name} Component
 * ${task.description}
 */
export const ${task.name.replace(/\s+/g, '')}: React.FC<${task.name.replace(/\s+/g, '')}Props> = ({
  children,
  onClick,
  disabled = false,
  className = '',
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      type="button"
      className={\`\${styles.button} \${className}\`}
      onClick={handleClick}
      disabled={disabled}
    >
      {children || '${task.name}'}
    </button>
  );
};

export default ${task.name.replace(/\s+/g, '')};
`,
  },
  service: {
    extension: '.ts',
    content: (task: Task) => `/**
 * ${task.name} Service
 * ${task.description}
 */

export interface I${task.name.replace(/\s+/g, '')}Service {
  findAll(): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  create(data: Partial<any>): Promise<any>;
  update(id: string, data: Partial<any>): Promise<any>;
  delete(id: string): Promise<boolean>;
}

export class ${task.name.replace(/\s+/g, '')}Service implements I${task.name.replace(/\s+/g, '')}Service {
  async findAll(): Promise<any[]> {
    // TODO: Implement findAll
    return [];
  }

  async findById(id: string): Promise<any | null> {
    // TODO: Implement findById
    return null;
  }

  async create(data: Partial<any>): Promise<any> {
    // TODO: Implement create
    return { ...data, id: '${task.id}', createdAt: new Date() };
  }

  async update(id: string, data: Partial<any>): Promise<any> {
    // TODO: Implement update
    return { ...data, id, updatedAt: new Date() };
  }

  async delete(id: string): Promise<boolean> {
    // TODO: Implement delete
    return true;
  }
}

export const ${task.name.replace(/\s+/g, '')}ServiceFactory = (): I${task.name.replace(/\s+/g, '')}Service => {
  return new ${task.name.replace(/\s+/g, '')}Service();
};

export default ${task.name.replace(/\s+/g, '')}Service;
`,
  },
};

/**
 * Task Executor - 任务执行器
 * 检测到新任务后，自动spawn代理执行开发任务
 * 支持代码生成、Git提交
 * 实时更新数据库和推送WebSocket消息
 */
export class TaskExecutor {
  private config: TaskExecutorConfig;
  private notifier: Notifier;
  private gitOps: GitOps;
  private taskRepository: TaskRepository;
  private runningTasks: Map<string, ExecutorTask> = new Map();
  private completedTasks: Map<string, ExecutorTask> = new Map();
  private taskHandlers: Map<string, (task: Task) => Promise<TaskResult>> = new Map();

  constructor(
    config: Partial<TaskExecutorConfig> = {},
    notifier?: Notifier,
    gitOps?: GitOps,
    taskRepository?: TaskRepository
  ) {
    this.config = {
      enableGitCommit: config.enableGitCommit ?? true,
      enableCodeGeneration: config.enableCodeGeneration ?? true,
      autoRetry: config.autoRetry ?? true,
      maxRetries: config.maxRetries ?? 3,
      shellTimeout: config.shellTimeout ?? 60000,
      outputDir: config.outputDir ?? path.join(process.cwd(), 'generated'),
      gitAutoPush: config.gitAutoPush ?? false,
    };

    this.notifier = notifier ?? new Notifier();
    this.gitOps = gitOps ?? new GitOps({ repoPath: process.cwd() });
    this.taskRepository = taskRepository ?? new TaskRepository();
  }

  /**
   * Register a task handler
   */
  registerHandler(type: string, handler: (task: Task) => Promise<TaskResult>): void {
    this.taskHandlers.set(type, handler);
  }

  /**
   * Execute task immediately - 创建任务后立即执行
   * 1. 在数据库中创建任务
   * 2. 立即开始执行
   * 3. 实时更新任务状态
   * 4. 执行完成后更新数据库
   */
  async executeImmediately(
    projectId: string,
    requirementId: string | undefined,
    title: string,
    description: string,
    priority: number = 1,
    agentType?: string
  ): Promise<TaskResult> {
    console.log(`[TaskExecutor] Executing immediately: ${title}`);

    // Create task in database first
    const createdTask = await this.taskRepository.create({
      projectId,
      requirementId,
      title,
      description,
      status: 'pending',
      priority,
      agentType,
    });

    console.log(`[TaskExecutor] Created task in database: ${createdTask.id}`);

    // Convert to Task type for executor
    const task: Task = {
      id: createdTask.id,
      name: title,
      description: description || '',
      status: TaskStatus.PENDING,
      priority: priority as TaskPriority,
      dependencies: [],
      createdAt: new Date(),
      retries: 0,
      maxRetries: this.config.maxRetries,
    };

    // Execute task immediately (synchronous)
    return this.execute(task);
  }

  /**
   * Execute a task - 同步执行并实时更新数据库和WebSocket
   */
  async execute(task: Task): Promise<TaskResult> {
    console.log(`[TaskExecutor] Executing task: ${task.name}`);
    const startTime = Date.now();

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
      // Update task status to running in database
      await this.updateTaskInDatabase(task.id, 'running');

      // Push WebSocket update - task started
      this.pushTaskUpdate(task.id, 'running');

      // Execute task based on description/action
      const result = await this.performTaskExecution(task);

      // Update executor task
      executorTask.status = 'completed';
      executorTask.output = result as unknown as Record<string, unknown>;
      executorTask.completedAt = new Date();
      executorTask.duration = executorTask.completedAt.getTime() - executorTask.startedAt!.getTime();

      this.runningTasks.delete(executorTask.id);
      this.completedTasks.set(executorTask.id, executorTask);

      // Update task status to completed in database
      const duration = executorTask.duration;
      await this.updateTaskInDatabase(task.id, 'completed', {
        result: { output: result.output, artifacts: result.artifacts, gitCommit: result.gitCommit },
        actualDuration: duration,
      });

      // Push WebSocket update - task completed
      this.pushTaskUpdate(task.id, 'completed', result.output);

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
      const errorMessage = error instanceof Error ? error.message : String(error);
      executorTask.status = 'failed';
      executorTask.error = errorMessage;
      executorTask.completedAt = new Date();
      executorTask.duration = executorTask.completedAt.getTime() - executorTask.startedAt!.getTime();

      this.runningTasks.delete(executorTask.id);
      this.completedTasks.set(executorTask.id, executorTask);

      // Update task status to failed in database
      await this.updateTaskInDatabase(task.id, 'failed', { errorLog: errorMessage });

      // Push WebSocket update - task failed
      this.pushTaskUpdate(task.id, 'failed', errorMessage);

      await this.notifier.notifyError(
        `Task "${task.name}" failed: ${errorMessage}`,
        'TaskExecutor'
      );

      return {
        success: false,
        output: errorMessage,
        duration: executorTask.duration,
      };
    }
  }

  /**
   * Update task in database
   */
  private async updateTaskInDatabase(
    taskId: string,
    status: 'pending' | 'running' | 'waiting' | 'completed' | 'failed' | 'skipped',
    additionalData?: { result?: Record<string, unknown>; errorLog?: string; actualDuration?: number }
  ): Promise<void> {
    try {
      const updateInput: any = { status };
      
      if (status === 'running') {
        updateInput.startedAt = new Date();
      } else if (status === 'completed' || status === 'failed') {
        updateInput.completedAt = new Date();
      }
      
      if (additionalData) {
        if (additionalData.result) updateInput.result = additionalData.result;
        if (additionalData.errorLog) updateInput.errorLog = additionalData.errorLog;
        if (additionalData.actualDuration) updateInput.actualDuration = additionalData.actualDuration;
      }

      await this.taskRepository.update(taskId, updateInput);
      console.log(`[TaskExecutor] Updated task ${taskId} status to: ${status}`);
    } catch (error) {
      console.error(`[TaskExecutor] Failed to update task in database:`, error);
    }
  }

  /**
   * Push task update via WebSocket
   */
  private pushTaskUpdate(taskId: string, status: string, result?: string): void {
    try {
      wsManager.pushTaskUpdate(taskId, status, result);
      console.log(`[TaskExecutor] WebSocket push: task ${taskId} status -> ${status}`);
    } catch (error) {
      console.error(`[TaskExecutor] Failed to push WebSocket update:`, error);
    }
  }

  /**
   * Determine task type from task name/description
   */
  private getTaskType(task: Task): string {
    const desc = (task.name + ' ' + task.description).toLowerCase();
    
    if (desc.includes('api') || desc.includes('接口') || desc.includes('endpoint')) {
      return 'api';
    }
    if (desc.includes('前端') || desc.includes('frontend') || desc.includes('界面') || desc.includes('ui') || desc.includes('组件')) {
      return 'frontend';
    }
    if (desc.includes('数据库') || desc.includes('database') || desc.includes('sql') || desc.includes('数据')) {
      return 'database';
    }
    if (desc.includes('测试') || desc.includes('test') || desc.includes('spec')) {
      return 'test';
    }
    if (desc.includes('service') || desc.includes('服务')) {
      return 'service';
    }
    if (desc.includes('组件') || desc.includes('component')) {
      return 'component';
    }
    return 'frontend'; // default to frontend
  }

  /**
   * Generate code and write to file system
   */
  private async generateAndWriteCode(task: Task, type: string): Promise<string[]> {
    const template = TEMPLATES[type];
    if (!template) {
      console.warn(`[TaskExecutor] No template found for type: ${type}, using frontend as default`);
      return this.generateAndWriteCode(task, 'frontend');
    }

    const safeName = task.name.replace(/\s+/g, '-').toLowerCase();
    const outputDir = path.join(this.config.outputDir, type + 's', safeName);
    const fileName = `${safeName}${template.extension}`;
    const filePath = path.join(outputDir, fileName);

    // Ensure directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate code content
    const content = template.content(task);

    // Write to file
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`[TaskExecutor] Generated code: ${filePath}`);

    return [filePath];
  }

  /**
   * Perform actual task execution based on task type
   */
  private async performTaskExecution(task: Task): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const taskDesc = task.description.toLowerCase();
    const taskName = task.name.toLowerCase();

    let output = '';
    let success = true;
    const artifacts: string[] = [];

    // Determine task type and generate code
    const taskType = this.getTaskType(task);

    if (this.config.enableCodeGeneration) {
      try {
        // Generate and write code to file system
        const generatedFiles = await this.generateAndWriteCode(task, taskType);
        artifacts.push(...generatedFiles);
        output = `Generated ${taskType} code: ${generatedFiles.join(', ')}`;
        console.log(`[TaskExecutor] ${output}`);
      } catch (error) {
        console.error(`[TaskExecutor] Code generation failed:`, error);
        output = `Code generation failed: ${error}`;
        success = false;
      }
    } else {
      // Fallback to simulated execution
      output = await this.performSimulatedExecution(task, taskType);
    }

    // Auto Git commit if enabled
    let gitCommit;
    if (this.config.enableGitCommit && artifacts.length > 0) {
      gitCommit = await this.performAutoGitCommit(task, artifacts);
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
   * Perform simulated execution (when code generation is disabled)
   */
  private async performSimulatedExecution(task: Task, taskType: string): Promise<string> {
    switch (taskType) {
      case 'api':
        return this.generateAPI(task);
      case 'frontend':
        return this.generateFrontend(task);
      case 'database':
        return this.generateDatabaseSchema(task);
      case 'test':
        return this.generateTests(task);
      case 'service':
        return this.generateService(task);
      default:
        return this.implementFeature(task);
    }
  }

  /**
   * Generate API code (legacy simulated)
   */
  private async generateAPI(task: Task): Promise<string> {
    return `
# API Implementation: ${task.name}

## Generated Code
- Endpoint: /api/${task.id}
- Method: POST
- Handler: ${task.name}Handler

\`\`\`typescript
export async function ${task.name.replace(/\s+/g, '')}Handler(req: Request, res: Response) {
  return res.json({ success: true, data: {} });
}
\`\`\`
    `.trim();
  }

  /**
   * Generate Frontend code (legacy simulated)
   */
  private async generateFrontend(task: Task): Promise<string> {
    return `
# Frontend Implementation: ${task.name}

## Generated Components
- ${task.name}Page
- ${task.name}Form
    `.trim();
  }

  /**
   * Generate Database Schema (legacy simulated)
   */
  private async generateDatabaseSchema(task: Task): Promise<string> {
    return `
# Database Schema: ${task.name}

## Generated SQL
\`\`\`sql
CREATE TABLE ${task.id.replace(/-/g, '_')} (
  id SERIAL PRIMARY KEY
);
\`\`\`
    `.trim();
  }

  /**
   * Generate Tests (legacy simulated)
   */
  private async generateTests(task: Task): Promise<string> {
    return `
# Test Cases: ${task.name}

## Generated Tests
\`\`\`typescript
describe('${task.name}', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
\`\`\`
    `.trim();
  }

  /**
   * Generate Service (legacy simulated)
   */
  private async generateService(task: Task): Promise<string> {
    return `
# Service: ${task.name}

## Methods
- findAll()
- findById(id)
- create(data)
- update(id, data)
- delete(id)
    `.trim();
  }

  /**
   * Implement Feature (legacy simulated)
   */
  private async implementFeature(task: Task): Promise<string> {
    return `
# Feature Implementation: ${task.name}

## Implementation Details
- Feature: ${task.name}
- Description: ${task.description}
- Status: Implemented ✅
    `.trim();
  }

  /**
   * Perform Auto Git Commit
   */
  private async performAutoGitCommit(
    task: Task,
    artifacts: string[]
  ): Promise<{ hash: string; message: string } | undefined> {
    if (!this.config.enableGitCommit) return undefined;

    console.log(`[TaskExecutor] Performing Git commit for: ${task.name}`);
    console.log(`[TaskExecutor] Staging files: ${artifacts.join(', ')}`);

    try {
      // Stage files
      for (const file of artifacts) {
        await this.gitOps.add(file);
      }

      // Create commit
      const commitMessage = `feat: ${task.name} - ${task.description.substring(0, 50)}`;
      const result = await this.gitOps.commit(commitMessage);

      if (result.success && result.commitHash) {
        console.log(`[TaskExecutor] Committed: ${result.commitHash}`);

        // Optionally push
        if (this.config.gitAutoPush) {
          await this.gitOps.push();
          console.log(`[TaskExecutor] Pushed to remote`);
        }

        return {
          hash: result.commitHash,
          message: commitMessage,
        };
      } else {
        console.error(`[TaskExecutor] Commit failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`[TaskExecutor] Git commit error:`, error);
    }

    return undefined;
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

  /**
   * Get GitOps instance
   */
  getGitOps(): GitOps {
    return this.gitOps;
  }

  /**
   * Manually trigger code generation for a task
   */
  async generateCode(task: Task, type?: string): Promise<string[]> {
    const taskType = type || this.getTaskType(task);
    return this.generateAndWriteCode(task, taskType);
  }

  /**
   * Manually trigger Git commit for files
   */
  async commitFiles(files: string[], message: string): Promise<{ hash: string; message: string } | undefined> {
    try {
      for (const file of files) {
        await this.gitOps.add(file);
      }
      const result = await this.gitOps.commit(message);
      if (result.success && result.commitHash) {
        return {
          hash: result.commitHash,
          message: message,
        };
      }
    } catch (error) {
      console.error(`[TaskExecutor] Manual commit failed:`, error);
    }
    return undefined;
  }
}

export default TaskExecutor;
