import { v4 as uuidv4 } from 'uuid';
import { getDatabase, Knex } from '../connection';
import { Project, CreateProjectInput, UpdateProjectInput } from '../entities/project.entity';

/**
 * 项目仓库 - 处理项目表的CRUD操作
 */
export class ProjectRepository {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 创建项目
   */
  async create(input: CreateProjectInput): Promise<Project> {
    const now = new Date();
    const id = uuidv4();

    await this.db('projects').insert({
      id,
      name: input.name,
      description: input.description,
      repository_url: input.repositoryUrl,
      default_branch: input.defaultBranch || 'main',
      status: input.status || 'active',
      config: JSON.stringify(input.config || {}),
      created_at: now,
      updated_at: now,
    });

    return this.findById(id) as Promise<Project>;
  }

  /**
   * 根据ID查找项目
   */
  async findById(id: string): Promise<Project | null> {
    const row = await this.db('projects').where({ id }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据名称查找项目
   */
  async findByName(name: string): Promise<Project | null> {
    const row = await this.db('projects').where({ name }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 获取所有项目
   */
  async findAll(): Promise<Project[]> {
    const rows = await this.db('projects').orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据状态获取项目
   */
  async findByStatus(status: 'active' | 'archived' | 'completed'): Promise<Project[]> {
    const rows = await this.db('projects').where({ status }).orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 更新项目
   */
  async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.repositoryUrl !== undefined) updateData.repository_url = input.repositoryUrl;
    if (input.defaultBranch !== undefined) updateData.default_branch = input.defaultBranch;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.config !== undefined) updateData.config = JSON.stringify(input.config);

    await this.db('projects').where({ id }).update(updateData);
    return this.findById(id);
  }

  /**
   * 删除项目
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db('projects').where({ id }).del();
    return result > 0;
  }

  /**
   * 将数据库行映射为实体对象
   */
  private mapToEntity(row: Record<string, unknown>): Project {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      repositoryUrl: row.repository_url as string | undefined,
      defaultBranch: row.default_branch as string,
      status: row.status as 'active' | 'archived' | 'completed',
      config: JSON.parse((row.config as string) || '{}'),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
