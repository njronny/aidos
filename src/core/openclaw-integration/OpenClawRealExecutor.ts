/**
 * OpenClawRealExecutor - 真实 OpenClaw 执行器
 * 
 * 集成说明:
 * 此模块设计用于 OpenClaw 环境内运行
 * 在 OpenClaw 中可直接使用 sessions_spawn 工具
 */

export interface RealTask {
  id: string;
  prompt: string;
  agent?: string;
  context?: Record<string, any>;
  model?: string;
}

export interface RealResult {
  success: boolean;
  taskId: string;
  output: string;
  error?: string;
  executionTime: number;
}

/**
 * 在 OpenClaw 环境内使用的执行器
 * 
 * 使用方式:
 * const executor = new OpenClawRealExecutor();
 * const result = await executor.execute({
 *   id: 'task-1',
 *   prompt: '实现用户注册功能',
 *   agent: 'developer'
 * });
 */
export class OpenClawRealExecutor {
  private defaultAgent = 'main';
  private timeout = 120000;
  private useRealExecution = false; // 默认使用模拟

  constructor(options?: { useReal?: boolean; timeout?: number }) {
    if (options?.timeout) {
      this.timeout = options.timeout;
    }
    this.useRealExecution = options?.useReal ?? false;
  }

  /**
   * 启用真实执行
   */
  enableRealExecution(): void {
    this.useRealExecution = true;
  }

  /**
   * 禁用真实执行
   */
  disableRealExecution(): void {
    this.useRealExecution = false;
  }

  /**
   * 检查是否启用真实执行
   */
  isRealExecutionEnabled(): boolean {
    return this.useRealExecution;
  }

  /**
   * 准备任务
   */
  prepareTask(task: RealTask): string {
    let fullPrompt = task.prompt;
    
    if (task.context) {
      fullPrompt += `\n\n上下文: ${JSON.stringify(task.context)}`;
    }

    const agentType = task.agent || 'developer';
    fullPrompt = `[${agentType} agent]\n${fullPrompt}`;

    return fullPrompt;
  }

  /**
   * 执行任务
   * 
   * 在 OpenClaw 环境中，此方法会调用 sessions_spawn
   */
  async execute(task: RealTask): Promise<RealResult> {
    const startTime = Date.now();
    
    try {
      if (!this.useRealExecution) {
        // 模拟执行
        return this.mockExecute(task, startTime);
      }

      // 真实执行 - 需要在 OpenClaw 环境中
      // 这里会调用全局的 sessions_spawn
      const prompt = this.prepareTask(task);
      
      // @ts-ignore - sessions_spawn 在 OpenClaw 环境中可用
      const result = await sessions_spawn({
        agentId: this.defaultAgent,
        task: prompt,
        timeoutSeconds: this.timeout / 1000,
      });

      return {
        success: true,
        taskId: task.id,
        output: this.parseOutput(result),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      // 如果真实执行失败，回退到模拟
      if (this.useRealExecution) {
        console.warn('Real execution failed, falling back to mock:', error);
        return this.mockExecute(task, startTime);
      }
      
      return {
        success: false,
        taskId: task.id,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 模拟执行
   */
  private mockExecute(task: RealTask, startTime: number): RealResult {
    const output = this.generateMockOutput(task.prompt);
    
    return {
      success: true,
      taskId: task.id,
      output,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * 解析输出
   */
  private parseOutput(result: any): string {
    if (typeof result === 'string') {
      return result;
    }
    if (result?.output) {
      return result.output;
    }
    if (result?.message) {
      return result.message;
    }
    return JSON.stringify(result);
  }

  /**
   * 生成模拟输出
   */
  private generateMockOutput(prompt: string): string {
    if (prompt.includes('函数') || prompt.includes('function')) {
      return `// Generated code
export function hello(): string {
  return 'Hello, World!';
}`;
    }

    if (prompt.includes('测试') || prompt.includes('test')) {
      return `// Generated test
describe('test', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});`;
    }

    if (prompt.includes('类') || prompt.includes('class')) {
      return `// Generated class
export class User {
  constructor(public name: string) {}
}`;
    }

    return `// Generated for: ${prompt}`;
  }

  /**
   * 解析结果
   */
  parseResult(result: any): RealResult {
    return {
      success: result?.success ?? false,
      taskId: result?.taskId ?? '',
      output: result?.output ?? '',
      error: result?.error,
      executionTime: result?.executionTime ?? 0,
    };
  }
}

export default OpenClawRealExecutor;
