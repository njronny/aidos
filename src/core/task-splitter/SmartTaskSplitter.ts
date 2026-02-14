/**
 * SmartTaskSplitter - Intelligent Task Splitting
 * 
 * 基于 LLM 的智能任务拆分器
 * - 代码级任务拆分
 * - 复杂度分析
 * - 工作量估算
 * - 依赖分析
 */

import { LLMService } from '../llm';
import { ChatMessage } from '../llm/types';

export interface InputTask {
  id: string;
  title: string;
  description: string;
  type: 'backend' | 'frontend' | 'database' | 'devops' | 'testing' | 'documentation';
}

export interface SplitTask {
  id: string;
  title: string;
  description: string;
  type: InputTask['type'];
  estimatedMinutes: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];
  subtasks?: string[];
}

export interface SplitResult {
  originalTask: InputTask;
  subtasks: SplitTask[];
  dependencies: Map<string, string[]>;
  parallelGroups: SplitTask[][];
  totalEstimatedMinutes: number;
}

export interface ComplexityFactors {
  codeSize: number;           // 1-10
  dependencyComplexity: number; // 1-10
  algorithmComplexity: number;  // 1-10
  testComplexity: number;       // 1-10
}

export interface TaskComplexity {
  score: number;               // 0-10
  level: 'simple' | 'medium' | 'complex';
  factors: ComplexityFactors;
}

export interface DurationEstimate {
  minutes: number;
  confidence: number;           // 0-1
  basedOn: string[];
}

export class SmartTaskSplitter {
  private llm: LLMService;
  private historicalData: Map<string, { actual: number; estimated: number }> = new Map();

  constructor(llm: LLMService) {
    if (!llm) {
      throw new Error('LLM service is required');
    }
    this.llm = llm;
  }

  /**
   * 拆分任务为子任务
   */
  async splitTask(task: InputTask): Promise<SplitResult> {
    const prompt = `
拆分以下任务为具体的子任务：

任务: ${task.title}
描述: ${task.description}
类型: ${task.type}

请返回 JSON 格式：
{
  "subtasks": [
    {
      "title": "子任务标题",
      "description": "具体描述",
      "type": "${task.type}",
      "estimatedMinutes": 30,
      "priority": "medium",
      "dependencies": ["依赖的任务ID"]
    }
  ]
}
`;

    const messages: ChatMessage[] = [
      { role: 'system', content: '你是一个任务拆分专家，擅长将复杂任务拆分为可执行的小任务。' },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.llm.chat(messages);
      const parsed = this.parseSplitResponse(response, task);
      
      if (!parsed.subtasks || parsed.subtasks.length === 0) {
        return this.generateDefaultSplit(task);
      }

      const dependencies = this.buildDependencyMap(parsed.subtasks);
      const parallelGroups = this.identifyParallelGroups(parsed.subtasks);

      return {
        originalTask: task,
        subtasks: parsed.subtasks.map((st: any, i: number) => ({
          ...st,
          id: `${task.id}-${i + 1}`,
        })),
        dependencies,
        parallelGroups,
        totalEstimatedMinutes: parsed.subtasks.reduce((sum: number, t: any) => sum + (t.estimatedMinutes || 30), 0),
      };
    } catch (error) {
      return this.generateDefaultSplit(task);
    }
  }

  /**
   * 分析任务复杂度
   */
  async analyzeComplexity(task: InputTask): Promise<TaskComplexity> {
    const prompt = `
分析以下任务的复杂度：

任务: ${task.title}
描述: ${task.description}
类型: ${task.type}

请返回 JSON 格式：
{
  "score": 1-10,
  "factors": {
    "codeSize": 1-10,
    "dependencyComplexity": 1-10,
    "algorithmComplexity": 1-10,
    "testComplexity": 1-10
  }
}
`;

    const messages: ChatMessage[] = [
      { role: 'system', content: '你是一个技术架构师，擅长评估任务复杂度。' },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.llm.chat(messages);
      const parsed = this.parseComplexityResponse(response);
      
      const score = parsed.score || 5;
      return {
        score,
        level: this.scoreToLevel(score),
        factors: parsed.factors || { codeSize: 5, dependencyComplexity: 5, algorithmComplexity: 5, testComplexity: 5 },
      };
    } catch (error) {
      return { score: 5, level: 'medium', factors: { codeSize: 5, dependencyComplexity: 5, algorithmComplexity: 5, testComplexity: 5 } };
    }
  }

