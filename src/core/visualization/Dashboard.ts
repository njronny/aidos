/**
 * Dashboard - 项目仪表盘
 * 
 * 生成项目概览和统计
 */

import { ProjectRepository } from '../persistence/ProjectRepository';
import { TaskRepository } from '../persistence/TaskRepository';

export interface DashboardData {
  projects: ProjectSummary[];
  tasks: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  };
  overview: {
    activeProjects: number;
    completedProjects: number;
    totalTasks: number;
    failedTasks: number;
  };
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  progress: number;
  taskStats: {
    total: number;
    completed: number;
    failed: number;
    running: number;
  };
  lastActivity?: number;
}

export interface Alert {
  type: 'error' | 'warning' | 'info';
  message: string;
  projectId?: string;
  taskId?: string;
}

export class Dashboard {
  private projectRepo: ProjectRepository;
  private taskRepo: TaskRepository;

  constructor() {
    this.projectRepo = new ProjectRepository();
    this.taskRepo = new TaskRepository();
  }

  /**
   * 生成仪表盘数据
   */
  async generate(): Promise<DashboardData> {
    const projects = await this.projectRepo.list();
    const tasks = await this.taskRepo.list();

    const taskStats = this.calculateTaskStats(tasks);

    const projectSummaries: ProjectSummary[] = [];
    for (const project of projects) {
      const summary = await this.getProjectSummary(project.id);
      if (summary) {
        projectSummaries.push(summary);
      }
    }

    return {
      projects: projectSummaries,
      tasks: taskStats,
      overview: {
        activeProjects: projects.filter(p => p.status === 'active').length,
        completedProjects: projects.filter(p => p.status === 'completed').length,
        totalTasks: tasks.length,
        failedTasks: tasks.filter(t => t.status === 'failed').length,
      },
    };
  }

  /**
   * 获取项目摘要
   */
  async getProjectSummary(projectId: string): Promise<ProjectSummary | undefined> {
    const project = await this.projectRepo.get(projectId);
    if (!project) {
      return undefined;
    }

    const tasks = await this.taskRepo.getByProject(projectId);
    const taskStats = this.calculateTaskStats(tasks);

    const total = tasks.length;
    const completed = taskStats.byStatus?.completed || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      progress,
      taskStats: {
        total,
        completed,
        failed: taskStats.byStatus?.failed || 0,
        running: taskStats.byStatus?.running || 0,
      },
      lastActivity: project.updatedAt,
    };
  }

  /**
   * 计算任务统计
   */
  private calculateTaskStats(tasks: any[]): {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  } {
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const task of tasks) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byType[task.type] = (byType[task.type] || 0) + 1;
    }

    return {
      total: tasks.length,
      byStatus,
      byType,
    };
  }

  /**
   * 获取告警
   */
  async getAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const tasks = await this.taskRepo.list();
    const projects = await this.projectRepo.list();

    // 检查失败的任务
    const failedTasks = tasks.filter(t => t.status === 'failed');
    for (const task of failedTasks) {
      alerts.push({
        type: 'error',
        message: `Task "${task.name}" failed`,
        taskId: task.id,
        projectId: task.projectId,
      });
    }

    // 检查停滞的项目
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const project of projects) {
      if (project.status === 'active' && project.updatedAt && project.updatedAt < oneDayAgo) {
        alerts.push({
          type: 'warning',
          message: `Project "${project.name}" has no activity in 24 hours`,
          projectId: project.id,
        });
      }
    }

    // 检查超时的任务
    const runningTasks = tasks.filter(t => t.status === 'running');
    for (const task of runningTasks) {
      if (task.startedAt && (Date.now() - task.startedAt) > 30 * 60 * 1000) {
        alerts.push({
          type: 'warning',
          message: `Task "${task.name}" running for over 30 minutes`,
          taskId: task.id,
          projectId: task.projectId,
        });
      }
    }

    return alerts;
  }

  /**
   * 刷新数据
   */
  async refresh(): Promise<void> {
    // 可以在这里添加缓存刷新逻辑
  }
}

export default Dashboard;
