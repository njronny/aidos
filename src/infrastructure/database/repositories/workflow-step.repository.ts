import { v4 as uuidv4 } from 'uuid';
import { getDatabase, Knex } from '../connection';
import {
  WorkflowStep,
  CreateWorkflowStepInput,
  UpdateWorkflowStepInput,
} from '../entities/workflow-step.entity';

/**
 * 工作流步骤仓库 - 处理工作流步骤表的CRUD操作
 */
export class WorkflowStepRepository {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 创建工作流步骤
   */
  async create(input: CreateWorkflowStepInput): Promise<WorkflowStep> {
    const now = new Date();
    const id = uuidv4();

    await this.db('workflow_steps').insert({
      id,
      workflow_id: input.workflowId,
      step_order: input.stepOrder,
      name: input.name,
      type: input.type,
      status: input.status || 'pending',
      started_at: input.status === 'running' ? now : null,
      created_at: now,
      updated_at: now,
    });

    return this.findById(id) as Promise<WorkflowStep>;
  }

  /**
   * 批量创建工作流步骤
   */
  async createMany(steps: CreateWorkflowStepInput[]): Promise<number> {
    if (steps.length === 0) return 0;

    const now = new Date();
    const inserts = steps.map((step) => ({
      id: uuidv4(),
      workflow_id: step.workflowId,
      step_order: step.stepOrder,
      name: step.name,
      type: step.type,
      status: step.status || 'pending',
      started_at: step.status === 'running' ? now : null,
      created_at: now,
      updated_at: now,
    }));

    return this.db('workflow_steps').insert(inserts);
  }

  /**
   * 根据ID查找工作流步骤
   */
  async findById(id: string): Promise<WorkflowStep | null> {
    const row = await this.db('workflow_steps').where({ id }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据工作流ID查找步骤
   */
  async findByWorkflowId(workflowId: string): Promise<WorkflowStep[]> {
    const rows = await this.db('workflow_steps')
      .where({ workflow_id: workflowId })
      .orderBy('step_order');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据状态查找步骤
   */
  async findByStatus(
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  ): Promise<WorkflowStep[]> {
    const rows = await this.db('workflow_steps').where({ status }).orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 获取所有步骤
   */
  async findAll(): Promise<WorkflowStep[]> {
    const rows = await this.db('workflow_steps').orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 更新工作流步骤
   */
  async update(id: string, input: UpdateWorkflowStepInput): Promise<WorkflowStep | null> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (input.stepOrder !== undefined) updateData.step_order = input.stepOrder;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.result !== undefined) updateData.result = JSON.stringify(input.result);
    if (input.startedAt !== undefined) updateData.started_at = input.startedAt;
    if (input.completedAt !== undefined) updateData.completed_at = input.completedAt;

    await this.db('workflow_steps').where({ id }).update(updateData);
    return this.findById(id);
  }

  /**
   * 开始步骤
   */
  async start(id: string): Promise<WorkflowStep | null> {
    return this.update(id, {
      status: 'running',
      startedAt: new Date(),
    });
  }

  /**
   * 完成步骤
   */
  async complete(id: string, result?: Record<string, unknown>): Promise<WorkflowStep | null> {
    return this.update(id, {
      status: 'completed',
      completedAt: new Date(),
      result,
    });
  }

  /**
   * 跳过步骤
   */
  async skip(id: string): Promise<WorkflowStep | null> {
    return this.update(id, {
      status: 'skipped',
      completedAt: new Date(),
    });
  }

  /**
   * 失败步骤
   */
  async fail(id: string, result?: Record<string, unknown>): Promise<WorkflowStep | null> {
    return this.update(id, {
      status: 'failed',
      completedAt: new Date(),
      result,
    });
  }

  /**
   * 删除工作流步骤
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db('workflow_steps').where({ id }).del();
    return result > 0;
  }

  /**
   * 删除工作流的所有步骤
   */
  async deleteByWorkflowId(workflowId: string): Promise<number> {
    const result = await this.db('workflow_steps').where({ workflow_id: workflowId }).del();
    return result;
  }

  /**
   * 将数据库行映射为实体对象
   */
  private mapToEntity(row: Record<string, unknown>): WorkflowStep {
    return {
      id: row.id as string,
      workflowId: row.workflow_id as string,
      stepOrder: row.step_order as number,
      name: row.name as string,
      type: row.type as string,
      status: row.status as 'pending' | 'running' | 'completed' | 'failed' | 'skipped',
      result: row.result ? JSON.parse(row.result as string) : undefined,
      startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
