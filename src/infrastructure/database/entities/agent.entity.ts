/**
 * 代理实体
 */
export interface Agent {
  id: string;
  name: string;
  role: 'PM' | 'PO' | 'Architect' | 'Dev' | 'QA' | 'DBA';
  status: 'idle' | 'busy' | 'offline';
  capabilities: string[];
  config: Record<string, unknown>;
  currentTaskId?: string;
  totalTasks: number;
  successRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentInput {
  name: string;
  role: 'PM' | 'PO' | 'Architect' | 'Dev' | 'QA' | 'DBA';
  status?: 'idle' | 'busy' | 'offline';
  capabilities?: string[];
  config?: Record<string, unknown>;
}

export interface UpdateAgentInput {
  name?: string;
  role?: 'PM' | 'PO' | 'Architect' | 'Dev' | 'QA' | 'DBA';
  status?: 'idle' | 'busy' | 'offline';
  capabilities?: string[];
  config?: Record<string, unknown>;
  currentTaskId?: string;
  totalTasks?: number;
  successRate?: number;
}
