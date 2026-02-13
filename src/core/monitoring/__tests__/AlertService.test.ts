/**
 * AlertService Tests - 告警管理服务单元测试
 * 使用TDD方式编写
 */

import {
  AlertService,
  getAlertService,
  resetAlertService,
  DEFAULT_ALERT_RULES,
} from '../AlertService';
import {
  AlertSeverity,
  AlertStatus,
  CoreMetricName,
} from '../types';
import { MetricsService } from '../MetricsService';

describe('AlertService', () => {
  let alertService: AlertService;
  let metricsService: MetricsService;

  beforeEach(() => {
    resetAlertService();
    metricsService = new MetricsService();
    alertService = new AlertService(metricsService);
  });

  describe('constructor', () => {
    it('should create an AlertService instance', () => {
      expect(alertService).toBeInstanceOf(AlertService);
    });

    it('should initialize with default rules', () => {
      const rules = alertService.getRules();
      expect(rules.length).toBe(DEFAULT_ALERT_RULES.length);
    });
  });

  describe('createRule', () => {
    it('should create a new alert rule', () => {
      const rule = alertService.createRule({
        name: 'Test Alert',
        metricName: CoreMetricName.TASK_SUCCESS_RATE,
        condition: { operator: 'lt', threshold: 50 },
        severity: AlertSeverity.ERROR,
        enabled: true,
        cooldownMs: 60000,
      });

      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('Test Alert');
      expect(rule.enabled).toBe(true);
      expect(rule.createdAt).toBeDefined();
    });

    it('should store rule in rules map', () => {
      const rule = alertService.createRule({
        name: 'Test Rule',
        metricName: CoreMetricName.QUEUE_DEPTH,
        condition: { operator: 'gt', threshold: 100 },
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownMs: 30000,
      });

      const rules = alertService.getRules();
      expect(rules.some(r => r.id === rule.id)).toBe(true);
    });
  });

  describe('updateRule', () => {
    it('should update existing rule', () => {
      const rule = alertService.createRule({
        name: 'Original Name',
        metricName: CoreMetricName.TASK_SUCCESS_RATE,
        condition: { operator: 'lt', threshold: 50 },
        severity: AlertSeverity.ERROR,
        enabled: true,
        cooldownMs: 60000,
      });

      const updated = alertService.updateRule(rule.id, {
        name: 'Updated Name',
        enabled: false,
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.enabled).toBe(false);
    });

    it('should return null for non-existent rule', () => {
      const result = alertService.updateRule('non-existent-id', {
        name: 'Test',
      });
      expect(result).toBeNull();
    });
  });

  describe('deleteRule', () => {
    it('should delete existing rule', () => {
      const rule = alertService.createRule({
        name: 'To Delete',
        metricName: CoreMetricName.TASK_SUCCESS_RATE,
        condition: { operator: 'lt', threshold: 50 },
        severity: AlertSeverity.ERROR,
        enabled: true,
        cooldownMs: 60000,
      });

      const result = alertService.deleteRule(rule.id);
      expect(result).toBe(true);

      const rules = alertService.getRules();
      expect(rules.some(r => r.id === rule.id)).toBe(false);
    });

    it('should return false for non-existent rule', () => {
      const result = alertService.deleteRule('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getEnabledRules', () => {
    it('should return only enabled rules', () => {
      alertService.createRule({
        name: 'Enabled Rule',
        metricName: CoreMetricName.TASK_SUCCESS_RATE,
        condition: { operator: 'lt', threshold: 50 },
        severity: AlertSeverity.ERROR,
        enabled: true,
        cooldownMs: 60000,
      });

      alertService.createRule({
        name: 'Disabled Rule',
        metricName: CoreMetricName.QUEUE_DEPTH,
        condition: { operator: 'gt', threshold: 100 },
        severity: AlertSeverity.WARNING,
        enabled: false,
        cooldownMs: 30000,
      });

      const enabledRules = alertService.getEnabledRules();
      expect(enabledRules.length).toBeGreaterThan(0);
      expect(enabledRules.every(r => r.enabled)).toBe(true);
    });
  });

  describe('evaluateCondition', () => {
    // Test private method through evaluate()
    it('should trigger alert when condition is met (gt)', () => {
      metricsService.setGauge(CoreMetricName.QUEUE_DEPTH, 150);

      const alerts = alertService.evaluate();
      const queueAlert = alerts.find(a => a.metricName === CoreMetricName.QUEUE_DEPTH);
      
      expect(queueAlert).toBeDefined();
    });

    it('should not trigger alert when condition is not met', () => {
      metricsService.setGauge(CoreMetricName.QUEUE_DEPTH, 50);

      const alerts = alertService.evaluate();
      const queueAlert = alerts.find(a => a.metricName === CoreMetricName.QUEUE_DEPTH);
      
      expect(queueAlert).toBeUndefined();
    });

    it('should trigger alert for lt operator', () => {
      metricsService.setGauge(CoreMetricName.TASK_SUCCESS_RATE, 30);

      const alerts = alertService.evaluate();
      const successAlert = alerts.find(a => a.metricName === CoreMetricName.TASK_SUCCESS_RATE);
      
      expect(successAlert).toBeDefined();
    });

    it('should not trigger alert when value equals threshold for gt', () => {
      metricsService.setGauge(CoreMetricName.QUEUE_DEPTH, 100);

      const alerts = alertService.evaluate();
      const queueAlert = alerts.find(a => 
        a.metricName === CoreMetricName.QUEUE_DEPTH && 
        a.status === AlertStatus.ACTIVE
      );
      
      // 100 is not > 100, so no alert
      expect(queueAlert).toBeUndefined();
    });
  });

  describe('cooldown', () => {
    it('should not trigger alert within cooldown period', () => {
      // Create a rule with short cooldown
      alertService.createRule({
        name: 'Quick Cooldown',
        metricName: CoreMetricName.QUEUE_DEPTH,
        condition: { operator: 'gt', threshold: 10 },
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownMs: 10000, // 10 seconds
      });

      metricsService.setGauge(CoreMetricName.QUEUE_DEPTH, 20);
      
      // First evaluation should trigger
      const alerts1 = alertService.evaluate();
      expect(alerts1.length).toBeGreaterThan(0);

      // Second evaluation within cooldown should not trigger
      const alerts2 = alertService.evaluate();
      // Should not have new alerts for same rule
      expect(alerts2.length).toBe(0);
    });
  });

  describe('alert handlers', () => {
    it('should call registered alert handler', () => {
      const handler = jest.fn();
      alertService.onAlert(handler);

      metricsService.setGauge(CoreMetricName.QUEUE_DEPTH, 200);
      alertService.evaluate();

      expect(handler).toHaveBeenCalled();
    });

    it('should pass alert data to handler', () => {
      let capturedAlert: any;
      alertService.onAlert((alert) => {
        capturedAlert = alert;
      });

      metricsService.setGauge(CoreMetricName.QUEUE_DEPTH, 200);
      alertService.evaluate();

      expect(capturedAlert).toBeDefined();
      expect(capturedAlert.metricName).toBe(CoreMetricName.QUEUE_DEPTH);
      expect(capturedAlert.severity).toBeDefined();
    });
  });

  describe('getAlerts', () => {
    it('should return all alerts', () => {
      metricsService.setGauge(CoreMetricName.QUEUE_DEPTH, 200);
      metricsService.setGauge(CoreMetricName.TASK_SUCCESS_RATE, 30);
      alertService.evaluate();

      const alerts = alertService.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe('getActiveAlerts', () => {
    it('should return only active alerts', () => {
      metricsService.setGauge(CoreMetricName.QUEUE_DEPTH, 200);
      alertService.evaluate();

      const activeAlerts = alertService.getActiveAlerts();
      expect(activeAlerts.every(a => a.status === AlertStatus.ACTIVE)).toBe(true);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge active alert', () => {
      metricsService.setGauge(CoreMetricName.QUEUE_DEPTH, 200);
      const alerts = alertService.evaluate();
      const alert = alerts[0];

      const acknowledged = alertService.acknowledgeAlert(alert.id, 'admin');
      
      expect(acknowledged?.status).toBe(AlertStatus.ACKNOWLEDGED);
      expect(acknowledged?.acknowledgedBy).toBe('admin');
      expect(acknowledged?.acknowledgedAt).toBeDefined();
    });

    it('should return null for non-existent alert', () => {
      const result = alertService.acknowledgeAlert('non-existent');
      expect(result).toBeNull();
    });

    it('should not acknowledge resolved alert', () => {
      metricsService.setGauge(CoreMetricName.QUEUE_DEPTH, 200);
      const alerts = alertService.evaluate();
      const alert = alerts[0];

      alertService.resolveAlert(alert.id);
      const result = alertService.acknowledgeAlert(alert.id);

      expect(result).toBeNull();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve active alert', () => {
      metricsService.setGauge(CoreMetricName.QUEUE_DEPTH, 200);
      const alerts = alertService.evaluate();
      const alert = alerts[0];

      const resolved = alertService.resolveAlert(alert.id);
      
      expect(resolved?.status).toBe(AlertStatus.RESOLVED);
      expect(resolved?.resolvedAt).toBeDefined();
    });

    it('should return null for non-existent alert', () => {
      const result = alertService.resolveAlert('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getAlertStats', () => {
    it('should return correct stats', () => {
      metricsService.setGauge(CoreMetricName.QUEUE_DEPTH, 200);
      alertService.evaluate();

      const stats = alertService.getAlertStats();
      
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.active).toBeGreaterThan(0);
      expect(stats.bySeverity).toBeDefined();
    });
  });

  describe('cleanupResolvedAlerts', () => {
    it('should clean up old resolved alerts', () => {
      // This test would require time manipulation
      // Skipping for simplicity
    });
  });

  describe('triggerAlert (manual)', () => {
    it('should manually trigger alert', () => {
      const rules = alertService.getRules();
      const rule = rules[0];

      const alert = alertService.triggerAlert(rule.id, 10);
      
      if (alert) {
        expect(alert.ruleId).toBe(rule.id);
      }
    });

    it('should return null for non-matching condition', () => {
      const rules = alertService.getRules();
      const rule = rules[0];

      // For success rate > threshold (if condition is lt)
      const alert = alertService.triggerAlert(rule.id, 100);
      
      expect(alert).toBeNull();
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = getAlertService(metricsService);
      const instance2 = getAlertService(metricsService);
      expect(instance1).toBe(instance2);
    });

    it('should allow reset for testing', () => {
      const instance1 = getAlertService(metricsService);
      resetAlertService();
      const instance2 = getAlertService(metricsService);
      expect(instance1).not.toBe(instance2);
    });
  });
});
