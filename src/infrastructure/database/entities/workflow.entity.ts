/**
 * 工作流实体
 */
export interface Workflow {
  id: string;
  projectId: string;
  name: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  config: Record<string, unknown>;
  result?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkflowInput {
  projectId: string;
  name: string;
  status?: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress?: number;
  config?: Record<string, unknown>;
}

export interface UpdateWorkflowInput {
  name?: string;
  status?: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress?: number;
  config?: Record<string, unknown>;
  result?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
}
