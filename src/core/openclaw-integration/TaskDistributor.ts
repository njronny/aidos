/**
 * TaskDistributor - 任务分发器
 * 
 * 将任务分发到不同的 OpenClaw 执行器
 */

import { OpenClawExecutor, OpenClawTask, OpenClawResult } from './OpenClawExecutor';

export interface DistributeTask {
  id: string;
  prompt: string;
  agentType?: string;
  context?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface DistributeResult extends OpenClawResult {
  agentType: string;
  distributedAt: number;
}

export interface RoutingRule {
  pattern: RegExp;
  agentType: string;
}

export class TaskDistributor {
  private executor: OpenClawExecutor;
  private routingRules: RoutingRule[] = [];
  private taskQueue: DistributeTask[] = [];
  private currentIndex = 0;

  constructor() {
    this.executor = new OpenClawExecutor();
    this.initRoutingRules();
  }

  /**
   * 初始化路由规则
   */
  private initRoutingRules(): void {
    // 根据关键词匹配路由
    this.routingRules = [
      { pattern: /代码|开发|实现|函数|类|接口/i, agentType: 'developer' },
      { pattern: /测试|验证|单元|集成/i, agentType: 'qa' },
      { pattern: /数据库|表|模型|SQL/i, agentType: 'dba' },
      { pattern: /部署|Docker|k8s/i, agentType: 'devops' },
      { pattern: /文档|说明|readme/i, agentType: 'writer' },
    ];
  }

  /**
   * 分发任务
   */
  async distribute(task: DistributeTask): Promise<DistributeResult> {
    const startTime = Date.now();

    // 确定 agent 类型
    const agentType = task.agentType || this.route(task.prompt);

    // 构建 OpenClaw 任务
    const openclawTask: OpenClawTask = {
      id: task.id,
      prompt: task.prompt,
      agent: agentType,
      context: task.context,
    };

    // 执行任务
    const result = await this.executor.execute(openclawTask);

    // 返回分发结果
    return {
      ...result,
      agentType,
      distributedAt: Date.now(),
    };
  }

  /**
   * 批量分发
   */
  async distributeBatch(tasks: DistributeTask[]): Promise<DistributeResult[]> {
    const results: DistributeResult[] = [];

    for (const task of tasks) {
      const result = await this.distribute(task);
      results.push(result);
    }

    return results;
  }

  /**
   * 并行批量分发
   */
  async distributeBatchParallel(tasks: DistributeTask[], maxConcurrent: number = 3): Promise<DistributeResult[]> {
    const results: DistributeResult[] = [];
    const queue = [...tasks];

    const workers = Array.from({ length: Math.min(maxConcurrent, tasks.length) }, () =>
      this.processQueue(queue, results)
    );

    await Promise.all(workers);
    return results;
  }

  private async processQueue(queue: DistributeTask[], results: DistributeResult[]): Promise<void> {
    while (queue.length > 0) {
      const task = queue.shift();
      if (task) {
        const result = await this.distribute(task);
        results.push(result);
      }
    }
  }

  /**
   * 根据 prompt 路由
   */
  private route(prompt: string): string {
    for (const rule of this.routingRules) {
      if (rule.pattern.test(prompt)) {
        return rule.agentType;
      }
    }
    return 'developer'; // 默认
  }

  /**
   * 添加自定义路由规则
   */
  addRoutingRule(pattern: RegExp, agentType: string): void {
    this.routingRules.push({ pattern, agentType });
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): { pending: number; running: number } {
    return {
      pending: this.taskQueue.length,
      running: 0,
    };
  }

  /**
   * 获取统计
   */
  getStats(): { total: number; success: number; failed: number } {
    const statuses = this.executor.getAllStatuses();
    
    return {
      total: statuses.length,
      success: statuses.filter(s => s.status === 'completed').length,
      failed: statuses.filter(s => s.status === 'failed').length,
    };
  }
}

export default TaskDistributor;
