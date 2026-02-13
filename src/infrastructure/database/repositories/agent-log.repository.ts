import { v4 as uuidv4 } from 'uuid';
import { getDatabase, Knex } from '../connection';
import { AgentLog, CreateAgentLogInput } from '../entities/agent-log.entity';

/**
 * 代理日志仓库 - 处理代理日志表的CRUD操作
 */
export class AgentLogRepository {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 创建日志
   */
  async create(input: CreateAgentLogInput): Promise<AgentLog> {
    const id = uuidv4();

    await this.db('agent_logs').insert({
      id,
      agent_id: input.agentId,
      task_id: input.taskId,
      log_level: input.logLevel,
      message: input.message,
      metadata: JSON.stringify(input.metadata || {}),
      created_at: new Date(),
    });

    return this.findById(id) as Promise<AgentLog>;
  }

  /**
   * 批量创建日志
   */
  async createMany(logs: CreateAgentLogInput[]): Promise<number> {
    if (logs.length === 0) return 0;

    const inserts = logs.map((log) => ({
      id: uuidv4(),
      agent_id: log.agentId,
      task_id: log.taskId,
      log_level: log.logLevel,
      message: log.message,
      metadata: JSON.stringify(log.metadata || {}),
      created_at: new Date(),
    }));

    return this.db('agent_logs').insert(inserts);
  }

  /**
   * 根据ID查找日志
   */
  async findById(id: string): Promise<AgentLog | null> {
    const row = await this.db('agent_logs').where({ id }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据代理ID查找日志
   */
  async findByAgentId(agentId: string, limit = 100): Promise<AgentLog[]> {
    const rows = await this.db('agent_logs')
      .where({ agent_id: agentId })
      .orderBy('created_at', 'desc')
      .limit(limit);
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据任务ID查找日志
   */
  async findByTaskId(taskId: string, limit = 100): Promise<AgentLog[]> {
    const rows = await this.db('agent_logs')
      .where({ task_id: taskId })
      .orderBy('created_at', 'desc')
      .limit(limit);
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据日志级别查找日志
   */
  async findByLogLevel(
    logLevel: 'debug' | 'info' | 'warn' | 'error',
    limit = 100
  ): Promise<AgentLog[]> {
    const rows = await this.db('agent_logs')
      .where({ log_level: logLevel })
      .orderBy('created_at', 'desc')
      .limit(limit);
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 获取所有日志
   */
  async findAll(limit = 100): Promise<AgentLog[]> {
    const rows = await this.db('agent_logs').orderBy('created_at', 'desc').limit(limit);
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 删除日志
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db('agent_logs').where({ id }).del();
    return result > 0;
  }

  /**
   * 删除某个代理的所有日志
   */
  async deleteByAgentId(agentId: string): Promise<number> {
    const result = await this.db('agent_logs').where({ agent_id: agentId }).del();
    return result;
  }

  /**
   * 删除某个任务的所有日志
   */
  async deleteByTaskId(taskId: string): Promise<number> {
    const result = await this.db('agent_logs').where({ task_id: taskId }).del();
    return result;
  }

  /**
   * 将数据库行映射为实体对象
   */
  private mapToEntity(row: Record<string, unknown>): AgentLog {
    return {
      id: row.id as string,
      agentId: row.agent_id as string,
      taskId: row.task_id as string | undefined,
      logLevel: row.log_level as 'debug' | 'info' | 'warn' | 'error',
      message: row.message as string,
      metadata: JSON.parse((row.metadata as string) || '{}'),
      createdAt: new Date(row.created_at as string),
    };
  }
}
