import { v4 as uuidv4 } from 'uuid';
import { getDatabase, Knex } from '../connection';
import { User, CreateUserInput, UpdateUserInput } from '../entities/user.entity';

/**
 * 用户仓库 - 处理用户表的CRUD操作
 */
export class UserRepository {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 创建用户
   */
  async create(input: CreateUserInput): Promise<User> {
    const now = new Date();
    const id = uuidv4();

    await this.db('users').insert({
      id,
      username: input.username,
      email: input.email,
      display_name: input.displayName,
      role: input.role,
      notification_preferences: JSON.stringify(input.notificationPreferences || {}),
      config: JSON.stringify(input.config || {}),
      created_at: now,
      updated_at: now,
    });

    return this.findById(id) as Promise<User>;
  }

  /**
   * 根据ID查找用户
   */
  async findById(id: string): Promise<User | null> {
    const row = await this.db('users').where({ id }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    const row = await this.db('users').where({ username }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db('users').where({ email }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 获取所有用户
   */
  async findAll(): Promise<User[]> {
    const rows = await this.db('users').orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 更新用户
   */
  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (input.email !== undefined) updateData.email = input.email;
    if (input.displayName !== undefined) updateData.display_name = input.displayName;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.notificationPreferences !== undefined) {
      updateData.notification_preferences = JSON.stringify(input.notificationPreferences);
    }
    if (input.config !== undefined) updateData.config = JSON.stringify(input.config);
    if (input.lastLoginAt !== undefined) updateData.last_login_at = input.lastLoginAt;

    await this.db('users').where({ id }).update(updateData);
    return this.findById(id);
  }

  /**
   * 删除用户
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db('users').where({ id }).del();
    return result > 0;
  }

  /**
   * 将数据库行映射为实体对象
   */
  private mapToEntity(row: Record<string, unknown>): User {
    return {
      id: row.id as string,
      username: row.username as string,
      email: row.email as string | undefined,
      displayName: row.display_name as string | undefined,
      role: row.role as 'admin' | 'developer' | 'viewer',
      notificationPreferences: JSON.parse((row.notification_preferences as string) || '{}'),
      config: JSON.parse((row.config as string) || '{}'),
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
