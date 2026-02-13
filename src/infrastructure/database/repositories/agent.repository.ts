import { v4 as uuidv4 } from 'uuid';
import { getDatabase, Knex } from '../connection';
import { Agent, CreateAgentInput, UpdateAgentInput } from '../entities/agent.entity';

/**
 * 代理仓库 - 处理代理表的CRUD操作
 */
export class AgentRepository {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 创建代理
   */
  async create(input: CreateAgentInput): Promise<Agent> {
    const now = new Date();
    const id = uuidv4();

    await this.db('agents').insert({
      id,
      name: input.name,
      role: input.role,
      status: input.status || 'idle',
      capabilities: JSON.stringify(input.capabilities || []),
      config: JSON.stringify(input.config || {}),
      total_tasks: 0,
      created_at: now,
      updated_at: now,
    });

    return this.findById(id) as Promise<Agent>;
  }

  /**
   * 根据ID查找代理
   */
  async findById(id: string): Promise<Agent | null> {
    const row = await this.db('agents').where({ id }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据名称查找代理
   */
  async findByName(name: string): Promise<Agent | null> {
    const row = await this.db('agents').where({ name }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据角色查找代理
   */
  async findByRole(role: 'PM' | 'PO' | 'Architect' | 'Dev' | 'QA' | 'DBA'): Promise<Agent[]> {
    const rows = await this.db('agents').where({ role }).orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据状态查找代理
   */
  async findByStatus(status: 'idle' | 'busy' | 'offline'): Promise<Agent[]> {
    const rows = await this.db('agents').where({ status }).orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 获取所有代理
   */
  async findAll(): Promise<Agent[]> {
    const rows = await this.db('agents').orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 更新代理
   */
  async update(id: string, input: UpdateAgentInput): Promise<Agent | null> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.capabilities !== undefined)
      updateData.capabilities = JSON.stringify(input.capabilities);
    if (input.config !== undefined) updateData.config = JSON.stringify(input.config);
    if (input.currentTaskId !== undefined) updateData.current_task_id = input.currentTaskId;
    if (input.totalTasks !== undefined) updateData.total_tasks = input.totalTasks;
    if (input.successRate !== undefined) updateData.success_rate = input.successRate;

    await this.db('agents').where({ id }).update(updateData);
    return this.findById(id);
  }

  /**
   * 删除代理
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db('agents').where({ id }).del();
    return result > 0;
  }

  /**
   * 将数据库行映射为实体对象
   */
  private mapToEntity(row: Record<string, unknown>): Agent {
    return {
      id: row.id as string,
      name: row.name as string,
      role: row.role as 'PM' | 'PO' | 'Architect' | 'Dev' | 'QA' | 'DBA',
      status: row.status as 'idle' | 'busy' | 'offline',
      capabilities: JSON.parse((row.capabilities as string) || '[]'),
      config: JSON.parse((row.config as string) || '{}'),
      currentTaskId: row.current_task_id as string | undefined,
      totalTasks: row.total_tasks as number,
      successRate: row.success_rate as number | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
