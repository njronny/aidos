import { v4 as uuidv4 } from 'uuid';
import { getDatabase, Knex } from '../connection';
import { Commit, CreateCommitInput, UpdateCommitInput } from '../entities/commit.entity';

/**
 * Git提交仓库 - 处理提交表的CRUD操作
 */
export class CommitRepository {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 创建提交
   */
  async create(input: CreateCommitInput): Promise<Commit> {
    const now = new Date();
    const id = uuidv4();

    await this.db('commits').insert({
      id,
      project_id: input.projectId,
      task_id: input.taskId,
      commit_hash: input.commitHash,
      parent_hashes: input.parentHashes ? JSON.stringify(input.parentHashes) : null,
      branch: input.branch,
      message: input.message,
      author: input.author,
      author_email: input.authorEmail,
      files_changed: JSON.stringify(input.filesChanged || []),
      insertions: input.insertions || 0,
      deletions: input.deletions || 0,
      is_rollback: input.isRollback ? 1 : 0,
      rolled_back_by_id: input.rolledBackById,
      created_at: now,
    });

    return this.findById(id) as Promise<Commit>;
  }

  /**
   * 根据ID查找提交
   */
  async findById(id: string): Promise<Commit | null> {
    const row = await this.db('commits').where({ id }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据提交哈希查找提交
   */
  async findByCommitHash(commitHash: string): Promise<Commit | null> {
    const row = await this.db('commits').where({ commit_hash: commitHash }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据项目ID查找提交
   */
  async findByProjectId(projectId: string, limit = 100): Promise<Commit[]> {
    const rows = await this.db('commits')
      .where({ project_id: projectId })
      .orderBy('created_at', 'desc')
      .limit(limit);
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据任务ID查找提交
   */
  async findByTaskId(taskId: string): Promise<Commit[]> {
    const rows = await this.db('commits').where({ task_id: taskId }).orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据分支查找提交
   */
  async findByBranch(branch: string, limit = 100): Promise<Commit[]> {
    const rows = await this.db('commits')
      .where({ branch })
      .orderBy('created_at', 'desc')
      .limit(limit);
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据作者查找提交
   */
  async findByAuthor(author: string, limit = 100): Promise<Commit[]> {
    const rows = await this.db('commits')
      .where({ author })
      .orderBy('created_at', 'desc')
      .limit(limit);
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 获取所有提交
   */
  async findAll(limit = 100): Promise<Commit[]> {
    const rows = await this.db('commits').orderBy('created_at', 'desc').limit(limit);
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 更新提交
   */
  async update(id: string, input: UpdateCommitInput): Promise<Commit | null> {
    const updateData: Record<string, unknown> = {};

    if (input.taskId !== undefined) updateData.task_id = input.taskId;
    if (input.commitHash !== undefined) updateData.commit_hash = input.commitHash;
    if (input.parentHashes !== undefined)
      updateData.parent_hashes = JSON.stringify(input.parentHashes);
    if (input.branch !== undefined) updateData.branch = input.branch;
    if (input.message !== undefined) updateData.message = input.message;
    if (input.author !== undefined) updateData.author = input.author;
    if (input.authorEmail !== undefined) updateData.author_email = input.authorEmail;
    if (input.filesChanged !== undefined)
      updateData.files_changed = JSON.stringify(input.filesChanged);
    if (input.insertions !== undefined) updateData.insertions = input.insertions;
    if (input.deletions !== undefined) updateData.deletions = input.deletions;
    if (input.isRollback !== undefined) updateData.is_rollback = input.isRollback ? 1 : 0;
    if (input.rolledBackById !== undefined) updateData.rolled_back_by_id = input.rolledBackById;

    if (Object.keys(updateData).length === 0) {
      return this.findById(id);
    }

    await this.db('commits').where({ id }).update(updateData);
    return this.findById(id);
  }

  /**
   * 删除提交
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db('commits').where({ id }).del();
    return result > 0;
  }

  /**
   * 将数据库行映射为实体对象
   */
  private mapToEntity(row: Record<string, unknown>): Commit {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      taskId: row.task_id as string | undefined,
      commitHash: row.commit_hash as string,
      parentHashes: row.parent_hashes ? JSON.parse(row.parent_hashes as string) : undefined,
      branch: row.branch as string,
      message: row.message as string,
      author: row.author as string,
      authorEmail: row.author_email as string | undefined,
      filesChanged: JSON.parse((row.files_changed as string) || '[]'),
      insertions: row.insertions as number,
      deletions: row.deletions as number,
      isRollback: row.is_rollback === 1,
      rolledBackById: row.rolled_back_by_id as string | undefined,
      createdAt: new Date(row.created_at as string),
    };
  }
}
