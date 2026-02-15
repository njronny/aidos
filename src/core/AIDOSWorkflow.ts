/**
 * AIDOS Workflow - 完整工作流
 * 
 * 集成所有模块的端到端工作流
 */

import { OpenClawRealExecutor, RealTask, RealResult } from './openclaw-integration/OpenClawRealExecutor';
import { TaskDistributor } from './openclaw-integration/TaskDistributor';
import { GitOps } from './gitops/GitOps';
import { ErrorClassifier, ErrorType } from './error-recovery/ErrorClassifier';
import { FixStrategyEngine } from './error-recovery/FixStrategyEngine';
import { AutoRetry } from './error-recovery/AutoRetry';
import { ProjectRepository, Project } from './persistence/ProjectRepository';
import { TaskRepository, Task, TaskStatus } from './persistence/TaskRepository';
import { Dashboard } from './visualization/Dashboard';
import { FlowVisualizer } from './visualization/FlowVisualizer';

// WebSocket 推送
let wsManager: any = null;
async function getWsManager() {
  if (!wsManager) {
    try {
      const ws = await import('../api/websocket');
      wsManager = ws.wsManager;
    } catch (e) {
      console.log('[Workflow] WebSocket not available');
    }
  }
  return wsManager;
}

// 导入共享数据存储
let dataStore: any = null;

