/**
 * MonitoringService Tests - TDD
 * 
 * 测试监控服务
 */

import { MonitoringService, Metric, Alert, AlertLevel } from '../MonitoringService';

describe('MonitoringService', () => {
  let monitor: MonitoringService;

  beforeEach(() => {
    monitor = new MonitoringService();
  });

  describe('constructor', () => {
    it('should create monitoring service', () => {
      expect(monitor).toBeDefined();
    });
  });

  describe('metrics', () => {
    it('should record metric', () => {
      monitor.recordMetric({
        name: 'cpu.usage',
        value: 75,
        unit: 'percent',
        timestamp: Date.now(),
      });

      const metrics = monitor.getMetrics('cpu.usage');
      expect(metrics.length).toBe(1);
    });

    it('should get metrics by name', () => {
      monitor.recordMetric({ name: 'memory.usage', value: 50, unit: 'percent', timestamp: Date.now() });
      monitor.recordMetric({ name: 'memory.usage', value: 60, unit: 'percent', timestamp: Date.now() });

      const metrics = monitor.getMetrics('memory.usage');
      expect(metrics.length).toBe(2);
    });

    it('should calculate average', () => {
      monitor.recordMetric({ name: 'response.time', value: 100, unit: 'ms', timestamp: Date.now() });
      monitor.recordMetric({ name: 'response.time', value: 200, unit: 'ms', timestamp: Date.now() });

      const avg = monitor.getAverage('response.time');
      expect(avg).toBe(150);
    });
  });

  describe('alerts', () => {
    it('should create alert', () => {
      monitor.createAlert({
        name: 'High CPU',
        message: 'CPU usage above 90%',
        level: 'warning',
        source: 'system',
      });

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBe(1);
    });

    it('should filter alerts by level', () => {
      monitor.createAlert({ name: 'Warning', message: 'Test', level: 'warning', source: 'test' });
      monitor.createAlert({ name: 'Critical', message: 'Test', level: 'critical', source: 'test' });

      const warnings = monitor.getAlertsByLevel('warning');
      expect(warnings.length).toBe(1);
    });

    it('should acknowledge alert', () => {
      const alert = monitor.createAlert({
        name: 'Test',
        message: 'Test',
        level: 'info',
        source: 'test',
      });

      monitor.acknowledgeAlert(alert.id, 'user-1');

      const alerts = monitor.getAlerts();
      expect(alerts[0]?.acknowledged).toBe(true);
    });
  });

  describe('health checks', () => {
    it('should register health check', () => {
      monitor.registerHealthCheck('database', async () => ({ healthy: true }));

      const health = monitor.getHealthStatus();
      expect(health).toHaveProperty('database');
    });

    it('should perform health check', async () => {
      monitor.registerHealthCheck('cache', async () => ({ healthy: true, message: 'OK' }));

      const status = await monitor.checkHealth('cache');
      expect(status?.healthy).toBe(true);
    });
  });

  describe('dashboards', () => {
    it('should create dashboard', () => {
      monitor.createDashboard({
        id: 'main',
        name: 'Main Dashboard',
        widgets: [],
      });

      const dash = monitor.getDashboard('main');
      expect(dash?.name).toBe('Main Dashboard');
    });

    it('should add widget to dashboard', () => {
      monitor.createDashboard({
        id: 'test',
        name: 'Test',
        widgets: [],
      });

      monitor.addWidget('test', {
        id: 'w1',
        type: 'chart',
        title: 'CPU',
        config: {},
      });

      const dash = monitor.getDashboard('test');
      expect(dash?.widgets.length).toBe(1);
    });
  });
});
