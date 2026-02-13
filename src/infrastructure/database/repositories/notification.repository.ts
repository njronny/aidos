import { v4 as uuidv4 } from 'uuid';
import { getDatabase, Knex } from '../connection';
import {
  Notification,
  CreateNotificationInput,
  UpdateNotificationInput,
} from '../entities/notification.entity';

/**
 * 通知仓库 - 处理通知表的CRUD操作
 */
export class NotificationRepository {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 创建通知
   */
  async create(input: CreateNotificationInput): Promise<Notification> {
    const now = new Date();
    const id = uuidv4();

    await this.db('notifications').insert({
      id,
      project_id: input.projectId,
      task_id: input.taskId,
      type: input.type,
      channel: input.channel,
      recipient: input.recipient,
      title: input.title,
      content: input.content,
      status: input.status || 'pending',
      response: input.response ? JSON.stringify(input.response) : null,
      created_at: now,
    });

    return this.findById(id) as Promise<Notification>;
  }

  /**
   * 根据ID查找通知
   */
  async findById(id: string): Promise<Notification | null> {
    const row = await this.db('notifications').where({ id }).first();
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * 根据项目ID查找通知
   */
  async findByProjectId(projectId: string, limit = 100): Promise<Notification[]> {
    const rows = await this.db('notifications')
      .where({ project_id: projectId })
      .orderBy('created_at', 'desc')
      .limit(limit);
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据任务ID查找通知
   */
  async findByTaskId(taskId: string): Promise<Notification[]> {
    const rows = await this.db('notifications')
      .where({ task_id: taskId })
      .orderBy('created_at', 'desc');
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据状态查找通知
   */
  async findByStatus(status: 'pending' | 'sent' | 'failed', limit = 100): Promise<Notification[]> {
    const rows = await this.db('notifications')
      .where({ status })
      .orderBy('created_at', 'desc')
      .limit(limit);
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 根据渠道查找通知
   */
  async findByChannel(channel: string, limit = 100): Promise<Notification[]> {
    const rows = await this.db('notifications')
      .where({ channel })
      .orderBy('created_at', 'desc')
      .limit(limit);
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 获取所有通知
   */
  async findAll(limit = 100): Promise<Notification[]> {
    const rows = await this.db('notifications').orderBy('created_at', 'desc').limit(limit);
    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * 更新通知
   */
  async update(id: string, input: UpdateNotificationInput): Promise<Notification | null> {
    const updateData: Record<string, unknown> = {};

    if (input.projectId !== undefined) updateData.project_id = input.projectId;
    if (input.taskId !== undefined) updateData.task_id = input.taskId;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.channel !== undefined) updateData.channel = input.channel;
    if (input.recipient !== undefined) updateData.recipient = input.recipient;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.response !== undefined) updateData.response = JSON.stringify(input.response);
    if (input.sentAt !== undefined) updateData.sent_at = input.sentAt;

    if (Object.keys(updateData).length === 0) {
      return this.findById(id);
    }

    await this.db('notifications').where({ id }).update(updateData);
    return this.findById(id);
  }

  /**
   * 标记通知为已发送
   */
  async markAsSent(id: string, response?: Record<string, unknown>): Promise<Notification | null> {
    return this.update(id, {
      status: 'sent',
      sentAt: new Date(),
      response,
    });
  }

  /**
   * 标记通知为失败
   */
  async markAsFailed(id: string, response?: Record<string, unknown>): Promise<Notification | null> {
    return this.update(id, {
      status: 'failed',
      response,
    });
  }

  /**
   * 删除通知
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db('notifications').where({ id }).del();
    return result > 0;
  }

  /**
   * 将数据库行映射为实体对象
   */
  private mapToEntity(row: Record<string, unknown>): Notification {
    return {
      id: row.id as string,
      projectId: row.project_id as string | undefined,
      taskId: row.task_id as string | undefined,
      type: row.type as string,
      channel: row.channel as string,
      recipient: row.recipient as string,
      title: row.title as string | undefined,
      content: row.content as string,
      status: row.status as 'pending' | 'sent' | 'failed',
      response: row.response ? JSON.parse(row.response as string) : undefined,
      sentAt: row.sent_at ? new Date(row.sent_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
    };
  }
}
