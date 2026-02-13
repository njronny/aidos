// SkillLoader Types
export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  tags: string[];
  enabled: boolean;
  config: SkillConfig;
  loadedAt?: Date;
}

export interface SkillConfig {
  autoLoad?: boolean;
  priority?: number;
  required?: boolean;
  options?: Record<string, unknown>;
}

export interface SkillManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  tags: string[];
  files: string[];
  dependencies?: string[];
  config?: SkillConfig;
}

export interface LoadedSkill {
  manifest: SkillManifest;
  path: string;
  module?: unknown;
}

export interface SkillLoaderConfig {
  skillsPath: string;
  autoLoad: boolean;
  cacheEnabled: boolean;
  versionCheck: boolean;
}

export interface SkillLoadResult {
  success: boolean;
  skill?: Skill;
  error?: string;
}
