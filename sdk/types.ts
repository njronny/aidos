// Aidos SDK - TypeScript Types

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: PaginationInfo;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  [key: string]: any;
}

// Project Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  status?: 'active' | 'completed' | 'archived';
}

// Requirement Types
export interface Requirement {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequirementDto {
  projectId: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface UpdateRequirementDto {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'pending' | 'in_progress' | 'completed' | 'rejected';
}

// Task Types
export interface Task {
  id: string;
  requirementId: string;
  agentId?: string;
  title: string;
  description?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  requirementId: string;
  title: string;
  description?: string;
  agentId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  agentId?: string;
  result?: string;
}

// Agent Types
export interface Agent {
  id: string;
  name: string;
  type: 'planner' | 'developer' | 'tester' | 'reviewer';
  status: 'idle' | 'busy' | 'offline';
  capabilities?: string[];
  currentTaskId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentDto {
  name: string;
  type: 'planner' | 'developer' | 'tester' | 'reviewer';
  capabilities?: string[];
}

export interface UpdateAgentDto {
  name?: string;
  type?: 'planner' | 'developer' | 'tester' | 'reviewer';
  status?: 'idle' | 'busy' | 'offline';
  capabilities?: string[];
  currentTaskId?: string;
}

// Client Config
export interface AidosClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

// SDK Error
export class AidosError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AidosError';
  }
}
