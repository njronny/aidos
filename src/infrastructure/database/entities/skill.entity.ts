/**
 * 技能实体
 */
export interface Skill {
  id: string;
  name: string;
  version: string;
  description?: string;
  source?: string;
  content?: string;
  configSchema?: Record<string, unknown>;
  isBuiltin: boolean;
  projectId?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSkillInput {
  name: string;
  version: string;
  description?: string;
  source?: string;
  content?: string;
  configSchema?: Record<string, unknown>;
  isBuiltin?: boolean;
  projectId?: string;
  enabled?: boolean;
}

export interface UpdateSkillInput {
  name?: string;
  version?: string;
  description?: string;
  source?: string;
  content?: string;
  configSchema?: Record<string, unknown>;
  isBuiltin?: boolean;
  projectId?: string;
  enabled?: boolean;
}
