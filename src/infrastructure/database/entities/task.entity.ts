/**
 * 任务实体
 */
export interface Task {
  id: string;
  projectId: string;
  requirementId?: string;
  title: string;
  description?: string;
  status: 'pending' | 'running' | 'waiting' | 'completed' | 'failed' | 'skipped';
  priority: number;
  estimatedDuration?: number;
  actualDuration?: number;
  agentType?: string;
  assignee?: string;
  result?: Record<string, unknown>;
  errorLog?: string;
  metadata: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskInput {
  projectId: string;
  requirementId?: string;
  title: string;
  description?: string;
  status?: 'pending' | 'running' | 'waiting' | 'completed' | 'failed' | 'skipped';
  priority?: number;
  estimatedDuration?: number;
  agentType?: string;
  assignee?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskInput {
  requirementId?: string;
  title?: string;
  description?: string;
  status?: 'pending' | 'running' | 'waiting' | 'completed' | 'failed' | 'skipped';
  priority?: number;
  estimatedDuration?: number;
  actualDuration?: number;
  agentType?: string;
  assignee?: string;
  result?: Record<string, unknown>;
  errorLog?: string;
  metadata?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
}
