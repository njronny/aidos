import { v4 as uuidv4 } from 'uuid';
import { getDatabase, Knex } from '../connection';
import { Workflow, CreateWorkflowInput, UpdateWorkflowInput } from '../entities/workflow.entity';

/**
 * 工作流仓库 - 处理工作流表的CRUD操作
 */
export class WorkflowRepository {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 创建工作流
   */
  async create(input: CreateWorkflowInput): Promise<Workflow> {
    const now = new Date();
    const id = uuidv4();

    await this.db('workflows').insert({
      id,
      project_id: input.projectId,
      name: input.name,
      status: input.status || 'pending',
      progress: input.progress || 0,
      config: JSON.stringify(input.config || {}),
      started_at: input.status === 'running' ? now : null,
      created_at: now,
      updated_at: now,
    });

    return this.findById(id) as Promise<Workflow>;
  }

  /**
   * 根据ID查找工作流
   */
  async findById(id: string): Promise<Workflow | null> {
    const row = await this.db('workflows').where({ id }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据项目ID查找工作流
   */
  async findByProjectId(projectId: string): Promise<Workflow[]> {
    const rows = await this.db('workflows')
      .where({ project_id: projectId })
      .orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据状态查找工作流
   */
  async findByStatus(
    status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  ): Promise<Workflow[]> {
    const rows = await this.db('workflows').where({ status }).orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 获取所有工作流
   */
  async findAll(): Promise<Workflow[]> {
    const rows = await this.db('workflows').orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 更新工作流
   */
  async update(id: string, input: UpdateWorkflowInput): Promise<Workflow | null> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.progress !== undefined) updateData.progress = input.progress;
    if (input.config !== undefined) updateData.config = JSON.stringify(input.config);
    if (input.result !== undefined) updateData.result = JSON.stringify(input.result);
    if (input.startedAt !== undefined) updateData.started_at = input.startedAt;
    if (input.completedAt !== undefined) updateData.completed_at = input.completedAt;

    await this.db('workflows').where({ id }).update(updateData);
    return this.findById(id);
  }

  /**
   * 开始工作流
   */
  async start(id: string): Promise<Workflow | null> {
    return this.update(id, {
      status: 'running',
      startedAt: new Date(),
    });
  }

  /**
   * 暂停工作流
   */
  async pause(id: string): Promise<Workflow | null> {
    return this.update(id, {
      status: 'paused',
    });
  }

  /**
   * 完成工作流
   */
  async complete(id: string, result?: Record<string, unknown>): Promise<Workflow | null> {
    return this.update(id, {
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      result,
    });
  }

  /**
   * 失败工作流
   */
  async fail(id: string, result?: Record<string, unknown>): Promise<Workflow | null> {
    return this.update(id, {
      status: 'failed',
      completedAt: new Date(),
      result,
    });
  }

  /**
   * 更新进度
   */
  async updateProgress(id: string, progress: number): Promise<Workflow | null> {
    return this.update(id, { progress });
  }

  /**
   * 删除工作流
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db('workflows').where({ id }).del();
    return result > 0;
  }

  /**
   * 将数据库行映射为实体对象
   */
  private mapToEntity(row: Record<string, unknown>): Workflow {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      name: row.name as string,
      status: row.status as 'pending' | 'running' | 'paused' | 'completed' | 'failed',
      progress: row.progress as number,
      config: JSON.parse((row.config as string) || '{}'),
      result: row.result ? JSON.parse(row.result as string) : undefined,
      startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