  /**
   * 估算任务时长
   */
  async estimateDuration(task: InputTask): Promise<DurationEstimate> {
    const complexity = await this.analyzeComplexity(task);
    const basedOn: string[] = ['复杂度分析'];

    // Base estimate: 30 minutes for simple, 60 for medium, 120 for complex
    let baseMinutes = 30;
    if (complexity.level === 'medium') baseMinutes = 60;
    if (complexity.level === 'complex') baseMinutes = 120;

    // Adjust based on complexity score
    const adjustedMinutes = Math.round(baseMinutes * (complexity.score / 5));

    // Check historical data
    const history = this.historicalData.get(task.type);
    if (history) {
      basedOn.push('历史数据');
      const ratio = history.actual / history.estimated;
      return {
        minutes: Math.round(adjustedMinutes * ratio),
        confidence: 0.7,
        basedOn,
      };
    }

    return {
      minutes: adjustedMinutes,
      confidence: 0.6,
      basedOn,
    };
  }

  /**
   * 识别任务依赖
   */
  identifyDependencies(tasks: InputTask[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    // Rule-based dependency analysis
    const typeOrder = ['database', 'backend', 'frontend', 'devops', 'testing'];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const deps: string[] = [];

      for (let j = 0; j < i; j++) {
        const prevTask = tasks[j];
        
        // Database before backend
        if (task.type === 'backend' && prevTask.type === 'database') {
          deps.push(prevTask.id);
        }
        // Backend before frontend
        if (task.type === 'frontend' && prevTask.type === 'backend') {
          deps.push(prevTask.id);
        }
        // Backend before testing
        if (task.type === 'testing' && prevTask.type === 'backend') {
          deps.push(prevTask.id);
        }
      }

      if (deps.length > 0) {
        dependencies.set(task.id, deps);
      }
    }

    return dependencies;
  }

  /**
   * 优化执行顺序
   */
  async optimizeExecutionOrder(tasks: InputTask[]): Promise<InputTask[]> {
    // Sort by dependency order
    const dependencies = this.identifyDependencies(tasks);
    
    const sorted = [...tasks].sort((a, b) => {
      const aDeps = dependencies.get(a.id)?.length || 0;
      const bDeps = dependencies.get(b.id)?.length || 0;
      return aDeps - bDeps;
    });

    return sorted;
  }

  /**
   * 记录实际执行时间（用于学习）
   */
  recordActualDuration(taskId: string, estimated: number, actual: number): void {
    this.historicalData.set(taskId, { estimated, actual });
  }

  /**
   * 解析拆分响应
   */
  private parseSplitResponse(response: string, task: InputTask): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Ignore
    }
    return {};
  }

  /**
   * 解析复杂度响应
   */
  private parseComplexityResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Ignore
    }
    return {};
  }

  /**
   * 分数转级别
   */
  private scoreToLevel(score: number): 'simple' | 'medium' | 'complex' {
    if (score <= 3) return 'simple';
    if (score <= 6) return 'medium';
    return 'complex';
  }

  /**
   * 构建依赖图
   */
  private buildDependencyMap(subtasks: any[]): Map<string, string[]> {
    const deps = new Map<string, string[]>();
    
    for (let i = 0; i < subtasks.length; i++) {
      if (subtasks[i].dependencies && subtasks[i].dependencies.length > 0) {
        deps.set(`${subtasks[i].id}`, subtasks[i].dependencies);
      }
    }
    
    return deps;
  }

  /**
   * 识别可并行执行的任务组
   */
  private identifyParallelGroups(subtasks: SplitTask[]): SplitTask[][] {
    const groups: SplitTask[][] = [];
    const assigned = new Set<string>();

    for (const task of subtasks) {
      if (assigned.has(task.id)) continue;

      // Find tasks with no dependencies in this group
      const group = subtasks.filter(t => {
        if (assigned.has(t.id)) return false;
        const deps = t.dependencies || [];
        return deps.every(d => assigned.has(d));
      });

      if (group.length > 0) {
        group.forEach(t => assigned.add(t.id));
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * 生成默认拆分
   */
  private generateDefaultSplit(task: InputTask): SplitResult {
    const defaultSubtasks: SplitTask[] = [
      {
        id: `${task.id}-1`,
        title: `${task.title} - 设计与规划`,
        description: '完成技术方案设计',
        type: task.type,
        estimatedMinutes: 30,
        priority: 'high',
        dependencies: [],
      },
      {
        id: `${task.id}-2`,
        title: `${task.title} - 实现`,
        description: task.description,
        type: task.type,
        estimatedMinutes: 60,
        priority: 'high',
        dependencies: [`${task.id}-1`],
      },
      {
        id: `${task.id}-3`,
        title: `${task.title} - 测试`,
        description: '编写测试用例',
        type: 'testing',
        estimatedMinutes: 30,
        priority: 'medium',
        dependencies: [`${task.id}-2`],
      },
    ];

    return {
      originalTask: task,
      subtasks: defaultSubtasks,
      dependencies: new Map([[`${task.id}-2`, [`${task.id}-1`]], [`${task.id}-3`, [`${task.id}-2`]]]),
      parallelGroups: [[defaultSubtasks[0]], [defaultSubtasks[1]], [defaultSubtasks[2]]],
      totalEstimatedMinutes: 120,
    };
  }
}

export default SmartTaskSplitter;
