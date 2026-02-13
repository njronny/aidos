import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Skill, SkillManifest, SkillLoaderConfig, SkillLoadResult, LoadedSkill } from './types';

/**
 * SkillLoader - Skill Loading Module
 * Loads and manages external skills for the development system
 */
export class SkillLoader {
  private config: SkillLoaderConfig;
  private skills: Map<string, Skill> = new Map();
  private loadedSkills: Map<string, LoadedSkill> = new Map();

  constructor(config: Partial<SkillLoaderConfig> = {}) {
    this.config = {
      skillsPath: config.skillsPath ?? './skills',
      autoLoad: config.autoLoad ?? true,
      cacheEnabled: config.cacheEnabled ?? true,
      versionCheck: config.versionCheck ?? true,
    };
  }

  /**
   * Initialize skill loader
   */
  async initialize(): Promise<void> {
    // Create skills directory if not exists
    try {
      await fs.mkdir(this.config.skillsPath, { recursive: true });
    } catch {
      // Directory may already exist
    }

    // Auto-load skills if enabled
    if (this.config.autoLoad) {
      await this.loadAllSkills();
    }
  }

  /**
   * Load all skills from skills directory
   */
  async loadAllSkills(): Promise<SkillLoadResult[]> {
    const results: SkillLoadResult[] = [];

    try {
      const entries = await fs.readdir(this.config.skillsPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(this.config.skillsPath, entry.name);
          const result = await this.loadSkill(skillPath);
          results.push(result);
        }
      }
    } catch (error) {
      console.error('Failed to load skills:', error);
    }

    return results;
  }

  /**
   * Load a specific skill
   */
  async loadSkill(skillPath: string): Promise<SkillLoadResult> {
    try {
      // Check if already loaded (from cache)
      const skillId = path.basename(skillPath);
      if (this.loadedSkills.has(skillId) && this.config.cacheEnabled) {
        const cached = this.loadedSkills.get(skillId)!;
        return {
          success: true,
          skill: this.skills.get(skillId),
        };
      }

      // Read manifest
      const manifestPath = path.join(skillPath, 'skill.json');
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: SkillManifest = JSON.parse(manifestContent);

      // Create skill object
      const skill: Skill = {
        id: manifest.id || skillId,
        name: manifest.name,
        description: manifest.description,
        version: manifest.version,
        author: manifest.author,
        tags: manifest.tags || [],
        enabled: manifest.config?.autoLoad ?? true,
        config: manifest.config || {},
        loadedAt: new Date(),
      };

      // Load skill module if exists
      let module: unknown;
      const indexPath = path.join(skillPath, 'index.js');
      try {
        module = await import(indexPath);
      } catch {
        // Module may not exist, that's ok
      }

      // Store loaded skill
      this.skills.set(skillId, skill);
      this.loadedSkills.set(skillId, {
        manifest,
        path: skillPath,
        module,
      });

      return { success: true, skill };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Unload a skill
   */
  unloadSkill(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (skill) {
      this.skills.delete(skillId);
      this.loadedSkills.delete(skillId);
      return true;
    }
    return false;
  }

  /**
   * Enable a skill
   */
  enableSkill(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (skill) {
      skill.enabled = true;
      return true;
    }
    return false;
  }

  /**
   * Disable a skill
   */
  disableSkill(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (skill) {
      skill.enabled = false;
      return true;
    }
    return false;
  }

  /**
   * Get skill by ID
   */
  getSkill(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  /**
   * Get all skills
   */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get enabled skills only
   */
  getEnabledSkills(): Skill[] {
    return this.getAllSkills().filter((s) => s.enabled);
  }

  /**
   * Search skills by tag
   */
  searchByTag(tag: string): Skill[] {
    return this.getAllSkills().filter((s) =>
      s.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
    );
  }

  /**
   * Search skills by name
   */
  searchByName(name: string): Skill[] {
    return this.getAllSkills().filter((s) => s.name.toLowerCase().includes(name.toLowerCase()));
  }

  /**
   * Get loaded skill module
   */
  getSkillModule(skillId: string): unknown {
    const loaded = this.loadedSkills.get(skillId);
    return loaded?.module;
  }

  /**
   * Create a new skill
   */
  async createSkill(
    name: string,
    description: string,
    version: string,
    tags: string[] = []
  ): Promise<string> {
    const skillId = uuidv4();
    const skillPath = path.join(this.config.skillsPath, skillId);

    // Create skill directory
    await fs.mkdir(skillPath, { recursive: true });

    // Create manifest
    const manifest: SkillManifest = {
      id: skillId,
      name,
      description,
      version,
      tags,
      files: ['index.js', 'skill.json'],
      config: {
        autoLoad: true,
        priority: 0,
      },
    };

    await fs.writeFile(path.join(skillPath, 'skill.json'), JSON.stringify(manifest, null, 2));

    // Create index file template
    const indexTemplate = `// Skill: ${name}
// Version: ${version}

module.exports = {
  name: '${name}',
  version: '${version}',
  
  // Initialize skill
  init: async (config) => {
    console.log('Initializing skill: ${name}');
  },
  
  // Execute skill
  execute: async (context) => {
    console.log('Executing skill: ${name}');
    return { success: true };
  },
  
  // Cleanup
  destroy: async () => {
    console.log('Destroying skill: ${name}');
  },
};
`;

    await fs.writeFile(path.join(skillPath, 'index.js'), indexTemplate);

    // Load the newly created skill
    await this.loadSkill(skillPath);

    return skillId;
  }

  /**
   * Update skill configuration
   */
  updateSkillConfig(skillId: string, config: Partial<Skill['config']>): boolean {
    const skill = this.skills.get(skillId);
    if (skill) {
      skill.config = { ...skill.config, ...config };
      return true;
    }
    return false;
  }

  /**
   * Delete a skill
   */
  async deleteSkill(skillId: string): Promise<boolean> {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    // Unload first
    this.unloadSkill(skillId);

    // Delete directory
    try {
      const skillPath = path.join(this.config.skillsPath, skillId);
      await fs.rm(skillPath, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): SkillLoaderConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SkillLoaderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default SkillLoader;
