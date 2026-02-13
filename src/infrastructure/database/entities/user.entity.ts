/**
 * 用户实体
 */
export interface User {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  role: 'admin' | 'developer' | 'viewer';
  notificationPreferences: Record<string, unknown>;
  config: Record<string, unknown>;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  username: string;
  email?: string;
  displayName?: string;
  role: 'admin' | 'developer' | 'viewer';
  notificationPreferences?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export interface UpdateUserInput {
  email?: string;
  displayName?: string;
  role?: 'admin' | 'developer' | 'viewer';
  notificationPreferences?: Record<string, unknown>;
  config?: Record<string, unknown>;
  lastLoginAt?: Date;
}
