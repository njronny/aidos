/**
 * TaskRepository - 任务状态仓库
 * 
 * 管理任务状态和依赖关系
 */

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskType = 'development' | 'testing' | 'deployment' | 'documentation' | 'review';

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
  statusHistory?: { status: TaskStatus; timestamp: number }[];
  result?: any;
  error?: string;
  createdAt: number;
  updatedAt?: number;
  startedAt?: number;
  completedAt?: number;
}

export interface TaskFilter {
  projectId?: string;
  status?: TaskStatus;
  type?: TaskType;
}

export class TaskRepository {
  private tasks: Map<string, Task> = new Map();

  /**
   * 创建任务
   */
  async create(task: Partial<Task>): Promise<Task> {
    const now = Date.now();
    const newTask: Task = {
      id: task.id || `task-${now}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: task.projectId || 'default',
      name: task.name || 'Untitled Task',
      description: task.description,
      type: task.type || 'development',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      dependencies: task.dependencies || [],
      statusHistory: task.statusHistory || [],
      result: task.result,
      error: task.error,
      createdAt: task.createdAt || now,
      updatedAt: now,
    };

    // 记录初始状态
    newTask.statusHistory!.push({
      status: newTask.status,
      timestamp: now,
    });

    this.tasks.set(newTask.id, newTask);
    return newTask;
  }

  /**
   * 获取任务
   */
  async get(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  /**
   * 获取项目下的所有任务
   */
  async getByProject(projectId: string): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(t => t.projectId === projectId);
  }

  /**
   * 按状态查找
   */
  async findByStatus(status: TaskStatus): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(t => t.status === status);
  }

  /**
   * 列出任务
   */
  async list(filter?: TaskFilter): Promise<Task[]> {
    let results = Array.from(this.tasks.values());

    if (filter?.projectId) {
      results = results.filter(t => t.projectId === filter.projectId);
    }

    if (filter?.status) {
      results = results.filter(t => t.status === filter.status);
    }

    if (filter?.type) {
      results = results.filter(t => t.type === filter.type);
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 更新任务状态
   */
  async updateStatus(id: string, status: TaskStatus): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) {
      return undefined;
    }

    const now = Date.now();
    task.status = status;
    task.updatedAt = now;
    task.statusHistory!.push({ status, timestamp: now });

    if (status === 'running' && !task.startedAt) {
      task.startedAt = now;
    }

    if (status === 'completed' || status === 'failed') {
      task.completedAt = now;
    }

    this.tasks.set(id, task);
    return task;
  }

  /**
   * 添加依赖
   */
  async addDependency(taskId: string, dependsOn: string): Promise<Task | undefined> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return undefined;
    }

    if (!task.dependencies) {
      task.dependencies = [];
    }

    if (!task.dependencies.includes(dependsOn)) {
      task.dependencies.push(dependsOn);
      this.tasks.set(taskId, task);
    }

    return task;
  }

  /**
   * 移除依赖
   */
  async removeDependency(taskId: string, dependsOn: string): Promise<Task | undefined> {
    const task = this.tasks.get(taskId);
    if (!task || !task.dependencies) {
      return undefined;
    }

    task.dependencies = task.dependencies.filter(d => d !== dependsOn);
    this.tasks.set(taskId, task);
    return task;
  }

  /**
   * 获取可执行任务（依赖已满足）
   */
  async getRunnableTasks(projectId: string): Promise<Task[]> {
    const tasks = await this.getByProject(projectId);
    
    return tasks.filter(task => {
      if (task.status !== 'pending') return false;
      if (!task.dependencies || task.dependencies.length === 0) return true;

      // 检查所有依赖是否完成
      return task.dependencies.every(depId => {
        const dep = this.tasks.get(depId);
        return dep?.status === 'completed';
      });
    });
  }

  /**
   * 更新任务结果
   */
  async setResult(id: string, result: any, error?: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) {
      return undefined;
    }

    task.result = result;
    task.error = error;
    task.updatedAt = Date.now();

    this.tasks.set(id, task);
    return task;
  }

  /**
   * 删除任务
   */
  async delete(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  /**
   * 统计
   */
  async count(projectId?: string): Promise<Record<TaskStatus, number>> {
    const tasks = projectId 
      ? await this.getByProject(projectId)
      : Array.from(this.tasks.values());

    const stats: Record<TaskStatus, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const task of tasks) {
      stats[task.status]++;
    }

    return stats;
  }
}

export default TaskRepository;
