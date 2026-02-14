/**
 * BackupService - 备份服务
 * 数据自动备份与灾难恢复
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface BackupConfig {
  backupDir: string;
  maxBackups?: number;
  compress?: boolean;
}

export interface Backup {
  id: string;
  timestamp: Date;
  size: number;
  path: string;
}

export interface BackupResult {
  success: boolean;
  id?: string;
  message?: string;
  timestamp?: Date;
}

export class BackupService {
  private config: Required<BackupConfig>;
  private backups: Map<string, Backup> = new Map();
  private autoBackupInterval: NodeJS.Timeout | null = null;
  private backupCallback?: () => Promise<string>;

  constructor(config: BackupConfig) {
    this.config = {
      backupDir: config.backupDir,
      maxBackups: config.maxBackups || 10,
      compress: config.compress ?? true,
    };

    // 确保备份目录存在
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }

    // 加载已有备份
    this.loadExistingBackups();
  }

  /**
   * 加载已有备份
   */
  private loadExistingBackups(): void {
    try {
      const files = fs.readdirSync(this.config.backupDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = fs.readFileSync(path.join(this.config.backupDir, file), 'utf-8');
          const backup = JSON.parse(content);
          this.backups.set(backup.id, backup);
        }
      }
    } catch {
      // 忽略加载错误
    }
  }

  /**
   * 创建备份
   */
  async createBackup(data: string): Promise<BackupResult> {
    try {
      const id = this.generateId();
      const timestamp = new Date();
      const filename = `backup_${id}.json`;
      const filepath = path.join(this.config.backupDir, filename);

      // 写入备份文件
      const backupData = {
        id,
        timestamp: timestamp.toISOString(),
        data,
      };

      fs.writeFileSync(filepath, JSON.stringify(backupData));

      // 获取文件大小
      const stats = fs.statSync(filepath);

      const backup: Backup = {
        id,
        timestamp,
        size: stats.size,
        path: filepath,
      };

      this.backups.set(id, backup);

      // 清理旧备份
      this.cleanupOldBackups();

      console.log(`[Backup] Created backup: ${id}`);

      return {
        success: true,
        id,
        timestamp,
        message: '备份创建成功',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `备份失败: ${error.message}`,
      };
    }
  }

  /**
   * 恢复备份
   */
  async restoreBackup(backupId: string): Promise<{ success: boolean; data?: string; message?: string }> {
    const backup = this.backups.get(backupId);

    if (!backup) {
      return {
        success: false,
        message: '备份不存在',
      };
    }

    try {
      const content = fs.readFileSync(backup.path, 'utf-8');
      const backupData = JSON.parse(content);

      console.log(`[Backup] Restored backup: ${backupId}`);

      return {
        success: true,
        data: backupData.data,
        message: '恢复成功',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `恢复失败: ${error.message}`,
      };
    }
  }

  /**
   * 列出所有备份
   */
  listBackups(): Backup[] {
    return Array.from(this.backups.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * 删除备份
   */
  deleteBackup(backupId: string): BackupResult {
    const backup = this.backups.get(backupId);

    if (!backup) {
      return { success: false, message: '备份不存在' };
    }

    try {
      fs.unlinkSync(backup.path);
      this.backups.delete(backupId);

      console.log(`[Backup] Deleted backup: ${backupId}`);

      return { success: true, message: '删除成功' };
    } catch (error: any) {
      return { success: false, message: `删除失败: ${error.message}` };
    }
  }

  /**
   * 清理旧备份
   */
  private cleanupOldBackups(): void {
    const backups = this.listBackups();

    if (backups.length > this.config.maxBackups) {
      const toDelete = backups.slice(this.config.maxBackups);
      for (const backup of toDelete) {
        this.deleteBackup(backup.id);
      }
    }
  }

  /**
   * 启动自动备份
   */
  startAutoBackup(intervalMs: number, callback?: () => Promise<string>): void {
    if (this.autoBackupInterval) {
      this.stopAutoBackup();
    }

    this.backupCallback = callback;

    this.autoBackupInterval = setInterval(async () => {
      try {
        const data = this.backupCallback 
          ? await this.backupCallback() 
          : `auto-backup-${Date.now()}`;
        
        await this.createBackup(data);
        console.log(`[Backup] Auto backup completed`);
      } catch (error) {
        console.error(`[Backup] Auto backup failed:`, error);
      }
    }, intervalMs);

    console.log(`[Backup] Auto backup started (interval: ${intervalMs}ms)`);
  }

  /**
   * 停止自动备份
   */
  stopAutoBackup(): void {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
      console.log(`[Backup] Auto backup stopped`);
    }
  }

  /**
   * 获取备份统计
   */
  getStats(): { total: number; totalSize: number } {
    const backups = this.listBackups();
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

    return {
      total: backups.length,
      totalSize,
    };
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `bkp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
}
