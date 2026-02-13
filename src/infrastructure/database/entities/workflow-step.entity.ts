/**
 * 工作流步骤实体
 */
export interface WorkflowStep {
  id: string;
  workflowId: string;
  stepOrder: number;
  name: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkflowStepInput {
  workflowId: string;
  stepOrder: number;
  name: string;
  type: string;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
}

export interface UpdateWorkflowStepInput {
  stepOrder?: number;
  name?: string;
  type?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
}
