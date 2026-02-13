import { v4 as uuidv4 } from 'uuid';
import { getDatabase, Knex } from '../connection';
import {
  Requirement,
  CreateRequirementInput,
  UpdateRequirementInput,
} from '../entities/requirement.entity';

/**
 * 需求仓库 - 处理需求表的CRUD操作
 */
export class RequirementRepository {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 创建需求
   */
  async create(input: CreateRequirementInput): Promise<Requirement> {
    const now = new Date();
    const id = uuidv4();

    await this.db('requirements').insert({
      id,
      project_id: input.projectId,
      title: input.title,
      content: input.content,
      parsed_content: input.parsedContent ? JSON.stringify(input.parsedContent) : null,
      status: input.status || 'pending',
      priority: input.priority || 'medium',
      risk_level: input.riskLevel,
      risk_notes: input.riskNotes,
      ai_model: input.aiModel,
      created_at: now,
      updated_at: now,
    });

    return this.findById(id) as Promise<Requirement>;
  }

  /**
   * 根据ID查找需求
   */
  async findById(id: string): Promise<Requirement | null> {
    const row = await this.db('requirements').where({ id }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据项目ID查找需求
   */
  async findByProjectId(projectId: string): Promise<Requirement[]> {
    const rows = await this.db('requirements')
      .where({ project_id: projectId })
      .orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据状态查找需求
   */
  async findByStatus(
    status: 'pending' | 'analyzing' | 'analyzed' | 'rejected'
  ): Promise<Requirement[]> {
    const rows = await this.db('requirements').where({ status }).orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 获取所有需求
   */
  async findAll(): Promise<Requirement[]> {
    const rows = await this.db('requirements').orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 更新需求
   */
  async update(id: string, input: UpdateRequirementInput): Promise<Requirement | null> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.parsedContent !== undefined) {
      updateData.parsed_content = JSON.stringify(input.parsedContent);
    }
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.riskLevel !== undefined) updateData.risk_level = input.riskLevel;
    if (input.riskNotes !== undefined) updateData.risk_notes = input.riskNotes;
    if (input.aiModel !== undefined) updateData.ai_model = input.aiModel;

    await this.db('requirements').where({ id }).update(updateData);
    return this.findById(id);
  }

  /**
   * 删除需求
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db('requirements').where({ id }).del();
    return result > 0;
  }

  /**
   * 将数据库行映射为实体对象
   */
  private mapToEntity(row: Record<string, unknown>): Requirement {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      title: row.title as string,
      content: row.content as string,
      parsedContent: row.parsed_content ? JSON.parse(row.parsed_content as string) : undefined,
      status: row.status as 'pending' | 'analyzing' | 'analyzed' | 'rejected',
      priority: row.priority as 'low' | 'medium' | 'high' | 'critical',
      riskLevel: row.risk_level as 'low' | 'medium' | 'high' | undefined,
      riskNotes: row.risk_notes as string | undefined,
      aiModel: row.ai_model as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
