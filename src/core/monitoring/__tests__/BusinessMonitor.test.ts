/**
 * BusinessMonitor - 业务监控测试
 */

import { BusinessMonitor, BusinessMetrics, TaskMetrics, ProcessingSpeedMetrics } from '../BusinessMonitor';
import { resetMetricsService } from '../MetricsService';

describe('BusinessMonitor', () => {
  let monitor: BusinessMonitor;

  beforeEach(() => {
    resetMetricsService();
    monitor = new BusinessMonitor();
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('constructor', () => {
    it('should create BusinessMonitor', () => {
      expect(monitor).toBeDefined();
    });

    it('should create BusinessMonitor with custom config', () => {
      const m = new BusinessMonitor({
        enableTaskMonitoring: false,
        enableProcessingSpeedMonitoring: false,
        successRateThreshold: 90,
      });
      expect(m).toBeDefined();
      m.stop();
    });
  });

  describe('Task monitoring', () => {
    it('should record task success', () => {
      monitor.recordTaskComplete('task-1', true, 1000);
      const metrics = monitor.getMetrics();
      expect(metrics.task.totalTasks).toBe(1);
      expect(metrics.task.successfulTasks).toBe(1);
      expect(metrics.task.failedTasks).toBe(0);
    });

    it('should record task failure', () => {
      monitor.recordTaskComplete('task-1', false, 1000);
      const metrics = monitor.getMetrics();
      expect(metrics.task.totalTasks).toBe(1);
      expect(metrics.task.successfulTasks).toBe(0);
      expect(metrics.task.failedTasks).toBe(1);
    });

    it('should calculate success rate', () => {
      monitor.recordTaskComplete('task-1', true, 1000);
      monitor.recordTaskComplete('task-2', true, 2000);
      monitor.recordTaskComplete('task-3', false, 500);
      monitor.recordTaskComplete('task-4', false, 500);
      
      const metrics = monitor.getMetrics();
      expect(metrics.task.successRate).toBe(50);
    });

    it('should track task duration', () => {
      monitor.recordTaskComplete('task-1', true, 1000);
      monitor.recordTaskComplete('task-2', true, 2000);
      monitor.recordTaskComplete('task-3', true, 3000);
      
      const metrics = monitor.getMetrics();
      expect(metrics.task.avgDuration).toBe(2000);
    });

    it('should detect task type', () => {
      monitor.recordTaskComplete('task-1', true, 1000, 'analysis');
      monitor.recordTaskComplete('task-2', true, 2000, 'code');
      monitor.recordTaskComplete('task-3', false, 500, 'analysis');
      
      const taskTypeMetrics = monitor.getTaskTypeMetrics('analysis');
      expect(taskTypeMetrics?.total).toBe(2);
      expect(taskTypeMetrics?.successCount).toBe(1);
    });
  });

  describe('Processing speed monitoring', () => {
    it('should calculate throughput', () => {
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        monitor.recordTaskComplete(`task-${i}`, true, 1000);
      }
      
      const metrics = monitor.getMetrics();
      expect(metrics.processingSpeed.throughput).toBeGreaterThan(0);
    });

    it('should detect slow processing', () => {
      // Record slow tasks
      for (let i = 0; i < 5; i++) {
        monitor.recordTaskComplete(`task-${i}`, true, 60000); // 60 seconds each
      }
      
      const alerts = monitor.checkProcessingHealth();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should calculate average processing time', () => {
      monitor.recordTaskComplete('task-1', true, 1000);
      monitor.recordTaskComplete('task-2', true, 3000);
      monitor.recordTaskComplete('task-3', true, 5000);
      
      const metrics = monitor.getMetrics();
      expect(metrics.processingSpeed.avgProcessingTime).toBe(3000);
    });
  });

  describe('Task type analysis', () => {
    it('should track different task types', () => {
      monitor.recordTaskComplete('task-1', true, 1000, 'analysis');
      monitor.recordTaskComplete('task-2', true, 2000, 'code');
      monitor.recordTaskComplete('task-3', true, 500, 'review');
      
      const metrics = monitor.getMetrics();
      expect(metrics.taskByType.size).toBe(3);
    });

    it('should calculate task type success rates', () => {
      monitor.recordTaskComplete('task-1', true, 1000, 'code');
      monitor.recordTaskComplete('task-2', true, 2000, 'code');
      monitor.recordTaskComplete('task-3', false, 500, 'code');
      
      const typeMetrics = monitor.getTaskTypeMetrics('code');
      expect(typeMetrics?.successRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('Performance trends', () => {
    it('should track success rate trend', () => {
      // Good performance
      for (let i = 0; i < 10; i++) {
        monitor.recordTaskComplete(`task-${i}`, true, 1000);
      }
      
      const trend = monitor.getSuccessRateTrend(60000);
      expect(trend).toBeDefined();
    });

    it('should detect success rate degradation', () => {
      // Degraded performance - start with good, then bad
      for (let i = 0; i < 20; i++) {
        monitor.recordTaskComplete(`task-${i}`, i > 15 ? false : true, 1000);
      }
      
      const alerts = monitor.checkTaskHealth();
      expect(alerts.some(a => a.message.includes('success rate'))).toBe(true);
    });
  });

  describe('health check', () => {
    it('should return healthy when metrics are good', () => {
      for (let i = 0; i < 10; i++) {
        monitor.recordTaskComplete(`task-${i}`, true, 1000);
      }
      
      const health = monitor.checkHealth();
      expect(health.status).toBe('healthy');
    });

    it('should return degraded when success rate is low', () => {
      for (let i = 0; i < 20; i++) {
        monitor.recordTaskComplete(`task-${i}`, i < 15, 1000);
      }
      
      const health = monitor.checkHealth();
      expect(health.status).toBe('degraded');
    });

    it('should return unhealthy when success rate is very low', () => {
      for (let i = 0; i < 20; i++) {
        monitor.recordTaskComplete(`task-${i}`, i < 5, 1000);
      }
      
      const health = monitor.checkHealth();
      expect(health.status).toBe('unhealthy');
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const metrics = monitor.getMetrics();
      expect(metrics).toHaveProperty('task');
      expect(metrics).toHaveProperty('processingSpeed');
      expect(metrics).toHaveProperty('taskByType');
      expect(metrics).toHaveProperty('timestamp');
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      monitor.recordTaskComplete('task-1', true, 1000);
      monitor.reset();
      
      const metrics = monitor.getMetrics();
      expect(metrics.task.totalTasks).toBe(0);
    });
  });

  describe('event emission', () => {
    it('should emit health change event', (done) => {
      monitor.on('healthChange', (data) => {
        expect(data).toHaveProperty('status');
        expect(data).toHaveProperty('metrics');
        done();
      });
      
      // Trigger health change
      for (let i = 0; i < 20; i++) {
        monitor.recordTaskComplete(`task-${i}`, false, 1000);
      }
    });
  });
});
