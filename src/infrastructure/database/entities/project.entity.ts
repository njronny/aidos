/**
 * 项目实体
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  repositoryUrl?: string;
  defaultBranch: string;
  status: 'active' | 'archived' | 'completed';
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  repositoryUrl?: string;
  defaultBranch?: string;
  status?: 'active' | 'archived' | 'completed';
  config?: Record<string, unknown>;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  repositoryUrl?: string;
  defaultBranch?: string;
  status?: 'active' | 'archived' | 'completed';
  config?: Record<string, unknown>;
}
