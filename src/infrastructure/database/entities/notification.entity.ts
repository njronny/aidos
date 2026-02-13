/**
 * 通知实体
 */
export interface Notification {
  id: string;
  projectId?: string;
  taskId?: string;
  type: string;
  channel: string;
  recipient: string;
  title?: string;
  content: string;
  status: 'pending' | 'sent' | 'failed';
  response?: Record<string, unknown>;
  sentAt?: Date;
  createdAt: Date;
}

export interface CreateNotificationInput {
  projectId?: string;
  taskId?: string;
  type: string;
  channel: string;
  recipient: string;
  title?: string;
  content: string;
  status?: 'pending' | 'sent' | 'failed';
  response?: Record<string, unknown>;
}

export interface UpdateNotificationInput {
  projectId?: string;
  taskId?: string;
  type?: string;
  channel?: string;
  recipient?: string;
  title?: string;
  content?: string;
  status?: 'pending' | 'sent' | 'failed';
  response?: Record<string, unknown>;
  sentAt?: Date;
}
