import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskStatus, TaskResult } from '../../types';

/**
 * 任务状态快照 - 用于持久化任务状态
 */
export interface TaskStateSnapshot {
  taskId: string;
  taskName: string;
  status: TaskStatus;
  progress: number; // 0-100
  currentStep?: string;
  completedSteps: string[];
  result?: TaskResult;
  error?: string;
  startedAt?: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 任务状态管理器配置
 */
export interface TaskStateManagerConfig {
  storagePath: string;
  autoSaveInterval: number; // milliseconds
  maxSnapshotsPerTask: number;
  enableCompression: boolean;
}

/**
 * 任务状态管理器 - 负责任务状态的持久化和恢复
 * 支持断点续传和进程重启后的自动恢复
 */
export class TaskStateManager {
  private config: TaskStateManagerConfig;
  private taskStates: Map<string, TaskStateSnapshot> = new Map();
  private saveTimers: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized: boolean = false;

  constructor(config: Partial<TaskStateManagerConfig> = {}) {
    this.config = {
      storagePath: config.storagePath || path.join(process.cwd(), 'data', 'task-states'),
      autoSaveInterval: config.autoSaveInterval || 30000, // 30秒
      maxSnapshotsPerTask: config.maxSnapshotsPerTask || 10,
      enableCompression: config.enableCompression || false,
    };
  }

  /**
   * 初始化任务状态管理器
   * - 创建存储目录
   * - 加载已存在的任务状态
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await fs.mkdir(this.config.storagePath, { recursive: true });
      await this.loadAllTaskStates();
      this.isInitialized = true;
      console.log(`[TaskStateManager] Initialized at ${this.config.storagePath}`);
    } catch (error) {
      console.error('[TaskStateManager] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * 创建任务状态
   */
  async createTaskState(
    taskId: string,
    taskName: string,
    metadata?: Record<string, unknown>
  ): Promise<TaskStateSnapshot> {
    const snapshot: TaskStateSnapshot = {
      taskId,
      taskName,
      status: TaskStatus.PENDING,
      progress: 0,
      completedSteps: [],
      updatedAt: new Date(),
      metadata,
    };

    this.taskStates.set(taskId, snapshot);
    await this.saveTaskState(taskId);
    this.startAutoSave(taskId);

    return snapshot;
  }

  /**
   * 更新任务状态
   */
  async updateTaskState(
    taskId: string,
    updates: Partial<Omit<TaskStateSnapshot, 'taskId' | 'taskName'>>
  ): Promise<TaskStateSnapshot | null> {
    const snapshot = this.taskStates.get(taskId);
    if (!snapshot) {
      console.warn(`[TaskStateManager] Task state not found: ${taskId}`);
      return null;
    }

    // 幂等更新 - 相同状态不重复处理
    if (updates.status === snapshot.status && updates.progress === snapshot.progress) {
      return snapshot;
    }

    const updatedSnapshot: TaskStateSnapshot = {
      ...snapshot,
      ...updates,
      updatedAt: new Date(),
    };

    // 如果任务完成，记录完成步骤
    if (updates.currentStep && !snapshot.completedSteps.includes(updates.currentStep)) {
      updatedSnapshot.completedSteps.push(updates.currentStep);
    }

    this.taskStates.set(taskId, updatedSnapshot);
    await this.saveTaskState(taskId);

    return updatedSnapshot;
  }

  /**
   * 更新任务进度
   */
  async updateProgress(taskId: string, progress: number): Promise<void> {
    await this.updateTaskState(taskId, { progress: Math.min(100, Math.max(0, progress)) });
  }

  /**
   * 更新当前执行步骤
   */
  async updateCurrentStep(taskId: string, step: string): Promise<void> {
    const snapshot = this.taskStates.get(taskId);
    if (!snapshot) return;

    const completedSteps = [...snapshot.completedSteps];
    if (!completedSteps.includes(step)) {
      completedSteps.push(step);
    }

    await this.updateTaskState(taskId, {
      currentStep: step,
      completedSteps,
      progress: Math.round((completedSteps.length / (completedSteps.length + 1)) * 100),
    });
  }

  /**
   * 标记任务为运行中
   */
  async markRunning(taskId: string): Promise<void> {
    await this.updateTaskState(taskId, {
      status: TaskStatus.RUNNING,
      startedAt: new Date(),
      progress: 0,
    });
  }

  /**
   * 标记任务为完成
   */
  async markCompleted(taskId: string, result?: TaskResult): Promise<void> {
    this.stopAutoSave(taskId);
    await this.updateTaskState(taskId, {
      status: TaskStatus.COMPLETED,
      progress: 100,
      result,
      currentStep: undefined,
    });
  }

  /**
   * 标记任务为失败
   */
  async markFailed(taskId: string, error: string): Promise<void> {
    this.stopAutoSave(taskId);
    await this.updateTaskState(taskId, {
      status: TaskStatus.FAILED,
      error,
      currentStep: undefined,
    });
  }

