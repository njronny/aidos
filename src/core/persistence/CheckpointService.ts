import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * 检查点数据 - 保存任务执行的中间状态
 */
export interface CheckpointData {
  checkpointId: string;
  taskId: string;
  stepIndex: number;
  stepName: string;
  progress: number; // 0-100
  state: Record<string, unknown>;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 检查点元数据
 */
export interface CheckpointMetadata {
  checkpointId: string;
  taskId: string;
  totalSteps: number;
  currentStep: number;
  progress: number;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * 检查点服务配置
 */
export interface CheckpointServiceConfig {
  checkpointDir: string;
  checkpointInterval: number; // milliseconds
  maxCheckpointsPerTask: number;
  checkpointRetentionDays: number;
  enableIncrementalCheckpoint: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<CheckpointServiceConfig> = {
  checkpointDir: path.join(process.cwd(), 'data', 'checkpoints'),
  checkpointInterval: 60000, // 1分钟
  maxCheckpointsPerTask: 10,
  checkpointRetentionDays: 7,
  enableIncrementalCheckpoint: true,
};

/**
 * 检查点服务 - 负责定期保存任务执行进度并支持从检查点恢复
 */
export class CheckpointService {
  private config: Required<CheckpointServiceConfig>;
  private currentCheckpoints: Map<string, CheckpointData> = new Map();
  private checkpointTimers: Map<string, NodeJS.Timeout> = new Map();
  private stepState: Map<string, Record<string, unknown>> = new Map();
  private isInitialized: boolean = false;

  constructor(config: Partial<CheckpointServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<CheckpointServiceConfig>;
  }

