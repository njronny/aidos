/**
 * ProjectRepository - 项目数据仓库
 * 
 * 管理项目数据的持久化
 */

export type ProjectStatus = 'active' | 'completed' | 'archived' | 'paused';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdAt: number;
  updatedAt?: number;
  metadata?: Record<string, any>;
}

export interface ProjectFilter {
  status?: ProjectStatus;
  search?: string;
}

export class ProjectRepository {
  private projects: Map<string, Project> = new Map();

  /**
   * 创建项目
   */
  async create(project: Partial<Project>): Promise<Project> {
    const now = Date.now();
    const newProject: Project = {
      id: project.id || `proj-${now}-${Math.random().toString(36).substr(2, 9)}`,
      name: project.name || 'Untitled Project',
      description: project.description,
      status: project.status || 'active',
      createdAt: project.createdAt || now,
      updatedAt: now,
      metadata: project.metadata,
    };

    this.projects.set(newProject.id, newProject);
    return newProject;
  }

  /**
   * 获取项目
   */
  async get(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  /**
   * 列出所有项目
   */
  async list(filter?: ProjectFilter): Promise<Project[]> {
    let results = Array.from(this.projects.values());

    if (filter?.status) {
      results = results.filter(p => p.status === filter.status);
    }

    if (filter?.search) {
      const search = filter.search.toLowerCase();
      results = results.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search)
      );
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 更新项目
   */
  async update(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) {
      return undefined;
    }

    const updated: Project = {
      ...project,
      ...updates,
      id: project.id, // 保护 id
      createdAt: project.createdAt, // 保护 createdAt
      updatedAt: Date.now(),
    };

    this.projects.set(id, updated);
    return updated;
  }

  /**
   * 删除项目
   */
  async delete(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  /**
   * 按状态查找
   */
  async findByStatus(status: ProjectStatus): Promise<Project[]> {
    return this.list({ status });
  }

  /**
   * 统计项目数量
   */
  async count(status?: ProjectStatus): Promise<number> {
    if (status) {
      return (await this.findByStatus(status)).length;
    }
    return this.projects.size;
  }

  /**
   * 清理旧项目
   */
  async cleanup(olderThanDays: number): Promise<number> {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [id, project] of this.projects) {
      if (project.status === 'completed' && project.updatedAt && project.updatedAt < cutoff) {
        this.projects.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}

export default ProjectRepository;
