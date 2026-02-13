import { v4 as uuidv4 } from 'uuid';
import { getDatabase, Knex } from '../connection';
import { Task, CreateTaskInput, UpdateTaskInput } from '../entities/task.entity';

/**
 * 任务仓库 - 处理任务表的CRUD操作
 */
export class TaskRepository {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 创建任务
   */
  async create(input: CreateTaskInput): Promise<Task> {
    const now = new Date();
    const id = uuidv4();

    await this.db('tasks').insert({
      id,
      project_id: input.projectId,
      requirement_id: input.requirementId,
      title: input.title,
      description: input.description,
      status: input.status || 'pending',
      priority: input.priority || 0,
      estimated_duration: input.estimatedDuration,
      agent_type: input.agentType,
      assignee: input.assignee,
      metadata: JSON.stringify(input.metadata || {}),
      created_at: now,
      updated_at: now,
    });

    return this.findById(id) as Promise<Task>;
  }

  /**
   * 根据ID查找任务
   */
  async findById(id: string): Promise<Task | null> {
    const row = await this.db('tasks').where({ id }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据项目ID查找任务
   */
  async findByProjectId(projectId: string): Promise<Task[]> {
    const rows = await this.db('tasks')
      .where({ project_id: projectId })
      .orderBy('priority', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据需求ID查找任务
   */
  async findByRequirementId(requirementId: string): Promise<Task[]> {
    const rows = await this.db('tasks')
      .where({ requirement_id: requirementId })
      .orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据状态查找任务
   */
  async findByStatus(
    status: 'pending' | 'running' | 'waiting' | 'completed' | 'failed' | 'skipped'
  ): Promise<Task[]> {
    const rows = await this.db('tasks').where({ status }).orderBy('priority', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据分配者查找任务
   */
  async findByAssignee(assignee: string): Promise<Task[]> {
    const rows = await this.db('tasks').where({ assignee }).orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 获取所有任务
   */
  async findAll(): Promise<Task[]> {
    const rows = await this.db('tasks').orderBy('priority', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 获取待执行任务（按优先级排序）
   */
  async findPendingTasks(): Promise<Task[]> {
    const rows = await this.db('tasks')
      .whereIn('status', ['pending', 'waiting'])
      .orderBy('priority', 'desc')
      .orderBy('created_at', 'asc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 更新任务
   */
  async update(id: string, input: UpdateTaskInput): Promise<Task | null> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (input.requirementId !== undefined) updateData.requirement_id = input.requirementId;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.estimatedDuration !== undefined)
      updateData.estimated_duration = input.estimatedDuration;
    if (input.actualDuration !== undefined) updateData.actual_duration = input.actualDuration;
    if (input.agentType !== undefined) updateData.agent_type = input.agentType;
    if (input.assignee !== undefined) updateData.assignee = input.assignee;
    if (input.result !== undefined) updateData.result = JSON.stringify(input.result);
    if (input.errorLog !== undefined) updateData.error_log = input.errorLog;
    if (input.metadata !== undefined) updateData.metadata = JSON.stringify(input.metadata);
    if (input.startedAt !== undefined) updateData.started_at = input.startedAt;
    if (input.completedAt !== undefined) updateData.completed_at = input.completedAt;

    await this.db('tasks').where({ id }).update(updateData);
    return this.findById(id);
  }

  /**
   * 删除任务
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db('tasks').where({ id }).del();
    return result > 0;
  }

  /**
   * 将数据库行映射为实体对象
   */
  private mapToEntity(row: Record<string, unknown>): Task {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      requirementId: row.requirement_id as string | undefined,
      title: row.title as string,
      description: row.description as string | undefined,
      status: row.status as 'pending' | 'running' | 'waiting' | 'completed' | 'failed' | 'skipped',
      priority: row.priority as number,
      estimatedDuration: row.estimated_duration as number | undefined,
      actualDuration: row.actual_duration as number | undefined,
      agentType: row.agent_type as string | undefined,
      assignee: row.assignee as string | undefined,
      result: row.result ? JSON.parse(row.result as string) : undefined,
      errorLog: row.error_log as string | undefined,
      metadata: JSON.parse((row.metadata as string) || '{}'),
      startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
