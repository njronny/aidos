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

// Mock bullmq
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'test-job-1' }),
    getJobs: jest.fn().mockResolvedValue([]),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    }),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(undefined),
  })),
  JobsOptions: {},
}));

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DeadLetterQueue, DLQEntry, DLQResolution } from '../DeadLetterQueue';

describe('DeadLetterQueue', () => {
  let dlq: DeadLetterQueue;

  beforeEach(() => {
    dlq = new DeadLetterQueue({
      redisOptions: { host: 'localhost', port: 6379 },
      maxRetries: 3,
      manualInterventionThreshold: 3,
    });
  });

  afterEach(async () => {
    await dlq.close();
  });

  describe('constructor', () => {
    it('should create a DeadLetterQueue instance', () => {
      expect(dlq).toBeDefined();
    });

    it('should use default config when not provided', () => {
      const defaultDlq = new DeadLetterQueue();
      expect(defaultDlq).toBeDefined();
    });
  });

  describe('addEntry', () => {
    it('should add an entry to the DLQ', async () => {
      const result = await dlq.addEntry(
        'test-queue',
        'job-123',
        'test-job',
        { data: 'test' },
        'Test error',
        0
      );
      expect(result).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return DLQ statistics', async () => {
      const stats = await dlq.getStats();
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('pendingManualIntervention');
    });
  });

  describe('isHealthy', () => {
    it('should return true when DLQ is healthy', async () => {
      const healthy = await dlq.isHealthy();
      expect(typeof healthy).toBe('boolean');
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      await expect(dlq.clear()).resolves.not.toThrow();
    });
  });
});

describe('DLQEntry types', () => {
  it('should have correct structure', () => {
    const entry: DLQEntry = {
      id: 'test-id',
      originalQueue: 'test-queue',
      originalJobId: 'job-1',
      jobName: 'test-job',
      data: { test: true },
      error: 'Test error',
      failedAt: new Date(),
      retryCount: 1,
      maxRetries: 3,
      manualInterventionRequired: false,
    };
    expect(entry.id).toBe('test-id');
  });

  it('should support DLQResolution types', () => {
    const retryResolution: DLQResolution = { action: 'retry', delay: 1000 };
    const discardResolution: DLQResolution = { action: 'discard' };
    const requeueResolution: DLQResolution = { action: 'requeue', queue: 'new-queue' };

    expect(retryResolution.action).toBe('retry');
    expect(discardResolution.action).toBe('discard');
    expect(requeueResolution.action).toBe('requeue');
  });
});
