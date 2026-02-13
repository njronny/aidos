import { Requirement } from '../../api/types';
import { Task, TaskStatus } from '../../types';
import { WorkflowEngine, Workflow, WorkflowEvent, WorkflowEventType } from '../workflow';
import { TaskExecutor, AgentExecutionResult } from '../executor';
import { Notifier } from '../notifier/Notifier';
import { TaskRepository } from '../../infrastructure/database/repositories/task.repository';
import { wsManager } from '../../api/websocket';
import { AgentPool, AgentType, AssignmentStrategy } from '../agents';

/**
 * Workflow Service - 工作流服务
 * 整合WorkflowEngine、TaskExecutor和AgentPool，处理需求到任务执行的全流程
 * 支持实时任务执行和WebSocket推送
 * 支持代理池自动分配
 */
export class WorkflowService {
  private workflowEngine: WorkflowEngine;
  private taskExecutor: TaskExecutor;
  private taskRepository: TaskRepository;
  private notifier: Notifier;
  private agentPool: AgentPool;

  constructor(notifier?: Notifier) {
    this.notifier = notifier ?? new Notifier();
    this.workflowEngine = new WorkflowEngine({}, this.notifier);
    this.taskRepository = new TaskRepository();
    this.taskExecutor = new TaskExecutor({}, this.notifier, undefined, this.taskRepository);
    
    // 初始化代理池
    this.agentPool = new AgentPool({
      maxConcurrentTasksPerAgent: 1,
      taskTimeout: 300000,
      enableAutoAssignment: true,
      fallbackEnabled: true,
    }, AssignmentStrategy.CAPABILITY_MATCH);

    // Listen to workflow events
    this.workflowEngine.onEvent(this.handleWorkflowEvent.bind(this));
    
    console.log('[WorkflowService] AgentPool initialized with 6 agents');
  }

  /**
   * 获取代理池实例
   */
  getAgentPool(): AgentPool {
    return this.agentPool;
  }

  /**
   * Handle workflow events
   */
  private async handleWorkflowEvent(event: WorkflowEvent): Promise<void> {
    console.log(`[WorkflowService] Workflow event: ${event.type}`);

    switch (event.type) {
      case WorkflowEventType.TASKS_CREATED:
        // Auto-execute created tasks immediately
        if (event.taskIds && event.taskIds.length > 0) {
          console.log(`[WorkflowService] ${event.taskIds.length} tasks created, executing immediately...`);
          // Push flow update to notify frontend
          if (event.requirementId) {
            this.pushFlowUpdate(event.requirementId);
          }
          await this.executeWorkflowTasks(event.requirementId);
        }
        break;

      case WorkflowEventType.TASK_COMPLETED:
        // Check if all tasks completed
        await this.checkWorkflowCompletion(event.requirementId);
        // Push flow update
        if (event.requirementId) {
          this.pushFlowUpdate(event.requirementId);
        }
        break;

      case WorkflowEventType.WORKFLOW_COMPLETED:
        await this.notifier.notifyCompletion('Workflow completed');
        // Push final flow update
        if (event.requirementId) {
          this.pushFlowUpdate(event.requirementId);
        }
        break;
    }
  }

  /**
   * Push flow update via WebSocket
   */
  private pushFlowUpdate(requirementId: string): void {
    try {
      const workflow = this.workflowEngine.getWorkflowByRequirement(requirementId);
      if (workflow) {
        wsManager.pushFlowUpdate(requirementId, {
          workflowId: workflow.id,
          name: workflow.name,
          status: workflow.status,
          tasks: workflow.tasks.map(t => ({
            id: t.id,
            name: t.name,
            status: t.status,
            priority: t.priority,
          })),
        });
      }
    } catch (error) {
      console.error('[WorkflowService] Failed to push flow update:', error);
    }
  }

  /**
   * Process a new requirement - 主入口
   * 当有新需求时，自动分析并拆分成具体开发任务，并立即执行
   * 同时使用代理池自动分配给合适的代理
   */
  async processRequirement(requirement: Requirement): Promise<Workflow> {
    console.log(`[WorkflowService] Processing requirement: ${requirement.title}`);

    // Use workflow engine to analyze and create tasks
    const workflow = await this.workflowEngine.processRequirement(requirement);

    console.log(`[WorkflowService] Created ${workflow.tasks.length} tasks, executing immediately...`);

    // 使用代理池自动分配任务给合适的代理
    await this.assignTasksToAgents(requirement);

    // Execute tasks immediately after creation
    if (workflow.tasks.length > 0) {
      await this.executeWorkflowTasks(requirement.id);
    }

    return workflow;
  }

