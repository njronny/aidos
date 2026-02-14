/**
 * OpenClawExecutor - 调用 OpenClaw 执行任务
 * 
 * AIDOS 通过这个模块调用 OpenClaw 执行任务
 */

export interface OpenClawConfig {
  openclawPath?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface OpenClawTask {
  id: string;
  prompt: string;
  agent?: string;
  context?: Record<string, any>;
  model?: string;
}

export interface OpenClawResult {
  success: boolean;
  taskId: string;
  output: string;
  error?: string;
  executionTime: number;
  agent?: string;
}

export interface TaskStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: OpenClawResult;
}

export class OpenClawExecutor {
  private config: Required<OpenClawConfig>;
  private taskStatuses: Map<string, TaskStatus> = new Map();

  constructor(config: OpenClawConfig = {}) {
    this.config = {
      openclawPath: config.openclawPath || 'openclaw',
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 3,
    };
  }

  /**
   * 执行单个任务
   */
  async execute(task: OpenClawTask): Promise<OpenClawResult> {
    const startTime = Date.now();

    // 记录任务状态
    this.taskStatuses.set(task.id, {
      id: task.id,
      status: 'running',
    });

    try {
      // 调用 OpenClaw 执行任务
      const result = await this.callOpenClaw(task);

      const finalResult: OpenClawResult = {
        ...result,
        executionTime: Date.now() - startTime,
      };

      this.taskStatuses.set(task.id, {
        id: task.id,
        status: 'completed',
        result: finalResult,
      });

      return finalResult;
    } catch (error) {
      const errorResult: OpenClawResult = {
        success: false,
        taskId: task.id,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };

      this.taskStatuses.set(task.id, {
        id: task.id,
        status: 'failed',
        result: errorResult,
      });

      return errorResult;
    }
  }

  /**
   * 批量执行任务
   */
  async executeBatch(tasks: OpenClawTask[]): Promise<OpenClawResult[]> {
    const results: OpenClawResult[] = [];

    for (const task of tasks) {
      const result = await this.execute(task);
      results.push(result);
    }

    return results;
  }

  /**
   * 并行批量执行
   */
  async executeBatchParallel(tasks: OpenClawTask[], maxConcurrent: number = 3): Promise<OpenClawResult[]> {
    const results: OpenClawResult[] = [];
    const queue = [...tasks];

    const workers = Array.from({ length: Math.min(maxConcurrent, tasks.length) }, () => 
      this.processQueue(queue, results)
    );

    await Promise.all(workers);
    return results;
  }

  private async processQueue(queue: OpenClawTask[], results: OpenClawResult[]): Promise<void> {
    while (queue.length > 0) {
      const task = queue.shift();
      if (task) {
        const result = await this.execute(task);
        results.push(result);
      }
    }
  }

  /**
   * 调用 OpenClaw CLI
   */
  private async callOpenClaw(task: OpenClawTask): Promise<OpenClawResult> {
    return new Promise((resolve) => {
      // 构建 prompt
      const fullPrompt = this.buildPrompt(task);

      // 模拟 OpenClaw 执行（实际会调用 openclaw 命令）
      setTimeout(() => {
        const success = !task.prompt.includes('error');
        
        resolve({
          success,
          taskId: task.id,
          output: success ? this.generateMockOutput(task) : '',
          error: success ? undefined : 'Simulated error',
          agent: task.agent || 'developer',
          executionTime: 100,
        });
      }, 100);
    });
  }

  /**
   * 构建 prompt
   */
  private buildPrompt(task: OpenClawTask): string {
    let prompt = task.prompt;

    if (task.context) {
      prompt += `\n\n上下文: ${JSON.stringify(task.context)}`;
    }

    if (task.agent) {
      prompt = `[${task.agent}] ${prompt}`;
    }

    return prompt;
  }

  /**
   * 生成模拟输出
   */
  private generateMockOutput(task: OpenClawTask): string {
    if (task.prompt.includes('函数') || task.prompt.includes('function')) {
      return `// Generated code\nexport function hello(): string {\n  return 'Hello, World!';\n}`;
    }

    if (task.prompt.includes('类') || task.prompt.includes('class')) {
      return `// Generated class\nexport class User {\n  constructor(public name: string) {}\n}`;
    }

    if (task.prompt.includes('测试') || task.prompt.includes('test')) {
      return `// Generated test\ndescribe('test', () => {\n  it('should work', () => {\n    expect(true).toBe(true);\n  });\n});`;
    }

    return `// Generated for: ${task.prompt}`;
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): TaskStatus | undefined {
    return this.taskStatuses.get(taskId);
  }

  /**
   * 获取所有任务状态
   */
  getAllStatuses(): TaskStatus[] {
    return Array.from(this.taskStatuses.values());
  }

  /**
   * 清理已完成的任务
   */
  cleanup(): void {
    for (const [id, status] of this.taskStatuses) {
      if (status.status === 'completed' || status.status === 'failed') {
        this.taskStatuses.delete(id);
      }
    }
  }

  /**
   * 获取配置
   */
  getConfig(): Readonly<Required<OpenClawConfig>> {
    return { ...this.config };
  }
}

export default OpenClawExecutor;
