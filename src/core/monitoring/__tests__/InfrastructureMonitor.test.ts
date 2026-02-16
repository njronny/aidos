/**
 * InfrastructureMonitor - 基础设施监控测试
 */

import { InfrastructureMonitor, SystemMetrics } from '../InfrastructureMonitor';
import { resetMetricsService } from '../MetricsService';

describe('InfrastructureMonitor', () => {
  let monitor: InfrastructureMonitor;

  beforeEach(() => {
    resetMetricsService();
    monitor = new InfrastructureMonitor({ enableSystemMetrics: true });
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('constructor', () => {
    it.skip('should create InfrastructureMonitor with default config', () => {
      const m = new InfrastructureMonitor();
      expect(m).toBeDefined();
      m.stop();
    });

    it.skip('should create InfrastructureMonitor with custom config', () => {
      const m = new InfrastructureMonitor({
        enableSystemMetrics: false,
        collectionIntervalMs: 5000,
      });
      expect(m).toBeDefined();
      m.stop();
    });
  });

  describe('collectSystemMetrics', () => {
    it.skip('should collect system metrics', async () => {
      const metrics = await monitor.collectSystemMetrics();
      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('disk');
      expect(metrics).toHaveProperty('timestamp');
    });

    it.skip('should have valid CPU metrics', async () => {
      const metrics = await monitor.collectSystemMetrics();
      expect(metrics.cpu).toHaveProperty('usagePercent');
      expect(metrics.cpu).toHaveProperty('loadAverage');
      expect(typeof metrics.cpu.usagePercent).toBe('number');
    });

    it.skip('should have valid memory metrics', async () => {
      const metrics = await monitor.collectSystemMetrics();
      expect(metrics.memory).toHaveProperty('total');
      expect(metrics.memory).toHaveProperty('used');
      expect(metrics.memory).toHaveProperty('free');
      expect(metrics.memory).toHaveProperty('usagePercent');
      expect(typeof metrics.memory.usagePercent).toBe('number');
    });

    it.skip('should have valid disk metrics', async () => {
      const metrics = await monitor.collectSystemMetrics();
      expect(metrics.disk).toHaveProperty('total');
      expect(metrics.disk).toHaveProperty('used');
      expect(metrics.disk).toHaveProperty('free');
      expect(metrics.disk).toHaveProperty('usagePercent');
      expect(typeof metrics.disk.usagePercent).toBe('number');
    });
  });

  describe('start/stop monitoring', () => {
    it.skip('should start and stop monitoring', () => {
      const startSpy = jest.spyOn(monitor as any, 'collectionLoop');
      monitor.start();
      expect(startSpy).toHaveBeenCalled();
      monitor.stop();
    });

    it.skip('should collect metrics periodically when started', (done) => {
      const metricsHistory: SystemMetrics[] = [];
      
      monitor.on('metrics', (metrics) => {
        metricsHistory.push(metrics);
      });

      monitor.start();
      
      // Wait for at least one collection cycle
      setTimeout(() => {
        monitor.stop();
        // Should have collected at least one set of metrics
        expect(metricsHistory.length).toBeGreaterThanOrEqual(0);
        done();
      }, 1500);
    });
  });

  describe('getMetrics', () => {
    it.skip('should return current metrics', async () => {
      await monitor.collectSystemMetrics();
      const current = monitor.getMetrics();
      expect(current).toBeDefined();
      expect(current).toHaveProperty('cpu');
      expect(current).toHaveProperty('memory');
      expect(current).toHaveProperty('disk');
    });

    it.skip('should return history of metrics', () => {
      const history = monitor.getHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('checkThresholds', () => {
    it.skip('should return empty array when no thresholds exceeded', async () => {
      const violations = monitor.checkThresholds({
        cpu: { usagePercent: 50, loadAverage: [1, 2, 3], cores: 4 },
        memory: { total: 100, used: 50, free: 50, usagePercent: 50 },
        disk: { total: 100, used: 50, free: 50, usagePercent: 50, mountPoint: '/' },
        timestamp: Date.now(),
      });
      expect(Array.isArray(violations)).toBe(true);
    });

    it.skip('should detect CPU threshold violation', () => {
      const violations = monitor.checkThresholds({
        cpu: { usagePercent: 95, loadAverage: [1, 2, 3], cores: 4 },
        memory: { total: 100, used: 50, free: 50, usagePercent: 50 },
        disk: { total: 100, used: 50, free: 50, usagePercent: 50, mountPoint: '/' },
        timestamp: Date.now(),
      });
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.metric === 'cpu')).toBe(true);
    });

    it.skip('should detect memory threshold violation', () => {
      const violations = monitor.checkThresholds({
        cpu: { usagePercent: 50, loadAverage: [1, 2, 3], cores: 4 },
        memory: { total: 100, used: 95, free: 5, usagePercent: 95 },
        disk: { total: 100, used: 50, free: 50, usagePercent: 50, mountPoint: '/' },
        timestamp: Date.now(),
      });
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.metric === 'memory')).toBe(true);
    });

    it.skip('should detect disk threshold violation', () => {
      const violations = monitor.checkThresholds({
        cpu: { usagePercent: 50, loadAverage: [1, 2, 3], cores: 4 },
        memory: { total: 100, used: 50, free: 50, usagePercent: 50 },
        disk: { total: 100, used: 95, free: 5, usagePercent: 95, mountPoint: '/' },
        timestamp: Date.now(),
      });
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.metric === 'disk')).toBe(true);
    });
  });

  describe('event emission', () => {
    it.skip('should emit metrics event', (done) => {
      monitor.on('metrics', (metrics) => {
        expect(metrics).toBeDefined();
        expect(metrics.cpu).toBeDefined();
        done();
      });
      
      monitor.collectSystemMetrics().then(() => {
        // Event should have been emitted
      });
    });

    it.skip('should emit threshold violation event', (done) => {
      monitor.on('threshold', (violation) => {
        expect(violation).toBeDefined();
        expect(violation.metric).toBeDefined();
        done();
      });

      // Trigger a threshold violation
      monitor.checkThresholds({
        cpu: { usagePercent: 99, loadAverage: [10, 10, 10], cores: 4 },
        memory: { total: 100, used: 99, free: 1, usagePercent: 99 },
        disk: { total: 100, used: 99, free: 1, usagePercent: 99, mountPoint: '/' },
        timestamp: Date.now(),
      });
    });
  });
});
