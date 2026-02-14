/**
 * BackupService - 自动备份服务
 * 
 * 数据备份与恢复
 */

export interface BackupInfo {
  id: string;
  name: string;
  timestamp: number;
  size: number;
  metadata?: Record<string, any>;
}

export interface BackupData {
  projects?: any[];
  tasks?: any[];
  [key: string]: any;
}

export interface StorageAdapter {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  list(): Promise<string[]>;
  delete(key: string): Promise<boolean>;
}

export interface BackupOptions {
  maxBackups?: number;
  retentionDays?: number;
  compression?: boolean;
}

export class BackupService {
  private storage: StorageAdapter;
  private options: Required<BackupOptions>;

  constructor(options?: { storage?: StorageAdapter; backupOptions?: BackupOptions }) {
    this.storage = options?.storage || this.createDefaultStorage();
    this.options = {
      maxBackups: options?.backupOptions?.maxBackups || 10,
      retentionDays: options?.backupOptions?.retentionDays || 7,
      compression: options?.backupOptions?.compression || false,
    };
  }

  /**
   * 创建默认内存存储
   */
  private createDefaultStorage(): StorageAdapter {
    const store = new Map<string, any>();
    
    return {
      save: async (key: string, data: any) => { store.set(key, data); },
      load: async (key: string) => store.get(key),
      list: async () => Array.from(store.keys()),
      delete: async (key: string) => store.delete(key),
    };
  }

  /**
   * 创建备份
   */
  async createBackup(name: string, data: BackupData): Promise<BackupInfo> {
    const id = `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    const serialized = JSON.stringify(data);
    const size = Buffer.byteLength(serialized, 'utf8');

    const backup: BackupInfo = {
      id,
      name,
      timestamp,
      size,
    };

    // 保存备份数据
    await this.storage.save(`backup:${id}`, {
      info: backup,
      data,
    });

    // 自动清理旧备份
    await this.cleanup();

    return backup;
  }

  /**
   * 恢复备份
   */
  async restoreBackup(backupId: string): Promise<BackupData | undefined> {
    const backup = await this.storage.load(`backup:${backupId}`);
    
    if (!backup) {
      return undefined;
    }

    return backup.data;
  }

  /**
   * 列出所有备份
   */
  async listBackups(): Promise<BackupInfo[]> {
    const keys = await this.storage.list();
    const backupKeys = keys.filter(k => k.startsWith('backup:'));
    
    const backups: BackupInfo[] = [];

    for (const key of backupKeys) {
      const backup = await this.storage.load(key);
      if (backup?.info) {
        backups.push(backup.info);
      }
    }

    return backups.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 删除备份
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    return this.storage.delete(`backup:${backupId}`);
  }

  /**
   * 清理旧备份
   */
  async cleanup(olderThanDays?: number): Promise<number> {
    const days = olderThanDays ?? this.options.retentionDays;
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const backups = await this.listBackups();
    let deleted = 0;

    // 删除过期的
    for (const backup of backups) {
      if (backup.timestamp < cutoff) {
        await this.deleteBackup(backup.id);
        deleted++;
      }
    }

    // 超过最大数量的，删除最早的
    const remaining = await this.listBackups();
    if (remaining.length > this.options.maxBackups) {
      const toDelete = remaining.slice(this.options.maxBackups);
      for (const backup of toDelete) {
        await this.deleteBackup(backup.id);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * 获取备份统计
   */
  async getStats(): Promise<{
    count: number;
    totalSize: number;
    oldestBackup?: BackupInfo;
    newestBackup?: BackupInfo;
  }> {
    const backups = await this.listBackups();
    
    return {
      count: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
      oldestBackup: backups[backups.length - 1],
      newestBackup: backups[0],
    };
  }
}

export default BackupService;
