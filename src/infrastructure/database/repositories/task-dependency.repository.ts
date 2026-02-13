import { v4 as uuidv4 } from 'uuid';
import { getDatabase, Knex } from '../connection';
import { TaskDependency, CreateTaskDependencyInput } from '../entities/task-dependency.entity';

/**
 * 任务依赖仓库 - 处理任务依赖表的CRUD操作
 */
export class TaskDependencyRepository {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 创建任务依赖
   */
  async create(input: CreateTaskDependencyInput): Promise<TaskDependency> {
    const id = uuidv4();

    await this.db('task_dependencies').insert({
      id,
      task_id: input.taskId,
      depends_on_id: input.dependsOnId,
      dependency_type: input.dependencyType || 'finish_to_start',
    });

    return this.findById(id) as Promise<TaskDependency>;
  }

  /**
   * 根据ID查找任务依赖
   */
  async findById(id: string): Promise<TaskDependency | null> {
    const row = await this.db('task_dependencies').where({ id }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据任务ID查找依赖
   */
  async findByTaskId(taskId: string): Promise<TaskDependency[]> {
    const rows = await this.db('task_dependencies').where({ task_id: taskId });
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据被依赖的任务ID查找依赖
   */
  async findByDependsOnId(dependsOnId: string): Promise<TaskDependency[]> {
    const rows = await this.db('task_dependencies').where({ depends_on_id: dependsOnId });
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 获取所有任务依赖
   */
  async findAll(): Promise<TaskDependency[]> {
    const rows = await this.db('task_dependencies');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 删除任务依赖
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db('task_dependencies').where({ id }).del();
    return result > 0;
  }

  /**
   * 删除某个任务的所有依赖
   */
  async deleteByTaskId(taskId: string): Promise<number> {
    const result = await this.db('task_dependencies').where({ task_id: taskId }).del();
    return result;
  }

  /**
   * 检查依赖是否已存在
   */
  async exists(taskId: string, dependsOnId: string): Promise<boolean> {
    const row = await this.db('task_dependencies')
      .where({ task_id: taskId, depends_on_id: dependsOnId })
      .first();
    return !!row;
  }

  /**
   * 将数据库行映射为实体对象
   */
  private mapToEntity(row: Record<string, unknown>): TaskDependency {
    return {
      id: row.id as string,
      taskId: row.task_id as string,
      dependsOnId: row.depends_on_id as string,
      dependencyType: row.dependency_type as 'finish_to_start',
    };
  }
}
