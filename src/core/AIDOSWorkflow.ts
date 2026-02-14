/**
 * AIDOS Workflow - 完整工作流
 * 
 * 集成所有模块的端到端工作流
 */

import { OpenClawRealExecutor, RealTask, RealResult } from './openclaw-integration/OpenClawRealExecutor';
import { TaskDistributor } from './openclaw-integration/TaskDistributor';
import { ErrorClassifier, ErrorType } from './error-recovery/ErrorClassifier';
import { FixStrategyEngine } from './error-recovery/FixStrategyEngine';
import { AutoRetry } from './error-recovery/AutoRetry';
import { ProjectRepository, Project } from './persistence/ProjectRepository';
import { TaskRepository, Task, TaskStatus } from './persistence/TaskRepository';
import { Dashboard } from './visualization/Dashboard';
import { FlowVisualizer } from './visualization/FlowVisualizer';

export interface AIDOSWorkflowOptions {
  useRealOpenClaw?: boolean;
  maxRetries?: number;
}

export interface WorkflowResult {
  success: boolean;
  projectId: string;
  taskResults: TaskResult[];
  errors: string[];
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output?: string;
  error?: string;
}

export class AIDOSWorkflow {
  private executor: OpenClawRealExecutor;
  private distributor: TaskDistributor;
  private classifier: ErrorClassifier;
  private fixEngine: FixStrategyEngine;
  private retry: AutoRetry;
  private projectRepo: ProjectRepository;
  private taskRepo: TaskRepository;
  private dashboard: Dashboard;
  private visualizer: FlowVisualizer;

  constructor(options?: AIDOSWorkflowOptions) {
    // 初始化所有模块
    this.executor = new OpenClawRealExecutor({
      useReal: options?.useRealOpenClaw ?? false,
    });

    this.distributor = new TaskDistributor();
    this.classifier = new ErrorClassifier();
    this.fixEngine = new FixStrategyEngine();
    this.retry = new AutoRetry();
    this.projectRepo = new ProjectRepository();
    this.taskRepo = new TaskRepository();
    this.dashboard = new Dashboard();
    this.visualizer = new FlowVisualizer();
  }

  /**
   * 启用真实 OpenClaw 执行
   */
  enableRealExecution(): void {
    this.executor.enableRealExecution();
  }

  /**
   * 禁用真实 OpenClaw 执行
   */
  disableRealExecution(): void {
    this.executor.disableRealExecution();
  }

