import { v4 as uuidv4 } from 'uuid';
import { Requirement } from '../../api/types';
import { Task, TaskStatus, TaskPriority } from '../../types';
import { Notifier } from '../notifier/Notifier';

/**
 * Workflow Events
 */
export enum WorkflowEventType {
  REQUIREMENT_RECEIVED = 'requirement_received',
  TASKS_CREATED = 'tasks_created',
  TASK_STARTED = 'task_started',
  TASK_COMPLETED = 'task_completed',
  WORKFLOW_COMPLETED = 'workflow_completed',
  WORKFLOW_FAILED = 'workflow_failed',
}

export interface WorkflowEvent {
  type: WorkflowEventType;
  requirementId: string;
  taskIds?: string[];
  timestamp: Date;
  data?: Record<string, unknown>;
}

export type WorkflowEventHandler = (event: WorkflowEvent) => void;

/**
 * Task Template - 任务模板
 */
export interface WorkflowTaskTemplate {
  name: string;
  description: string;
  type: 'development' | 'testing' | 'documentation' | 'infrastructure';
  priority: TaskPriority;
  estimatedDuration: number; // minutes
  dependencies: string[]; // 依赖的任务名称
  action?: string; // 具体操作
}

/**
 * Workflow - 工作流定义
 */
export interface Workflow {
  id: string;
  name: string;
  description: string;
  requirementId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  tasks: Task[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Workflow Engine Configuration
 */
export interface WorkflowEngineConfig {
  maxConcurrentTasks: number;
  taskTimeout: number;
  autoCreateTasks: boolean;
  enableParallelExecution: boolean;
}

/**
 * Workflow Engine - 自动化工作流引擎
 * 监听新需求自动创建任务
 */
export class WorkflowEngine {
  private config: WorkflowEngineConfig;
  private workflows: Map<string, Workflow> = new Map();
  private eventHandlers: WorkflowEventHandler[] = [];
  private notifier: Notifier;

  constructor(
    config: Partial<WorkflowEngineConfig> = {},
    notifier?: Notifier
  ) {
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks ?? 5,
      taskTimeout: config.taskTimeout ?? 300000,
      autoCreateTasks: config.autoCreateTasks ?? true,
      enableParallelExecution: config.enableParallelExecution ?? true,
    };

    this.notifier = notifier ?? new Notifier();
  }

  /**
   * Process a new requirement and automatically create tasks
   */
  async processRequirement(requirement: Requirement): Promise<Workflow> {
    console.log(`[WorkflowEngine] Processing requirement: ${requirement.title}`);

    // Create workflow
    const workflow: Workflow = {
      id: uuidv4(),
      name: `Workflow for: ${requirement.title}`,
      description: requirement.description || '',
      requirementId: requirement.id,
      status: 'pending',
      tasks: [],
      createdAt: new Date(),
    };

    this.workflows.set(workflow.id, workflow);

    // Emit event
    this.emitEvent({
      type: WorkflowEventType.REQUIREMENT_RECEIVED,
      requirementId: requirement.id,
      timestamp: new Date(),
      data: { requirement },
    });

    try {
      // Auto-create tasks based on requirement
      if (this.config.autoCreateTasks) {
        const tasks = await this.analyzeAndCreateTasks(requirement);
        workflow.tasks = tasks;
        workflow.status = 'running';
        workflow.startedAt = new Date();

        this.emitEvent({
          type: WorkflowEventType.TASKS_CREATED,
          requirementId: requirement.id,
          taskIds: tasks.map((t) => t.id),
          timestamp: new Date(),
          data: { taskCount: tasks.length },
        });

        // Send notification
        await this.notifier.notify(
          'milestone',
          '📋 Tasks Created',
          `Created ${tasks.length} tasks for requirement: ${requirement.title}`,
          'normal'
        );
      }

      console.log(`[WorkflowEngine] Workflow created with ${workflow.tasks.length} tasks`);
      return workflow;
    } catch (error) {
      workflow.status = 'failed';
      this.emitEvent({
        type: WorkflowEventType.WORKFLOW_FAILED,
        requirementId: requirement.id,
        timestamp: new Date(),
        data: { error: (error as Error).message },
      });
      throw error;
    }
  }

  /**
   * Analyze requirement and create development tasks
   * 智能分析需求并拆分成具体开发任务
   */
  private async analyzeAndCreateTasks(
    requirement: Requirement
  ): Promise<Task[]> {
    const tasks: Task[] = [];
    const taskTemplates = this.generateTaskTemplates(requirement);

    for (const template of taskTemplates) {
      // Resolve dependencies to actual task IDs
      const dependencies: string[] = [];
      for (const depName of template.dependencies) {
        const depTask = tasks.find((t) => t.name === depName);
        if (depTask) {
          dependencies.push(depTask.id);
        }
      }

      const task: Task = {
        id: uuidv4(),
        name: template.name,
        description: template.description,
        status: TaskStatus.PENDING,
        priority: template.priority,
        dependencies,
        createdAt: new Date(),
        retries: 0,
        maxRetries: 3,
      };

      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Generate task templates based on requirement
   * 根据需求生成任务模板
   */
  private generateTaskTemplates(
    requirement: Requirement
  ): WorkflowTaskTemplate[] {
    const templates: WorkflowTaskTemplate[] = [];
    const priority = this.mapPriority(requirement.priority);

    // Analyze requirement description for task types
    const desc = (requirement.description || '').toLowerCase();
    const title = requirement.title.toLowerCase();

    // Base tasks based on requirement analysis
    if (title.includes('api') || desc.includes('api') || desc.includes('接口')) {
      templates.push({
        name: '实现API接口',
        description: `实现${requirement.title}的API接口`,
        type: 'development',
        priority: TaskPriority.HIGH,
        estimatedDuration: 60,
        dependencies: [],
        action: 'create_api',
      });
    }

    if (title.includes('数据库') || desc.includes('database') || desc.includes('数据')) {
      templates.push({
        name: '设计数据库结构',
        description: `设计${requirement.title}的数据库结构`,
        type: 'infrastructure',
        priority: TaskPriority.HIGH,
        estimatedDuration: 30,
        dependencies: [],
        action: 'design_database',
      });
    }

    if (title.includes('前端') || desc.includes('frontend') || desc.includes('界面')) {
      templates.push({
        name: '开发前端界面',
        description: `开发${requirement.title}的前端界面`,
        type: 'development',
        priority: TaskPriority.NORMAL,
        estimatedDuration: 120,
        dependencies: [],
        action: 'create_frontend',
      });
    }

    if (title.includes('测试') || desc.includes('test')) {
      templates.push({
        name: '编写测试用例',
        description: `为${requirement.title}编写测试用例`,
        type: 'testing',
        priority: TaskPriority.NORMAL,
        estimatedDuration: 45,
        dependencies: [],
        action: 'write_tests',
      });
    }

    if (title.includes('文档') || desc.includes('docs')) {
      templates.push({
        name: '编写文档',
        description: `编写${requirement.title}的文档`,
        type: 'documentation',
        priority: TaskPriority.LOW,
        estimatedDuration: 30,
        dependencies: [],
        action: 'write_docs',
      });
    }

    // Default task if no specific type detected
    if (templates.length === 0) {
      templates.push({
        name: '分析需求',
        description: `分析并理解${requirement.title}`,
        type: 'development',
        priority: TaskPriority.NORMAL,
        estimatedDuration: 20,
        dependencies: [],
        action: 'analyze',
      });

      templates.push({
        name: '实现功能',
        description: `实现${requirement.title}的功能`,
        type: 'development',
        priority: priority,
        estimatedDuration: 120,
        dependencies: ['分析需求'],
        action: 'implement',
      });
    }

    // Add code review task for important requirements
    if (priority >= TaskPriority.HIGH) {
      const lastDevTask = templates.filter(
        (t) => t.type === 'development'
      ).pop();

      templates.push({
        name: '代码审查',
        description: `对${requirement.title}的代码进行审查`,
        type: 'testing',
        priority: TaskPriority.NORMAL,
        estimatedDuration: 30,
        dependencies: lastDevTask ? [lastDevTask.name] : [],
        action: 'code_review',
      });
    }

    return templates;
  }

  /**
   * Map requirement priority to task priority
   */
  private mapPriority(
    reqPriority: string
  ): TaskPriority {
    switch (reqPriority) {
      case 'critical':
        return TaskPriority.CRITICAL;
      case 'high':
        return TaskPriority.HIGH;
      case 'medium':
        return TaskPriority.NORMAL;
      case 'low':
      default:
        return TaskPriority.LOW;
    }
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get workflow by requirement ID
   */
  getWorkflowByRequirement(requirementId: string): Workflow | undefined {
    for (const workflow of this.workflows.values()) {
      if (workflow.requirementId === requirementId) {
        return workflow;
      }
    }
    return undefined;
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Update task status in workflow
   */
  updateTaskStatus(
    workflowId: string,
    taskId: string,
    status: TaskStatus
  ): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const task = workflow.tasks.find((t) => t.id === taskId);
    if (!task) return false;

    task.status = status;

    if (status === TaskStatus.COMPLETED) {
      task.completedAt = new Date();
      this.emitEvent({
        type: WorkflowEventType.TASK_COMPLETED,
        requirementId: workflow.requirementId,
        taskIds: [taskId],
        timestamp: new Date(),
        data: { taskName: task.name },
      });
    }

    // Check if workflow is complete
    const allCompleted = workflow.tasks.every(
      (t) => t.status === TaskStatus.COMPLETED
    );
    if (allCompleted && workflow.status === 'running') {
      workflow.status = 'completed';
      workflow.completedAt = new Date();
      this.emitEvent({
        type: WorkflowEventType.WORKFLOW_COMPLETED,
        requirementId: workflow.requirementId,
        taskIds: workflow.tasks.map((t) => t.id),
        timestamp: new Date(),
      });

      this.notifier.notifyCompletion(workflow.name);
    }

    return true;
  }

  /**
   * Subscribe to workflow events
   */
  onEvent(handler: WorkflowEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Emit workflow event
   */
  private emitEvent(event: WorkflowEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[WorkflowEngine] Event handler error:', error);
      }
    }
  }

  /**
   * Get workflow status
   */
  getStatus(): {
    totalWorkflows: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  } {
    let pending = 0,
      running = 0,
      completed = 0,
      failed = 0;

    for (const workflow of this.workflows.values()) {
      switch (workflow.status) {
        case 'pending':
          pending++;
          break;
        case 'running':
          running++;
          break;
        case 'completed':
          completed++;
          break;
        case 'failed':
          failed++;
          break;
      }
    }

    return {
      totalWorkflows: this.workflows.size,
      pending,
      running,
      completed,
      failed,
    };
  }
}

export default WorkflowEngine;
