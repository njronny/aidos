// Context Manager Types
export interface ContextData {
  projectName: string;
  projectPath: string;
  description?: string;
  agents: AgentContext[];
  files: FileContext[];
  config: ProjectConfig;
  history: ContextHistory[];
}

export interface AgentContext {
  id: string;
  role: string;
  capabilities: string[];
  currentTask?: string;
  memory?: string;
}

export interface FileContext {
  path: string;
  type: 'file' | 'directory';
  content?: string;
  language?: string;
  lastModified?: Date;
}

export interface ProjectConfig {
  language: string;
  framework?: string;
  testing?: string;
  linter?: string;
  formatter?: string;
}

export interface ContextHistory {
  timestamp: Date;
  event: string;
  data?: unknown;
}

export interface ContextSnapshot {
  id: string;
  timestamp: Date;
  data: ContextData;
}