  /**
   * 运行完整工作流
   */
  async run(requirement: string): Promise<WorkflowResult> {
    console.log('\n🚀 AIDOS 工作流开始\n');
    console.log('='.repeat(50));
    console.log(`需求: ${requirement}\n`);

    const errors: string[] = [];
    const taskResults: TaskResult[] = [];

    try {
      // 1. 创建项目
      console.log('📦 步骤1: 创建项目');
      const project = await this.projectRepo.create({
        name: this.extractProjectName(requirement),
        description: requirement,
      });
      console.log(`   ✅ 项目: ${project.name} (${project.id})`);

      // 2. 任务拆分
      console.log('\n📋 步骤2: 任务拆分');
      const tasks = await this.splitTasks(requirement, project.id);
      console.log(`   ✅ 创建 ${tasks.length} 个任务`);

      // 3. 执行任务
      console.log('\n🚀 步骤3: 执行任务');
      for (const task of tasks) {
        const result = await this.executeTask(task);
        taskResults.push({
          taskId: task.id,
          success: result.success,
          output: result.output,
          error: result.error,
        });

        if (result.success) {
          await this.taskRepo.updateStatus(task.id, 'completed');
          console.log(`   ✅ ${task.name}: 完成`);
        } else {
          await this.taskRepo.updateStatus(task.id, 'failed');
          console.log(`   ❌ ${task.name}: 失败 - ${result.error}`);

          // 4. 错误处理
          if (result.error) {
            const fixResult = await this.handleError(result.error, task);
            if (fixResult) {
              console.log(`   🔧 尝试修复...`);
            }
          }
        }
      }

      // 5. 可视化
      console.log('\n📊 步骤4: 生成流程图');
      const rawTasks = await this.taskRepo.getByProject(project.id);
      const flowTasks = rawTasks.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        dependencies: t.dependencies || [],
      }));
      const flow = await this.visualizer.generateFlow(flowTasks);
      console.log(`   ✅ 流程图: ${flow.nodes.length} 节点, ${flow.edges.length} 边`);

      // 6. 仪表盘
      console.log('\n📈 步骤5: 项目仪表盘');
      const dashData = await this.dashboard.generate();
      console.log(`   ✅ 任务统计: ${dashData.overview.totalTasks} 总数, ${dashData.overview.completedProjects} 完成`);

      const success = taskResults.every(r => r.success);
      console.log('\n' + '='.repeat(50));
      console.log(success ? '🎉 工作流完成！' : '⚠️ 工作流有错误');

      return {
        success,
        projectId: project.id,
        taskResults,
        errors,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ 工作流失败: ${errorMsg}`);
      errors.push(errorMsg);

      return {
        success: false,
        projectId: '',
        taskResults,
        errors,
      };
    }
  }

  /**
   * 执行单个任务
   */
  private async executeTask(task: Task): Promise<RealResult> {
    // 使用重试机制
    const result = await this.retry.execute(
      async () => {
        return this.executor.execute({
          id: task.id,
          prompt: task.description || task.name,
          agent: this.mapTaskTypeToAgent(task.type),
        });
      },
      {
        maxRetries: 3,
        delay: 1000,
        shouldRetry: (err) => {
          // 只重试网络错误
          return err.message.includes('network') || err.message.includes('timeout');
        },
      }
    );

    return {
      success: result.success,
      taskId: task.id,
      output: result.data?.output || '',
      error: result.lastError?.message,
      executionTime: 0,
    };
  }

  /**
   * 处理错误
   */
  private async handleError(error: string, task: Task): Promise<boolean> {
    // 1. 分类错误
    const classified = this.classifier.classify(error);
    console.log(`   🔍 错误分类: ${classified.type} (${classified.severity})`);

    // 2. 生成修复策略
    const strategy = this.fixEngine.generateStrategy(classified.type, error);
    console.log(`   📋 修复策略: ${strategy.actions.map((a: any) => a.description).join(' → ')}`);

    // 3. 如果可修复，尝试修复
    if (this.classifier.canAutoFix(classified.type) && strategy.confidence > 0.5) {
      // 实际修复逻辑...
      return true;
    }

    return false;
  }

  /**
   * 拆分任务
   */
  private async splitTasks(requirement: string, projectId: string): Promise<Task[]> {
    const tasks: Task[] = [];

    // 简单任务拆分逻辑
    // 实际可以调用 LLM 来智能拆分
    const taskDefs = [
      { name: '分析需求', type: 'development' as const, desc: `分析需求: ${requirement}` },
      { name: '实现代码', type: 'development' as const, desc: `实现: ${requirement}` },
      { name: '编写测试', type: 'testing' as const, desc: `测试: ${requirement}` },
    ];

    for (const def of taskDefs) {
      const task = await this.taskRepo.create({
        projectId,
        name: def.name,
        description: def.desc,
        type: def.type,
      });
      tasks.push(task);
    }

    // 设置依赖
    if (tasks.length > 1) {
      await this.taskRepo.addDependency(tasks[1].id, tasks[0].id);
      if (tasks.length > 2) {
        await this.taskRepo.addDependency(tasks[2].id, tasks[1].id);
      }
    }

    return tasks;
  }

  /**
   * 提取项目名称
   */
  private extractProjectName(requirement: string): string {
    // 简单提取：取需求的前 20 个字符
    const name = requirement.slice(0, 20);
    return name + (requirement.length > 20 ? '...' : '');
  }

  /**
   * 映射任务类型到 Agent
   */
  private mapTaskTypeToAgent(type: string): string {
    const map: Record<string, string> = {
      development: 'developer',
      testing: 'qa',
      deployment: 'devops',
      documentation: 'writer',
      review: 'reviewer',
    };
    return map[type] || 'developer';
  }

  /**
   * 获取仪表盘
   */
  getDashboard(): Dashboard {
    return this.dashboard;
  }

  /**
   * 获取可视化器
   */
  getVisualizer(): FlowVisualizer {
    return this.visualizer;
  }
}

/**
 * 创建 AIDOS Workflow
 */
export function createAIDOSWorkflow(options?: AIDOSWorkflowOptions): AIDOSWorkflow {
  return new AIDOSWorkflow(options);
}

export default AIDOSWorkflow;
