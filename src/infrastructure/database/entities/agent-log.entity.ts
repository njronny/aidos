/**
 * 代理日志实体
 */
export interface AgentLog {
  id: string;
  agentId: string;
  taskId?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateAgentLogInput {
  agentId: string;
  taskId?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}
