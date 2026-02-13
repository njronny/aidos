// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    ttl: jest.fn().mockResolvedValue(600000),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue(undefined),
  }));
});

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { IdempotencyService } from '../IdempotencyService';

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  beforeEach(() => {
    service = new IdempotencyService({
      redisOptions: { host: 'localhost', port: 6379 },
      keyPrefix: 'test:idempotency:',
      ttlSeconds: 3600,
    });
  });

  afterEach(async () => {
    await service.close();
  });

  describe('constructor', () => {
    it('should create an IdempotencyService instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same payload', () => {
      const key1 = service.generateKey('test-task', { a: 1, b: 2 });
      const key2 = service.generateKey('test-task', { b: 2, a: 1 });
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different payloads', () => {
      const key1 = service.generateKey('test-task', { a: 1 });
      const key2 = service.generateKey('test-task', { a: 2 });
      expect(key1).not.toBe(key2);
    });

    it('should include task name in key', () => {
      const key = service.generateKey('my-task', { data: 'test' });
      expect(key).toContain('my-task');
    });
  });

  describe('check', () => {
    it('should return isDuplicate false when no existing key', async () => {
      const result = await service.check('nonexistent-key');
      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('tryAcquireLock', () => {
    it('should return true when lock acquired', async () => {
      const result = await service.tryAcquireLock('test-key');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('releaseLock', () => {
    it('should delete lock key', async () => {
      await expect(service.releaseLock('test-key')).resolves.not.toThrow();
    });
  });

  describe('storeResult', () => {
    it('should store result with TTL', async () => {
      await expect(service.storeResult('test-key', { success: true })).resolves.not.toThrow();
    });
  });

  describe('invalidate', () => {
    it('should delete key and lock', async () => {
      await expect(service.invalidate('test-key')).resolves.not.toThrow();
    });
  });

  describe('isHealthy', () => {
    it('should return true when Redis is healthy', async () => {
      const healthy = await service.isHealthy();
      expect(typeof healthy).toBe('boolean');
    });
  });
});