async function getDataStore() {
  if (!dataStore) {
    const store = await import('../api/store');
    dataStore = store.dataStore;
  }
  return dataStore;
}

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
      useGateway: process.env.OPENCLAW_GATEWAY === 'true',
      gatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN,
    });
    if (options?.useRealOpenClaw) {
      this.executor.enableRealExecution();
    }

    this.distributor = new TaskDistributor();
    this.classifier = new ErrorClassifier();
    this.fixEngine = new FixStrategyEngine();
    this.retry = new AutoRetry();
    this.projectRepo = new ProjectRepository();
    this.taskRepo = new TaskRepository();
    this.dashboard = new Dashboard();
    this.visualizer = new FlowVisualizer();
    
    // 初始化 GitOps
    this.gitOps = new GitOps({
      repoPath: process.cwd(),
      authorName: 'AIDOS',
      authorEmail: 'aidos@dev.local',
    });
  }

  private gitOps: GitOps;

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
  async run(requirement: string, existingProjectId?: string): Promise<WorkflowResult> {
    console.log('\n🚀 AIDOS 工作流开始\n');
    console.log('='.repeat(50));
    console.log(`需求: ${requirement}\n`);

    const errors: string[] = [];
    const taskResults: TaskResult[] = [];
    const store = await getDataStore();

    try {
      // 1. 使用已有项目或创建新项目 (使用共享数据存储)
      let project: any;
      let requirementId: string;
      
      if (existingProjectId) {
        console.log('📦 步骤1: 使用已有项目');
        const projects = await store.getAllProjects();
        project = projects.find((p: any) => p.id === existingProjectId);
        if (!project) {
          project = await store.createProject({
            name: this.extractProjectName(requirement),
            description: requirement,
          });
        }
        
        // 获取或创建需求
        const reqs = await store.getAllRequirements();
        const existingReq = reqs.find((r: any) => r.projectId === project.id);
        if (existingReq) {
          requirementId = existingReq.id;
        } else {
          const newReq = await store.createRequirement({
            projectId: project.id,
            title: this.extractProjectName(requirement),
            description: requirement,
          });
          requirementId = newReq.id;
        }
      } else {
        console.log('📦 步骤1: 创建项目');
        project = await store.createProject({
          name: this.extractProjectName(requirement),
          description: requirement,
        });
        
        // 创建需求
        const newReq = await store.createRequirement({
          projectId: project.id,
          title: this.extractProjectName(requirement),
          description: requirement,
        });
        requirementId = newReq.id;
      }
      console.log(`   ✅ 项目: ${project.name} (${project.id})`);

      // 2. 任务拆分
      console.log('\n📋 步骤2: 任务拆分');
      const tasks = await this.splitTasks(requirement, project.id, requirementId);
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
          await store.updateTask(task.id, { status: 'completed' });
          console.log(`   ✅ ${task.name}: 完成`);
          
          // 自动 Git 提交
          await this.autoCommit(task, result.output);
        } else {
          await store.updateTask(task.id, { status: 'failed' });
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
    // 推送任务开始
    const ws = await getWsManager();
    if (ws) {
      ws.pushTaskUpdate(task.id, 'running', '任务开始执行...');
    }

    // 使用重试机制
    let executionResult: any = null;
    try {
      executionResult = await this.retry.execute(
        async () => {
          return await this.executor.execute({
            id: task.id,
            prompt: task.description || task.name,
            agent: this.mapTaskTypeToAgent(task.type),
          });
        },
        {
          maxRetries: 3,
          delay: 1000,
          shouldRetry: (err) => {
            return err.message.includes('network') || err.message.includes('timeout');
          },
        }
      );
    } catch (e) {
      executionResult = { success: false, error: e };
    }

    // 提取结果
    const result = executionResult.success 
      ? executionResult.data 
      : { success: false, output: '', error: executionResult.lastError?.message || executionResult.error };

    // 推送任务完成
    if (ws) {
      ws.pushTaskUpdate(task.id, result.success ? 'completed' : 'failed', result.output || result.error);
    }

    return {
      success: result.success,
      taskId: task.id,
      output: result.output || '',
      error: result.error,
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
   * 自动 Git 提交
   */
  private async autoCommit(task: Task, output?: string): Promise<void> {
    try {
      // 获取 git 状态
      const status = await this.gitOps.getStatus();
      console.log(`   [DEBUG] Git status: isClean=${status.isClean}, changes=${status.changes.length}`);
      
      if (status.changes.length > 0) {
        // 有文件变更，进行 commit
        const commitMessage = `[${task.id.substring(0, 8)}] ${task.name}`;
        
        // 添加 src, generated, scripts 目录，忽略 skills 等子模块
        await this.gitOps.add(['src', 'generated', 'scripts', 'package.json', 'tsconfig.json']);
        
        // 提交 (skipAdd=true 因为已经手动添加了文件)
        const result = await this.gitOps.commit(commitMessage, true);
        
        if (result.success) {
          console.log(`   📝 Git 提交: ${commitMessage}`);
        } else {
          console.log(`   ⚠️ Git 提交失败: ${result.error || result.message || 'unknown'}`);
        }
      } else {
        console.log(`   📝 无新文件变更，跳过 Git 提交`);
      }
    } catch (error) {
      // Git 操作失败不影响主流程
      console.log(`   ⚠️ Git 提交失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 拆分任务 - 使用共享数据存储
   */
  private async splitTasks(requirement: string, projectId: string, requirementId?: string): Promise<Task[]> {
    const tasks: Task[] = [];
    const store = await getDataStore();

    // 简单任务拆分逻辑
    const taskDefs = [
      { name: '分析需求', type: 'development' as const, desc: `分析需求: ${requirement}` },
      { name: '实现代码', type: 'development' as const, desc: `实现: ${requirement}` },
      { name: '编写测试', type: 'testing' as const, desc: `测试: ${requirement}` },
    ];

    for (const def of taskDefs) {
      // 使用共享数据存储创建任务
      const taskData = await store.createTask({
        requirementId: requirementId || projectId,
        title: def.name,
        description: def.desc,
        status: 'pending',
      });
      
      // 转换为 Task 对象以保持兼容
      const task: Task = {
        id: taskData.id,
        projectId,
        name: def.name,
        description: def.desc,
        type: def.type,
        status: 'pending',
        createdAt: Date.now(),
      };
      tasks.push(task);
      
      console.log(`   ✅ 创建任务: ${def.name}`);
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
