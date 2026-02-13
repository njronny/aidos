import { v4 as uuidv4 } from 'uuid';
import { getDatabase, Knex } from '../connection';
import { Skill, CreateSkillInput, UpdateSkillInput } from '../entities/skill.entity';

/**
 * 技能仓库 - 处理技能表的CRUD操作
 */
export class SkillRepository {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 创建技能
   */
  async create(input: CreateSkillInput): Promise<Skill> {
    const now = new Date();
    const id = uuidv4();

    await this.db('skills').insert({
      id,
      name: input.name,
      version: input.version,
      description: input.description,
      source: input.source,
      content: input.content,
      config_schema: input.configSchema ? JSON.stringify(input.configSchema) : null,
      is_builtin: input.isBuiltin ? 1 : 0,
      project_id: input.projectId,
      enabled: input.enabled !== false ? 1 : 0,
      created_at: now,
      updated_at: now,
    });

    return this.findById(id) as Promise<Skill>;
  }

  /**
   * 根据ID查找技能
   */
  async findById(id: string): Promise<Skill | null> {
    const row = await this.db('skills').where({ id }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据名称查找技能
   */
  async findByName(name: string): Promise<Skill | null> {
    const row = await this.db('skills').where({ name }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据项目ID查找技能
   */
  async findByProjectId(projectId: string): Promise<Skill[]> {
    const rows = await this.db('skills')
      .where({ project_id: projectId })
      .orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 获取所有启用的技能
   */
  async findEnabled(): Promise<Skill[]> {
    const rows = await this.db('skills').where({ enabled: 1 }).orderBy('name');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 获取所有内置技能
   */
  async findBuiltin(): Promise<Skill[]> {
    const rows = await this.db('skills').where({ is_builtin: 1 }).orderBy('name');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 获取全局技能（无项目关联）
   */
  async findGlobal(): Promise<Skill[]> {
    const rows = await this.db('skills').whereNull('project_id').orderBy('name');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 获取所有技能
   */
  async findAll(): Promise<Skill[]> {
    const rows = await this.db('skills').orderBy('name');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 更新技能
   */
  async update(id: string, input: UpdateSkillInput): Promise<Skill | null> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.version !== undefined) updateData.version = input.version;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.source !== undefined) updateData.source = input.source;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.configSchema !== undefined)
      updateData.config_schema = JSON.stringify(input.configSchema);
    if (input.isBuiltin !== undefined) updateData.is_builtin = input.isBuiltin ? 1 : 0;
    if (input.projectId !== undefined) updateData.project_id = input.projectId;
    if (input.enabled !== undefined) updateData.enabled = input.enabled ? 1 : 0;

    await this.db('skills').where({ id }).update(updateData);
    return this.findById(id);
  }

  /**
   * 删除技能
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db('skills').where({ id }).del();
    return result > 0;
  }

  /**
   * 将数据库行映射为实体对象
   */
  private mapToEntity(row: Record<string, unknown>): Skill {
    return {
      id: row.id as string,
      name: row.name as string,
      version: row.version as string,
      description: row.description as string | undefined,
      source: row.source as string | undefined,
      content: row.content as string | undefined,
      configSchema: row.config_schema ? JSON.parse(row.config_schema as string) : undefined,
      isBuiltin: row.is_builtin === 1,
      projectId: row.project_id as string | undefined,
      enabled: row.enabled === 1,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