  /**
   * 初始化检查点服务
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await fs.mkdir(this.config.checkpointDir, { recursive: true });
      await this.cleanupOldCheckpoints();
      this.isInitialized = true;
      console.log(`[CheckpointService] Initialized at ${this.config.checkpointDir}`);
    } catch (error) {
      console.error('[CheckpointService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * 为任务创建检查点
   * 幂等设计：重复创建相同步骤的检查点不会重复保存
   */
  async createCheckpoint(
    taskId: string,
    stepIndex: number,
    stepName: string,
    state: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<CheckpointData> {
    // 检查是否已存在相同步骤的检查点（幂等检查）
    const existingKey = `${taskId}:${stepIndex}`;
    const existingCheckpoint = this.currentCheckpoints.get(existingKey);

    if (existingCheckpoint) {
      // 如果状态相同，跳过创建
      if (JSON.stringify(existingCheckpoint.state) === JSON.stringify(state)) {
        console.log(`[CheckpointService] Checkpoint for ${existingKey} already exists with same state`);
        return existingCheckpoint;
      }

      // 状态不同，更新检查点
      const updated: CheckpointData = {
        ...existingCheckpoint,
        state,
        createdAt: new Date(),
      };
      this.currentCheckpoints.set(existingKey, updated);
      await this.saveCheckpointToDisk(updated);
      return updated;
    }

    // 计算进度
    const progress = Math.round(((stepIndex + 1) / (stepIndex + 2)) * 100);

    const checkpoint: CheckpointData = {
      checkpointId: uuidv4(),
      taskId,
      stepIndex,
      stepName,
      progress,
      state: { ...state },
      createdAt: new Date(),
      metadata,
    };

    this.currentCheckpoints.set(existingKey, checkpoint);
    await this.saveCheckpointToDisk(checkpoint);

    // 清理旧检查点
    await this.pruneOldCheckpoints(taskId);

    return checkpoint;
  }

  /**
   * 获取任务的最新检查点
   */
  async getLatestCheckpoint(taskId: string): Promise<CheckpointData | null> {
    // 先尝试从内存获取
    const memoryCheckpoints = Array.from(this.currentCheckpoints.values())
      .filter((cp) => cp.taskId === taskId)
      .sort((a, b) => b.stepIndex - a.stepIndex);

    if (memoryCheckpoints.length > 0) {
      return memoryCheckpoints[0];
    }

    // 从磁盘加载
    return this.loadCheckpointFromDisk(taskId);
  }

  /**
   * 获取任务的所有检查点
   */
  async getCheckpoints(taskId: string): Promise<CheckpointData[]> {
    const checkpoints: CheckpointData[] = [];
    const keyPrefix = `${taskId}:`;

    // 从内存获取
    for (const [key, cp] of this.currentCheckpoints) {
      if (key.startsWith(keyPrefix)) {
        checkpoints.push(cp);
      }
    }

    // 从磁盘补充
    try {
      const files = await fs.readdir(this.config.checkpointDir);
      const checkpointFiles = files.filter(
        (f) => f.startsWith(`${taskId}_`) && f.endsWith('.json')
      );

      for (const file of checkpointFiles) {
        const filePath = path.join(this.config.checkpointDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const cp = JSON.parse(content) as CheckpointData;
        cp.createdAt = new Date(cp.createdAt);

        if (!checkpoints.find((c) => c.checkpointId === cp.checkpointId)) {
          checkpoints.push(cp);
        }
      }
    } catch (error) {
      // 忽略错误
    }

    return checkpoints.sort((a, b) => a.stepIndex - b.stepIndex);
  }

  /**
   * 从检查点恢复任务状态
   * 幂等设计：多次调用恢复相同的检查点不会产生副作用
   */
  async restoreFromCheckpoint(
    taskId: string,
    checkpointId?: string
  ): Promise<{ checkpoint: CheckpointData; state: Record<string, unknown> } | null> {
    let checkpoint: CheckpointData | null = null;

    if (checkpointId) {
      // 查找指定检查点
      for (const cp of this.currentCheckpoints.values()) {
        if (cp.checkpointId === checkpointId) {
          checkpoint = cp;
          break;
        }
      }

      if (!checkpoint) {
        checkpoint = await this.loadCheckpointFromDiskById(taskId, checkpointId);
      }
    } else {
      // 获取最新检查点
      checkpoint = await this.getLatestCheckpoint(taskId);
    }

    if (!checkpoint) {
      console.log(`[CheckpointService] No checkpoint found for task ${taskId}`);
      return null;
    }

    // 恢复状态
    this.stepState.set(taskId, { ...checkpoint.state });

    return {
      checkpoint,
      state: { ...checkpoint.state },
    };
  }

  /**
   * 更新任务状态（用于增量检查点）
   */
  async updateState(taskId: string, partialState: Record<string, unknown>): Promise<void> {
    const existingState = this.stepState.get(taskId) || {};
    this.stepState.set(taskId, { ...existingState, ...partialState });

    // 如果启用了增量检查点，自动保存
    if (this.config.enableIncrementalCheckpoint) {
      const checkpoint = await this.getLatestCheckpoint(taskId);
      if (checkpoint) {
        await this.createCheckpoint(
          taskId,
          checkpoint.stepIndex,
          checkpoint.stepName,
          this.stepState.get(taskId) || {}
        );
      }
    }
  }

  /**
   * 获取当前任务状态
   */
  getState(taskId: string): Record<string, unknown> {
    return this.stepState.get(taskId) || {};
  }

  /**
   * 启动定时检查点
   */
  startPeriodicCheckpoint(
    taskId: string,
    getState: () => Record<string, unknown>,
    stepProvider: () => { index: number; name: string }
  ): void {
    if (this.checkpointTimers.has(taskId)) {
      return;
    }

    const timer = setInterval(async () => {
      const { index, name } = stepProvider();
      const state = getState();
      await this.createCheckpoint(taskId, index, name, state);
    }, this.config.checkpointInterval);

    this.checkpointTimers.set(taskId, timer);
  }

  /**
   * 停止定时检查点
   */
  stopPeriodicCheckpoint(taskId: string): void {
    const timer = this.checkpointTimers.get(taskId);
    if (timer) {
      clearInterval(timer);
      this.checkpointTimers.delete(taskId);
    }
  }

  /**
   * 删除任务的检查点
   */
  async deleteCheckpoints(taskId: string): Promise<void> {
    // 停止定时检查点
    this.stopPeriodicCheckpoint(taskId);

    // 清理内存中的检查点
    const keysToDelete: string[] = [];
    for (const [key, cp] of this.currentCheckpoints) {
      if (cp.taskId === taskId) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.currentCheckpoints.delete(key));

    // 清理步骤状态
    this.stepState.delete(taskId);

    // 删除磁盘上的检查点文件
    try {
      const files = await fs.readdir(this.config.checkpointDir);
      const checkpointFiles = files.filter(
        (f) => f.startsWith(`${taskId}_`) && f.endsWith('.json')
      );

      for (const file of checkpointFiles) {
        await fs.unlink(path.join(this.config.checkpointDir, file));
      }
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 获取检查点元数据
   */
  async getCheckpointMetadata(taskId: string): Promise<CheckpointMetadata | null> {
    const checkpoints = await this.getCheckpoints(taskId);

    if (checkpoints.length === 0) {
      return null;
    }

    const latestCheckpoint = checkpoints[checkpoints.length - 1];

    return {
      checkpointId: latestCheckpoint.checkpointId,
      taskId,
      totalSteps: checkpoints.length,
      currentStep: latestCheckpoint.stepIndex,
      progress: latestCheckpoint.progress,
      createdAt: latestCheckpoint.createdAt,
    };
  }

  /**
   * 保存检查点到磁盘
   */
  private async saveCheckpointToDisk(checkpoint: CheckpointData): Promise<void> {
    const fileName = `${checkpoint.taskId}_${checkpoint.stepIndex}_${checkpoint.checkpointId}.json`;
    const filePath = path.join(this.config.checkpointDir, fileName);
    const content = JSON.stringify(checkpoint, null, 2);

    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * 从磁盘加载检查点
   */
  private async loadCheckpointFromDisk(taskId: string): Promise<CheckpointData | null> {
    try {
      const files = await fs.readdir(this.config.checkpointDir);
      const checkpointFiles = files
        .filter((f) => f.startsWith(`${taskId}_`) && f.endsWith('.json'))
        .sort()
        .reverse();

      if (checkpointFiles.length === 0) {
        return null;
      }

      const filePath = path.join(this.config.checkpointDir, checkpointFiles[0]);
      const content = await fs.readFile(filePath, 'utf-8');
      const checkpoint = JSON.parse(content) as CheckpointData;
      checkpoint.createdAt = new Date(checkpoint.createdAt);

      // 加载到内存
      const key = `${taskId}:${checkpoint.stepIndex}`;
      this.currentCheckpoints.set(key, checkpoint);

      return checkpoint;
    } catch (error) {
      return null;
    }
  }

  /**
   * 根据ID从磁盘加载检查点
   */
  private async loadCheckpointFromDiskById(
    taskId: string,
    checkpointId: string
  ): Promise<CheckpointData | null> {
    try {
      const files = await fs.readdir(this.config.checkpointDir);
      const targetFile = files.find(
        (f) => f.startsWith(`${taskId}_`) && f.includes(checkpointId) && f.endsWith('.json')
      );

      if (!targetFile) {
        return null;
      }

      const filePath = path.join(this.config.checkpointDir, targetFile);
      const content = await fs.readFile(filePath, 'utf-8');
      const checkpoint = JSON.parse(content) as CheckpointData;
      checkpoint.createdAt = new Date(checkpoint.createdAt);

      return checkpoint;
    } catch (error) {
      return null;
    }
  }

  /**
   * 修剪旧检查点（保留最新的N个）
   */
  private async pruneOldCheckpoints(taskId: string): Promise<void> {
    const checkpoints = await this.getCheckpoints(taskId);

    if (checkpoints.length <= this.config.maxCheckpointsPerTask) {
      return;
    }

    // 保留最新的N个
    const toDelete = checkpoints.slice(0, checkpoints.length - this.config.maxCheckpointsPerTask);

    for (const cp of toDelete) {
      try {
        const fileName = `${cp.taskId}_${cp.stepIndex}_${cp.checkpointId}.json`;
        const filePath = path.join(this.config.checkpointDir, fileName);
        await fs.unlink(filePath);

        // 从内存中删除
        const key = `${taskId}:${cp.stepIndex}`;
        this.currentCheckpoints.delete(key);
      } catch (error) {
        // 忽略错误
      }
    }
  }

  /**
   * 清理过期的检查点
   */
  private async cleanupOldCheckpoints(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.checkpointDir);
      const now = new Date();
      const retentionMs = this.config.checkpointRetentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.config.checkpointDir, file);
        const stats = await fs.stat(filePath);
        const age = now.getTime() - stats.mtimeMs;

        if (age > retentionMs) {
          await fs.unlink(filePath);
          console.log(`[CheckpointService] Deleted old checkpoint: ${file}`);
        }
      }
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 关闭服务并清理资源
   */
  async close(): Promise<void> {
    // 停止所有定时检查点
    for (const [taskId, timer] of this.checkpointTimers) {
      clearInterval(timer);
    }
    this.checkpointTimers.clear();
    this.currentCheckpoints.clear();
    this.stepState.clear();
    this.isInitialized = false;
  }

  /**
   * 获取配置
   */
  getConfig(): CheckpointServiceConfig {
    return { ...this.config };
  }

  /**
   * 获取服务状态
   */
  getStatus(): {
    activeCheckpoints: number;
    activeTimers: number;
    isInitialized: boolean;
  } {
    return {
      activeCheckpoints: this.currentCheckpoints.size,
      activeTimers: this.checkpointTimers.size,
      isInitialized: this.isInitialized,
    };
  }
}

export default CheckpointService;
