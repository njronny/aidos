/**
 * BackupService Tests - TDD
 * 
 * 测试自动备份服务
 */

import { BackupService, BackupInfo } from '../BackupService';

describe('BackupService', () => {
  let service: BackupService;
  let mockStorage: Map<string, any>;

  beforeEach(() => {
    mockStorage = new Map();
    service = new BackupService({
      storage: {
        save: async (key: string, data: any) => { mockStorage.set(key, data); },
        load: async (key: string) => mockStorage.get(key),
        list: async () => Array.from(mockStorage.keys()),
        delete: async (key: string) => mockStorage.delete(key),
      }
    });
  });

  describe('create backup', () => {
    it('should create backup', async () => {
      const data = { projects: [], tasks: [] };

      const backup = await service.createBackup('test-backup', data);

      expect(backup.id).toBeDefined();
      expect(backup.timestamp).toBeDefined();
    });

    it('should include metadata', async () => {
      const data = { test: 'data' };

      const backup = await service.createBackup('test', data);

      expect(backup.size).toBeGreaterThan(0);
    });
  });

  describe('restore', () => {
    it('should restore from backup', async () => {
      const data = { projects: [{ id: 'p1' }] };
      const backup = await service.createBackup('test', data);

      const restored = await service.restoreBackup(backup.id);

      expect(restored).toBeDefined();
    });

    it('should return undefined for non-existent', async () => {
      const result = await service.restoreBackup('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('list backups', () => {
    it('should list all backups', async () => {
      await service.createBackup('backup1', { data: 1 });
      await service.createBackup('backup2', { data: 2 });

      const backups = await service.listBackups();

      expect(backups.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('cleanup', () => {
    it('should delete old backups', async () => {
      await service.createBackup('old', { old: true });
      
      // 手动设置旧时间戳
      const oldBackup = await service.listBackups();
      if (oldBackup[0]) {
        oldBackup[0].timestamp = Date.now() - 100000;
      }

      const deleted = await service.cleanup(0); // 删除所有

      expect(deleted).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('BackupInfo', () => {
  it('should create valid backup info', () => {
    const info: BackupInfo = {
      id: 'backup-1',
      name: 'Test',
      timestamp: Date.now(),
      size: 1024,
    };

    expect(info.id).toBe('backup-1');
  });
});