  /**
   * 获取任务状态
   */
  getTaskState(taskId: string): TaskStateSnapshot | undefined {
    return this.taskStates.get(taskId);
  }

  /**
   * 获取所有任务状态
   */
  getAllTaskStates(): TaskStateSnapshot[] {
    return Array.from(this.taskStates.values());
  }

  /**
   * 获取运行中的任务状态
   */
  getRunningTasks(): TaskStateSnapshot[] {
    return Array.from(this.taskStates.values()).filter(
      (task) => task.status === TaskStatus.RUNNING
    );
  }

  /**
   * 获取待恢复的任务（进程重启后需要恢复的任务）
   */
  getRecoverableTasks(): TaskStateSnapshot[] {
    return Array.from(this.taskStates.values()).filter(
      (task) => task.status === TaskStatus.RUNNING || task.status === TaskStatus.PENDING
    );
  }

  /**
   * 从持久化存储恢复任务状态
   */
  async recoverTaskState(taskId: string): Promise<TaskStateSnapshot | null> {
    const snapshot = this.taskStates.get(taskId);
    if (!snapshot) {
      return null;
    }

    // 幂等检查 - 如果任务已完成或失败，不需要恢复
    if (snapshot.status === TaskStatus.COMPLETED || snapshot.status === TaskStatus.FAILED) {
      console.log(`[TaskStateManager] Task ${taskId} already ${snapshot.status}, skipping recovery`);
      return snapshot;
    }

    // 恢复任务状态为待处理，等待重新调度
    await this.updateTaskState(taskId, {
      status: TaskStatus.PENDING,
      progress: snapshot.progress,
    });

    return this.taskStates.get(taskId) || null;
  }

  /**
   * 删除任务状态
   */
  async deleteTaskState(taskId: string): Promise<void> {
    this.stopAutoSave(taskId);
    this.taskStates.delete(taskId);

    try {
      const filePath = this.getStateFilePath(taskId);
      await fs.unlink(filePath);
    } catch (error) {
      // 文件不存在忽略错误
    }
  }

  /**
   * 保存任务状态到磁盘
   */
  private async saveTaskState(taskId: string): Promise<void> {
    const snapshot = this.taskStates.get(taskId);
    if (!snapshot) return;

    const filePath = this.getStateFilePath(taskId);
    const content = JSON.stringify(snapshot, null, 2);

    try {
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      console.error(`[TaskStateManager] Failed to save task state: ${taskId}`, error);
    }
  }

  /**
   * 加载所有任务状态
   */
  private async loadAllTaskStates(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.storagePath);
      const stateFiles = files.filter((f) => f.endsWith('.json'));

      for (const file of stateFiles) {
        try {
          const filePath = path.join(this.config.storagePath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const snapshot = JSON.parse(content) as TaskStateSnapshot;

          // 恢复Date对象
          if (snapshot.startedAt) {
            snapshot.startedAt = new Date(snapshot.startedAt);
          }
          snapshot.updatedAt = new Date(snapshot.updatedAt);

          this.taskStates.set(snapshot.taskId, snapshot);
        } catch (error) {
          console.error(`[TaskStateManager] Failed to load state from ${file}:`, error);
        }
      }

      console.log(`[TaskStateManager] Loaded ${this.taskStates.size} task states`);
    } catch (error) {
      // 目录不存在，忽略错误
    }
  }

  /**
   * 获取状态文件路径
   */
  private getStateFilePath(taskId: string): string {
    return path.join(this.config.storagePath, `${taskId}.json`);
  }

  /**
   * 启动自动保存
   */
  private startAutoSave(taskId: string): void {
    if (this.saveTimers.has(taskId)) {
      return;
    }

    const timer = setInterval(async () => {
      await this.saveTaskState(taskId);
    }, this.config.autoSaveInterval);

    this.saveTimers.set(taskId, timer);
  }

  /**
   * 停止自动保存
   */
  private stopAutoSave(taskId: string): void {
    const timer = this.saveTimers.get(taskId);
    if (timer) {
      clearInterval(timer);
      this.saveTimers.delete(taskId);
    }
  }

  /**
   * 关闭并清理资源
   */
  async close(): Promise<void> {
    // 停止所有自动保存定时器
    for (const [taskId, timer] of this.saveTimers) {
      clearInterval(timer);
      // 保存最终状态
      await this.saveTaskState(taskId);
    }
    this.saveTimers.clear();
    this.taskStates.clear();
    this.isInitialized = false;
  }

  /**
   * 获取管理器配置
   */
  getConfig(): TaskStateManagerConfig {
    return { ...this.config };
  }

  /**
   * 检查任务是否正在运行
   */
  isTaskRunning(taskId: string): boolean {
    const snapshot = this.taskStates.get(taskId);
    return snapshot?.status === TaskStatus.RUNNING;
  }

  /**
   * 获取任务进度百分比
   */
  getTaskProgress(taskId: string): number {
    return this.taskStates.get(taskId)?.progress || 0;
  }
}

export default TaskStateManager;
