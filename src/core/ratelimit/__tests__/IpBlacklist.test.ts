/**
 * IpBlacklist Tests - IP黑名单测试
 */

import { IpBlacklistManager, BlacklistEntry } from '../IpBlacklist';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
  }));
});

describe('IpBlacklistManager', () => {
  let manager: IpBlacklistManager;

  beforeEach(() => {
    manager = new IpBlacklistManager({
      defaultBanDuration: 3600,
      autoBanThreshold: 3,
      autoBanDuration: 1800,
      enableAutoBan: true,
    });
  });

  describe('Manual Blocking', () => {
    it('should block an IP address', async () => {
      await manager.blockIp('192.168.1.1', 'Test block', 3600);
      
      const isBlocked = await manager.isBlocked('192.168.1.1');
      expect(isBlocked).toBe(true);
    });

    it('should block IP permanently with duration 0', async () => {
      await manager.blockIp('10.0.0.1', 'Permanent block', 0);
      
      const isBlocked = await manager.isBlocked('10.0.0.1');
      expect(isBlocked).toBe(true);
    });

    it('should unblock an IP address', async () => {
      await manager.blockIp('192.168.1.1', 'Test block', 3600);
      await manager.unblockIp('192.168.1.1');
      
      const isBlocked = await manager.isBlocked('192.168.1.1');
      expect(isBlocked).toBe(false);
    });

    it('should allow non-blocked IPs', async () => {
      const isBlocked = await manager.isBlocked('192.168.1.100');
      expect(isBlocked).toBe(false);
    });
  });

  describe('Blacklist Management', () => {
    it('should get blacklist', async () => {
      await manager.blockIp('192.168.1.1', 'Block 1', 3600);
      await manager.blockIp('192.168.1.2', 'Block 2', 3600);
      
      const blacklist = await manager.getBlacklist();
      expect(blacklist.length).toBeGreaterThanOrEqual(2);
    });

    it('should get blacklist count', async () => {
      await manager.blockIp('192.168.1.1', 'Block 1', 3600);
      await manager.blockIp('192.168.1.2', 'Block 2', 3600);
      
      const count = await manager.getBlacklistCount();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should batch block IPs', async () => {
      const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
      await manager.blockIps(ips, 'Batch block', 3600);
      
      const isBlocked1 = await manager.isBlocked('192.168.1.1');
      const isBlocked2 = await manager.isBlocked('192.168.1.2');
      const isBlocked3 = await manager.isBlocked('192.168.1.3');
      
      expect(isBlocked1).toBe(true);
      expect(isBlocked2).toBe(true);
      expect(isBlocked3).toBe(true);
    });

    it('should batch unblock IPs', async () => {
      const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
      await manager.blockIps(ips, 'Batch block', 3600);
      await manager.unblockIps(ips);
      
      const isBlocked1 = await manager.isBlocked('192.168.1.1');
      expect(isBlocked1).toBe(false);
    });
  });

  describe('Auto Ban', () => {
    it('should auto ban after threshold', async () => {
      const threshold = 3;
      const testManager = new IpBlacklistManager({
        autoBanThreshold: threshold,
        autoBanDuration: 1800,
        enableAutoBan: true,
      });

      // Record failed attempts
      for (let i = 0; i < threshold; i++) {
        const banned = await testManager.recordFailedAttempt('192.168.1.100');
        if (i < threshold - 1) {
          expect(banned).toBe(false);
        } else {
          expect(banned).toBe(true);
        }
      }

      // Should be blocked now
      const isBlocked = await testManager.isBlocked('192.168.1.100');
      expect(isBlocked).toBe(true);
    });

    it('should not auto ban when disabled', async () => {
      const testManager = new IpBlacklistManager({
        autoBanThreshold: 2,
        autoBanDuration: 1800,
        enableAutoBan: false,
      });

      await testManager.recordFailedAttempt('192.168.1.100');
      await testManager.recordFailedAttempt('192.168.1.100');

      const isBlocked = await testManager.isBlocked('192.168.1.100');
      expect(isBlocked).toBe(false);
    });

    it('should clear failed attempts after success', () => {
      manager.recordFailedAttempt('192.168.1.100');
      manager.recordFailedAttempt('192.168.1.100');
      manager.clearFailedAttempts('192.168.1.100');

      const stats = manager.getIpStats('192.168.1.100');
      expect(stats).toBeUndefined();
    });
  });

  describe('IP Stats', () => {
    it('should track failed attempts', async () => {
      await manager.recordFailedAttempt('192.168.1.50');
      await manager.recordFailedAttempt('192.168.1.50');

      const stats = manager.getIpStats('192.168.1.50');
      expect(stats?.failedAttempts).toBe(2);
      expect(stats?.lastAttempt).toBeGreaterThan(0);
    });

    it('should not track stats when auto ban disabled', async () => {
      const testManager = new IpBlacklistManager({
        enableAutoBan: false,
      });

      await testManager.recordFailedAttempt('192.168.1.50');

      const stats = testManager.getIpStats('192.168.1.50');
      expect(stats).toBeUndefined();
    });
  });
});
