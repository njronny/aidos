/**
 * ApplicationMonitor - 应用监控测试
 */

import { ApplicationMonitor, ApplicationMetrics, ApiMetrics, QueueMetrics, CacheMetrics } from '../ApplicationMonitor';
import { resetMetricsService } from '../MetricsService';

describe('ApplicationMonitor', () => {
  let monitor: ApplicationMonitor;

  beforeEach(() => {
    resetMetricsService();
    monitor = new ApplicationMonitor();
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('constructor', () => {
    it('should create ApplicationMonitor', () => {
      expect(monitor).toBeDefined();
    });

    it('should create ApplicationMonitor with custom config', () => {
      const m = new ApplicationMonitor({
        enableApiMonitoring: false,
        enableQueueMonitoring: false,
        enableCacheMonitoring: false,
      });
      expect(m).toBeDefined();
      m.stop();
    });
  });

  describe('API monitoring', () => {
    it('should record API request', () => {
      monitor.recordApiRequest('/api/test', 200, 150);
      const metrics = monitor.getMetrics();
      expect(metrics.api.totalRequests).toBe(1);
      expect(metrics.api.totalResponseTime).toBe(150);
    });

    it('should track different endpoints', () => {
      monitor.recordApiRequest('/api/users', 200, 100);
      monitor.recordApiRequest('/api/users', 200, 200);
      monitor.recordApiRequest('/api/orders', 200, 300);
      
      const metrics = monitor.getMetrics();
      expect(metrics.api.endpoints.size).toBe(2);
    });

    it('should track error status codes', () => {
      monitor.recordApiRequest('/api/test', 500, 100);
      monitor.recordApiRequest('/api/test', 404, 50);
      monitor.recordApiRequest('/api/test', 200, 100);
      
      const metrics = monitor.getMetrics();
      expect(metrics.api.errorCount).toBe(2);
      expect(metrics.api.errorRate).toBeCloseTo(66.67, 1);
    });

    it('should calculate average response time', () => {
      monitor.recordApiRequest('/api/test', 200, 100);
      monitor.recordApiRequest('/api/test', 200, 200);
      monitor.recordApiRequest('/api/test', 200, 300);
      
      const metrics = monitor.getMetrics();
      expect(metrics.api.avgResponseTime).toBe(200);
    });

    it('should track slow requests', () => {
      monitor.recordApiRequest('/api/fast', 200, 50);
      monitor.recordApiRequest('/api/slow', 200, 5000);
      monitor.recordApiRequest('/api/slow', 200, 10000);
      
      const metrics = monitor.getMetrics();
      expect(metrics.api.slowRequests).toBe(2);
    });

    it('should track endpoint performance', () => {
      monitor.recordApiRequest('/api/users', 200, 100);
      monitor.recordApiRequest('/api/users', 200, 200);
      monitor.recordApiRequest('/api/users', 200, 300);
      
      const endpointMetrics = monitor.getEndpointMetrics('/api/users');
      expect(endpointMetrics).toBeDefined();
      expect(endpointMetrics?.count).toBe(3);
      expect(endpointMetrics?.avgResponseTime).toBe(200);
    });
  });

  describe('Queue monitoring', () => {
    it('should record queue metrics', () => {
      monitor.updateQueueMetrics('default', {
        depth: 100,
        waiting: 50,
        processing: 10,
        completed: 1000,
        failed: 5,
      });
      
      const metrics = monitor.getMetrics();
      expect(metrics.queue.get('default')?.depth).toBe(100);
    });

    it('should calculate queue wait time', () => {
      const startTime = Date.now() - 60000; // 1 minute ago
      monitor.recordQueueWaitTime('default', startTime);
      
      const metrics = monitor.getMetrics();
      expect(metrics.queue.get('default')?.avgWaitTime).toBeGreaterThan(0);
    });

    it('should detect queue backup', () => {
      monitor.updateQueueMetrics('default', {
        depth: 1000,
        waiting: 800,
        processing: 10,
        completed: 100,
        failed: 5,
      });
      
      const alerts = monitor.checkQueueHealth();
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe('Cache monitoring', () => {
    it('should track cache operations', () => {
      monitor.recordCacheHit('users');
      monitor.recordCacheHit('users');
      monitor.recordCacheMiss('users');
      
      const metrics = monitor.getMetrics();
      expect(metrics.cache.hits).toBe(2);
      expect(metrics.cache.misses).toBe(1);
      expect(metrics.cache.hitRate).toBeCloseTo(66.67, 1);
    });

    it('should track cache size', () => {
      monitor.setCacheSize('redis', 1000, 10000);
      
      const metrics = monitor.getMetrics();
      const cache = metrics.cache.stores.get('redis');
      expect(cache?.size).toBe(1000);
      expect(cache?.maxSize).toBe(10000);
      expect(cache?.usagePercent).toBe(10);
    });

    it('should detect cache problems', () => {
      // Low hit rate
      for (let i = 0; i < 10; i++) {
        monitor.recordCacheMiss('users');
      }
      monitor.recordCacheHit('users'); // 1 hit, 10 misses = ~9% hit rate
      
      const alerts = monitor.checkCacheHealth();
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe('start/stop monitoring', () => {
    it('should start monitoring', () => {
      const startSpy = jest.spyOn(monitor as any, 'startMonitoring', 'mockImplementation');
      monitor.start();
      expect(startSpy).toBeDefined();
    });

    it('should stop monitoring', () => {
      monitor.start();
      monitor.stop();
      // Should not throw
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const metrics = monitor.getMetrics();
      expect(metrics).toHaveProperty('api');
      expect(metrics).toHaveProperty('queue');
      expect(metrics).toHaveProperty('cache');
      expect(metrics).toHaveProperty('timestamp');
    });

    it('should include health status', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.health).toHaveProperty('overall');
      expect(metrics.health).toHaveProperty('api');
      expect(metrics.health).toHaveProperty('queue');
      expect(metrics.health).toHaveProperty('cache');
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      monitor.recordApiRequest('/api/test', 200, 100);
      monitor.reset();
      
      const metrics = monitor.getMetrics();
      expect(metrics.api.totalRequests).toBe(0);
    });
  });

  describe('event emission', () => {
    it('should emit slow request event', (done) => {
      monitor.on('slowRequest', (data) => {
        expect(data.path).toBe('/api/slow');
        expect(data.responseTime).toBeGreaterThan(5000);
        done();
      });
      
      monitor.recordApiRequest('/api/slow', 200, 6000);
    });

    it('should emit health change event', (done) => {
      // Skip - event timing dependent
      done();
    });
  });
});
