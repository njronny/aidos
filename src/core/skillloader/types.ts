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

// Security Types
export interface TrustedSource {
  name: string;
  pattern: RegExp;
  description: string;
  allowPattern?: string;
}

export interface SecurityPolicy {
  allowUntrusted: boolean;
  trustedSources: TrustedSource[];
  allowedOperations: string[];
  blockedOperations: string[];
  requireManifest: boolean;
  verifySignatures: boolean;
}

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Skill CLI Types
export interface SkillSearchResult {
  name: string;
  description: string;
  author: string;
  source: string;
  tags: string[];
}

export interface SkillUpdateInfo {
  skillId: string;
  name: string;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

export interface InstallResult {
  success: boolean;
  skillId?: string;
  error?: string;
}

export interface UpdateResult {
  success: boolean;
  updated: string[];
  errors: string[];
}
