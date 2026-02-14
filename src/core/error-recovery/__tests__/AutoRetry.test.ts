/**
 * AutoRetry Tests - TDD
 * 
 * 测试自动重试机制
 */

import { AutoRetry, RetryOptions, RetryResult } from '../AutoRetry';

describe('AutoRetry', () => {
  let autoRetry: AutoRetry;

  beforeEach(() => {
    autoRetry = new AutoRetry();
  });

  describe('execute with retry', () => {
    it('should succeed on first try', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await autoRetry.execute(fn);
      
      expect(result.success).toBe(true);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure then succeed', async () => {
      let attempts = 0;
      const fn = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject(new Error('fail'));
        }
        return Promise.resolve('success');
      });
      
      const result = await autoRetry.execute(fn, { maxRetries: 2, delay: 5 });
      
      expect(result.success).toBe(true);
      expect(attempts).toBe(2);
    });

    it('should fail after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('always fail'));
      
      const result = await autoRetry.execute(fn, { maxRetries: 1, delay: 5 });
      
      expect(result.success).toBe(false);
    });
  });

  describe('retry result', () => {
    it('should track attempts', async () => {
      const fn = jest.fn().mockResolvedValue('ok');
      
      const result = await autoRetry.execute(fn);
      
      expect(result.attempts).toBe(1);
    });

    it('should track last error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('test error'));
      
      const result = await autoRetry.execute(fn, { maxRetries: 1, delay: 5 });
      
      expect(result.lastError).toBeDefined();
    });
  });
});

describe('RetryOptions', () => {
  it('should create valid options', () => {
    const options: RetryOptions = {
      maxRetries: 3,
      delay: 100,
      backoff: 'exponential',
    };

    expect(options.maxRetries).toBe(3);
  });
});