  /**
   * 使用代理池自动分配任务
   * 根据任务类型分配给合适的代理处理
   */
  private async assignTasksToAgents(requirement: Requirement): Promise<void> {
    console.log(`[WorkflowService] Assigning tasks to agents for requirement: ${requirement.title}`);
    
    try {
      // 使用代理池根据需求自动分配
      const agentResults = await this.agentPool.assignForRequirement({
        title: requirement.title,
        description: requirement.description || '',
      });

      // 输出各代理的处理结果
      for (const [agentType, result] of agentResults) {
        if (result.success) {
          console.log(`[WorkflowService] ✅ ${agentType} completed: ${result.output?.substring(0, 50)}...`);
        } else {
          console.log(`[WorkflowService] ❌ ${agentType} failed: ${result.error}`);
        }
      }
      
      // 获取代理池状态
      const poolStatus = this.agentPool.getStatus();
      console.log(`[WorkflowService] AgentPool status: ${poolStatus.idleAgents}/${poolStatus.totalAgents} idle`);
      
    } catch (error) {
      console.error('[WorkflowService] Error assigning tasks to agents:', error);
    }
  }

  /**
   * Execute all pending tasks in a workflow - 同步执行
   */
  async executeWorkflowTasks(requirementId: string): Promise<void> {
    const workflow = this.workflowEngine.getWorkflowByRequirement(requirementId);
    if (!workflow) {
      console.error(`[WorkflowService] Workflow not found for requirement: ${requirementId}`);
      return;
    }

    // Get pending tasks
    const pendingTasks = workflow.tasks.filter(
      (t) => t.status === TaskStatus.PENDING
    );

    console.log(`[WorkflowService] Executing ${pendingTasks.length} tasks synchronously`);

    // Execute tasks one by one synchronously
    for (const task of pendingTasks) {
      try {
        // Update task status to running in workflow
        this.workflowEngine.updateTaskStatus(workflow.id, task.id, TaskStatus.RUNNING);
        
        // Push task update via WebSocket
        wsManager.pushTaskUpdate(task.id, 'running');

        // Execute task - this will also update database and push WebSocket
        const result = await this.taskExecutor.execute(task);

        // Update task status based on result
        if (result.success) {
          this.workflowEngine.updateTaskStatus(workflow.id, task.id, TaskStatus.COMPLETED);
          wsManager.pushTaskUpdate(task.id, 'completed', result.output);
        } else {
          this.workflowEngine.updateTaskStatus(workflow.id, task.id, TaskStatus.FAILED);
          wsManager.pushTaskUpdate(task.id, 'failed', result.output);
        }
      } catch (error) {
        console.error(`[WorkflowService] Task execution failed: ${task.name}`, error);
        this.workflowEngine.updateTaskStatus(workflow.id, task.id, TaskStatus.FAILED);
        wsManager.pushTaskUpdate(task.id, 'failed', String(error));
      }
    }
  }

  /**
   * Check if workflow is complete and notify
   */
  private async checkWorkflowCompletion(requirementId: string): Promise<void> {
    const workflow = this.workflowEngine.getWorkflowByRequirement(requirementId);
    if (!workflow) return;

    const allCompleted = workflow.tasks.every(
      (t) => t.status === TaskStatus.COMPLETED
    );

    if (allCompleted) {
      await this.notifier.notifyCompletion(`All tasks for "${workflow.name}" completed`);
    }
  }

  /**
   * Get workflow by requirement ID
   */
  getWorkflow(requirementId: string): Workflow | undefined {
    return this.workflowEngine.getWorkflowByRequirement(requirementId);
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): Workflow[] {
    return this.workflowEngine.getAllWorkflows();
  }

  /**
   * Get workflow engine status
   */
  getWorkflowStatus() {
    return this.workflowEngine.getStatus();
  }

  /**
   * Get agent pool status
   */
  getAgentPoolStatus() {
    return this.agentPool.getStatus();
  }

  /**
   * Get task executor status
   */
  getExecutorStatus() {
    return this.taskExecutor.getStatus();
  }

  /**
   * Get task executor
   */
  getTaskExecutor(): TaskExecutor {
    return this.taskExecutor;
  }

  /**
   * Get workflow engine
   */
  getWorkflowEngine(): WorkflowEngine {
    return this.workflowEngine;
  }
}

// Singleton instance
let workflowServiceInstance: WorkflowService | null = null;

export function getWorkflowService(): WorkflowService {
  if (!workflowServiceInstance) {
    workflowServiceInstance = new WorkflowService();
  }
  return workflowServiceInstance;
}

export default WorkflowService;
