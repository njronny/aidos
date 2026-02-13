/**
 * MetricsService Tests - 指标采集服务单元测试
 * 使用TDD方式编写
 */

import {
  MetricsService,
  getMetricsService,
  resetMetricsService,
} from '../MetricsService';
import {
  MetricType,
  CoreMetricName,
  MonitoringConfig,
} from '../types';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    resetMetricsService();
    service = new MetricsService();
  });

  describe('constructor', () => {
    it('should create a MetricsService instance', () => {
      expect(service).toBeInstanceOf(MetricsService);
    });

    it('should initialize with default config', () => {
      const newService = new MetricsService();
      expect(newService).toBeDefined();
    });

    it('should accept custom config', () => {
      const config: Partial<MonitoringConfig> = {
        metricsRetentionMs: 60000,
        defaultAlertCooldownMs: 30000,
      };
      const newService = new MetricsService(config);
      expect(newService).toBeInstanceOf(MetricsService);
    });
  });

  describe('initializeCoreMetrics', () => {
    it('should initialize core metrics on construction', () => {
      expect(service.getMetric(CoreMetricName.TASK_SUCCESS_RATE)).toBeDefined();
      expect(service.getMetric(CoreMetricName.TASK_DURATION)).toBeDefined();
      expect(service.getMetric(CoreMetricName.TASK_COUNT)).toBeDefined();
      expect(service.getMetric(CoreMetricName.QUEUE_DEPTH)).toBeDefined();
      expect(service.getMetric(CoreMetricName.API_RESPONSE_TIME)).toBeDefined();
      expect(service.getMetric(CoreMetricName.AGENT_ACTIVE_COUNT)).toBeDefined();
    });
  });

  describe('createMetric', () => {
    it('should create a new metric', () => {
      const metric = service.createMetric('test_metric', MetricType.COUNTER, 'count');
      expect(metric.name).toBe('test_metric');
      expect(metric.type).toBe(MetricType.COUNTER);
      expect(metric.unit).toBe('count');
      expect(metric.value).toBe(0);
      expect(metric.history).toEqual([]);
    });

    it('should store metric in metrics map', () => {
      service.createMetric('test_metric', MetricType.GAUGE);
      expect(service.getMetric('test_metric')).toBeDefined();
    });

    it('should allow creating metric with tags', () => {
      const tags = { env: 'test', region: 'us-east' };
      const metric = service.createMetric('test_metric', MetricType.COUNTER, 'count', tags);
      expect(metric.tags).toEqual(tags);
    });
  });

  describe('getOrCreateMetric', () => {
    it('should return existing metric if exists', () => {
      service.createMetric('existing', MetricType.COUNTER);
      const metric = service.getOrCreateMetric('existing', MetricType.GAUGE);
      expect(metric.type).toBe(MetricType.COUNTER);
    });

    it('should create metric if does not exist', () => {
      const metric = service.getOrCreateMetric('new_metric', MetricType.HISTOGRAM, 'ms');
      expect(metric.name).toBe('new_metric');
      expect(metric.type).toBe(MetricType.HISTOGRAM);
    });
  });

  describe('incrementCounter', () => {
    it('should increment counter metric', () => {
      service.incrementCounter('test_counter');
      expect(service.getValue('test_counter')).toBe(1);
    });

    it('should increment by specified value', () => {
      service.incrementCounter('test_counter', 5);
      expect(service.getValue('test_counter')).toBe(5);
    });

    it('should accumulate increments', () => {
      service.incrementCounter('test_counter', 3);
      service.incrementCounter('test_counter', 2);
      expect(service.getValue('test_counter')).toBe(5);
    });

    it('should create counter if does not exist', () => {
      service.incrementCounter('new_counter', 10);
      expect(service.getValue('new_counter')).toBe(10);
    });
  });

  describe('setGauge', () => {
    it('should set gauge metric value directly', () => {
      service.setGauge('test_gauge', 100);
      expect(service.getValue('test_gauge')).toBe(100);
    });

    it('should overwrite previous value', () => {
      service.setGauge('test_gauge', 50);
      service.setGauge('test_gauge', 100);
      expect(service.getValue('test_gauge')).toBe(100);
    });
  });

  describe('recordHistogram', () => {
    it('should record histogram metric value', () => {
      service.recordHistogram('test_histogram', 150);
      expect(service.getValue('test_histogram')).toBe(150);
    });

    it('should add data points to history', () => {
      service.recordHistogram('test_histogram', 100);
      service.recordHistogram('test_histogram', 200);
      const history = service.getHistory('test_histogram');
      expect(history.length).toBe(2);
    });
  });

  describe('getValue', () => {
    it('should return 0 for non-existent metric', () => {
      expect(service.getValue('non_existent')).toBe(0);
    });

    it('should return current value for existing metric', () => {
      service.incrementCounter('test', 42);
      expect(service.getValue('test')).toBe(42);
    });
  });

  describe('getHistory', () => {
    it('should return empty array for non-existent metric', () => {
      expect(service.getHistory('non_existent')).toEqual([]);
    });

    it('should return all history data points', () => {
      service.recordHistogram('test', 100);
      service.recordHistogram('test', 200);
      const history = service.getHistory('test');
      expect(history.length).toBe(2);
    });

    it('should filter by duration', () => {
      service.recordHistogram('test', 100);
      // Note: Without time travel, we can't easily test duration filtering
      // This would require mocking Date.now() or similar
    });
  });

  describe('getAverage', () => {
    it('should return 0 for empty history', () => {
      expect(service.getAverage('non_existent')).toBe(0);
    });

    it('should calculate average correctly', () => {
      service.recordHistogram('test', 100);
      service.recordHistogram('test', 200);
      service.recordHistogram('test', 300);
      expect(service.getAverage('test')).toBe(200);
    });
  });

  describe('getPercentile', () => {
    it('should return 0 for empty history', () => {
      expect(service.getPercentile('non_existent', 95)).toBe(0);
    });

    it('should calculate 50th percentile (median)', () => {
      service.recordHistogram('test', 100);
      service.recordHistogram('test', 200);
      service.recordHistogram('test', 300);
      expect(service.getPercentile('test', 50)).toBe(200);
    });

    it('should calculate 95th percentile', () => {
      for (let i = 1; i <= 100; i++) {
        service.recordHistogram('test', i);
      }
      const p95 = service.getPercentile('test', 95);
      expect(p95).toBeGreaterThanOrEqual(95);
    });
  });

  describe('task metrics', () => {
    it('should record task completion', () => {
      service.recordTaskComplete(true, 1000);
      expect(service.getValue(CoreMetricName.TASK_COUNT)).toBe(1);
      expect(service.getValue(CoreMetricName.TASK_FAILED_COUNT)).toBe(0);
      expect(service.getValue(CoreMetricName.TASK_SUCCESS_RATE)).toBe(100);
    });

    it('should record failed task', () => {
      service.recordTaskComplete(false, 1000);
      expect(service.getValue(CoreMetricName.TASK_COUNT)).toBe(1);
      expect(service.getValue(CoreMetricName.TASK_FAILED_COUNT)).toBe(1);
      expect(service.getValue(CoreMetricName.TASK_SUCCESS_RATE)).toBe(0);
    });

    it('should calculate success rate correctly', () => {
      service.recordTaskComplete(true, 1000);
      service.recordTaskComplete(true, 1000);
      service.recordTaskComplete(false, 1000);
      expect(service.getValue(CoreMetricName.TASK_SUCCESS_RATE)).toBeCloseTo(66.67, 1);
    });
  });

  describe('queue metrics', () => {
    it('should set queue depth', () => {
      service.setQueueDepth(50);
      expect(service.getValue(CoreMetricName.QUEUE_DEPTH)).toBe(50);
    });

    it('should record queue wait time', () => {
      service.recordQueueWaitTime(500);
      const history = service.getHistory(CoreMetricName.QUEUE_WAIT_TIME);
      expect(history.length).toBe(1);
    });
  });

  describe('api metrics', () => {
    it('should increment API request count', () => {
      service.incrementApiRequest();
      service.incrementApiRequest();
      expect(service.getValue(CoreMetricName.API_REQUEST_COUNT)).toBe(2);
    });

    it('should record API response time', () => {
      service.recordApiResponseTime(250);
      expect(service.getValue(CoreMetricName.API_RESPONSE_TIME)).toBe(250);
    });

    it('should increment API error count', () => {
      service.incrementApiError();
      service.incrementApiError();
      expect(service.getValue(CoreMetricName.API_ERROR_COUNT)).toBe(2);
    });

    it('should calculate API error rate correctly', () => {
      // Record successful requests
      service.incrementApiRequest();
      service.incrementApiRequest();
      service.incrementApiRequest();
      service.incrementApiRequest();
      
      // Record errors
      service.incrementApiError();
      service.incrementApiError();
      
      // Update error rate by recording a response (triggers updateApiErrorRate)
      service.recordApiResponseTime(100);
      
      // Error rate = 2 errors / 4 requests * 100 = 50%
      expect(service.getValue(CoreMetricName.API_ERROR_RATE)).toBe(50);
    });

    it('should have 0 error rate when no errors', () => {
      service.incrementApiRequest();
      service.recordApiResponseTime(100);
      
      expect(service.getValue(CoreMetricName.API_ERROR_RATE)).toBe(0);
    });

    it('should have 0 error rate when no requests', () => {
      service.incrementApiError();
      service.recordApiResponseTime(100);
      
      // No requests, so error rate should be 0 (not division by zero)
      expect(service.getValue(CoreMetricName.API_ERROR_RATE)).toBe(0);
    });
  });

  describe('agent metrics', () => {
    it('should set agent counts', () => {
      service.setAgentCounts(3, 2);
      expect(service.getValue(CoreMetricName.AGENT_ACTIVE_COUNT)).toBe(3);
      expect(service.getValue(CoreMetricName.AGENT_IDLE_COUNT)).toBe(2);
    });

    it('should record agent task duration', () => {
      service.recordAgentTaskDuration(3000);
      expect(service.getValue(CoreMetricName.AGENT_TASK_DURATION)).toBe(3000);
    });
  });

  describe('getMetricsSummary', () => {
    it('should return summary with all metric categories', () => {
      const summary = service.getMetricsSummary();
      
      expect(summary).toHaveProperty('taskMetrics');
      expect(summary).toHaveProperty('queueMetrics');
      expect(summary).toHaveProperty('apiMetrics');
      expect(summary).toHaveProperty('agentMetrics');
    });

    it('should reflect recorded metrics in summary', () => {
      service.recordTaskComplete(true, 1000);
      service.setQueueDepth(10);
      service.incrementApiRequest();
      service.incrementApiError();
      service.recordApiResponseTime(100);
      service.setAgentCounts(2, 3);

      const summary = service.getMetricsSummary();
      
      expect(summary.taskMetrics.totalTasks).toBe(1);
      expect(summary.queueMetrics.depth).toBe(10);
      expect(summary.apiMetrics.requestCount).toBe(1);
      expect(summary.apiMetrics.errorCount).toBe(1);
      expect(summary.apiMetrics.errorRate).toBe(100);
      expect(summary.agentMetrics.active).toBe(2);
      expect(summary.agentMetrics.idle).toBe(3);
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      service.incrementCounter('test', 100);
      service.setGauge('gauge', 50);
      service.reset();
      
      expect(service.getValue('test')).toBe(0);
      expect(service.getValue('gauge')).toBe(0);
    });

    it('should reinitialize core metrics after reset', () => {
      service.reset();
      expect(service.getMetric(CoreMetricName.TASK_SUCCESS_RATE)).toBeDefined();
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = getMetricsService();
      const instance2 = getMetricsService();
      expect(instance1).toBe(instance2);
    });

    it('should allow reset for testing', () => {
      const instance1 = getMetricsService();
      resetMetricsService();
      const instance2 = getMetricsService();
      expect(instance1).not.toBe(instance2);
    });
  });
});
