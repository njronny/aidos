/**
 * BackupService 备份服务 - TDD 测试
 * 数据自动备份与灾难恢复
 */

import { BackupService, BackupConfig, BackupResult } from '../BackupService';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';

describe('BackupService', () => {
  let service: BackupService;
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-test-'));
    service = new BackupService({ backupDir: testDir });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create service with config', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createBackup', () => {
    it('should create backup successfully', async () => {
      const result = await service.createBackup('test-data');
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('timestamp');
      expect(result.success).toBe(true);
    });

    it('should store backup with id', async () => {
      const result = await service.createBackup('test-data');
      
      expect(result.id).toBeDefined();
    });
  });

  describe('restoreBackup', () => {
    it('should restore from backup', async () => {
      const result = await service.createBackup('original-data');
      expect(result.id).toBeDefined();
      
      const restored = await service.restoreBackup(result.id!);
      
      expect(restored.success).toBe(true);
    });

    it('should fail for invalid backup id', async () => {
      const restored = await service.restoreBackup('invalid-id');
      
      expect(restored.success).toBe(false);
    });
  });

  describe('listBackups', () => {
    it('should list all backups', async () => {
      await service.createBackup('data1');
      await service.createBackup('data2');
      
      const backups = service.listBackups();
      
      expect(backups.length).toBe(2);
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup', async () => {
      const result = await service.createBackup('to-delete');
      expect(result.id).toBeDefined();
      
      const deleteResult = service.deleteBackup(result.id!);
      
      expect(deleteResult.success).toBe(true);
    });
  });

  describe('autoBackup', () => {
    it('should perform scheduled backup', async () => {
      service.startAutoBackup(100); // 100ms
      
      await new Promise(r => setTimeout(r, 200));
      
      const backups = service.listBackups();
      expect(backups.length).toBeGreaterThan(0);
      
      service.stopAutoBackup();
    });

    it('should stop auto backup', () => {
      service.startAutoBackup(1000);
      service.stopAutoBackup();
      
      // 不应报错
      expect(true).toBe(true);
    });
  });
});
