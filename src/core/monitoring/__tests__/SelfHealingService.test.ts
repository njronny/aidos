/**
 * SelfHealingService - 自愈服务测试
 */

import { SelfHealingService, HealingStrategy, HealingAction, HealingResult } from '../SelfHealingService';
import { AlertSeverity } from '../types';

describe('SelfHealingService', () => {
  let service: SelfHealingService;

  beforeEach(() => {
    service = new SelfHealingService();
  });

  describe('constructor', () => {
    it('should create SelfHealingService', () => {
      expect(service).toBeDefined();
    });

    it('should create with custom config', () => {
      const s = new SelfHealingService({
        enableAutoHealing: true,
        maxRetries: 3,
        retryDelayMs: 5000,
      });
      expect(s).toBeDefined();
    });
  });

  describe('Strategy registration', () => {
    it('should register healing strategy', () => {
      const strategy: HealingStrategy = {
        id: 'cpu-high',
        name: 'Reduce CPU Load',
        triggerMetric: 'cpu',
        triggerSeverity: AlertSeverity.WARNING,
        triggerCondition: { operator: 'gt', threshold: 80 },
        actions: [],
      };

      service.registerStrategy(strategy);
      const strategies = service.getStrategies();
      expect(strategies.length).toBeGreaterThan(0);
    });

    it('should register multiple strategies', () => {
      service.registerStrategy({
        id: 'cpu-high',
        name: 'Reduce CPU',
        triggerMetric: 'cpu',
        triggerSeverity: AlertSeverity.WARNING,
        triggerCondition: { operator: 'gt', threshold: 80 },
        actions: [],
      });

      service.registerStrategy({
        id: 'memory-high',
        name: 'Clear Memory',
        triggerMetric: 'memory',
        triggerSeverity: AlertSeverity.WARNING,
        triggerCondition: { operator: 'gt', threshold: 85 },
        actions: [],
      });

      const strategies = service.getStrategies();
      expect(strategies.length).toBe(2);
    });

    it('should unregister strategy', () => {
      service.registerStrategy({
        id: 'test-strategy',
        name: 'Test',
        triggerMetric: 'test',
        triggerSeverity: AlertSeverity.INFO,
        triggerCondition: { operator: 'gt', threshold: 0 },
        actions: [],
      });

      service.unregisterStrategy('test-strategy');
      const strategies = service.getStrategies();
      expect(strategies.length).toBe(0);
    });
  });

  describe('Healing trigger', () => {
    it('should trigger healing for matching metric', async () => {
      service.registerStrategy({
        id: 'cpu-high',
        name: 'Reduce CPU',
        triggerMetric: 'cpu',
        triggerSeverity: AlertSeverity.WARNING,
        triggerCondition: { operator: 'gt' as const, threshold: 80 },
        actions: [
          {
            type: 'command',
            command: 'echo "Healing triggered"',
            timeout: 5000,
          },
        ],
      });

      const result = await service.checkAndHeal('cpu', 90, AlertSeverity.WARNING);
      expect(result.triggered).toBe(true);
    });

    it('should not trigger for non-matching metric', async () => {
      service.registerStrategy({
        id: 'cpu-high',
        name: 'Reduce CPU',
        triggerMetric: 'cpu',
        triggerSeverity: AlertSeverity.WARNING,
        triggerCondition: { operator: 'gt' as const, threshold: 80 },
        actions: [],
      });

      const result = await service.checkAndHeal('memory', 90, AlertSeverity.WARNING);
      expect(result.triggered).toBe(false);
    });

    it('should not trigger for low severity', async () => {
      service.registerStrategy({
        id: 'cpu-high',
        name: 'Reduce CPU',
        triggerMetric: 'cpu',
        triggerSeverity: AlertSeverity.ERROR,
        triggerCondition: { operator: 'gt' as const, threshold: 80 },
        actions: [],
      });

      const result = await service.checkAndHeal('cpu', 90, AlertSeverity.INFO);
      expect(result.triggered).toBe(false);
    });

    it('should not trigger when condition not met', async () => {
      service.registerStrategy({
        id: 'cpu-high',
        name: 'Reduce CPU',
        triggerMetric: 'cpu',
        triggerSeverity: AlertSeverity.WARNING,
        triggerCondition: { operator: 'gt' as const, threshold: 80 },
        actions: [],
      });

      const result = await service.checkAndHeal('cpu', 50, AlertSeverity.WARNING);
      expect(result.triggered).toBe(false);
    });
  });

  describe('Healing execution', () => {
    it('should execute healing actions', async () => {
      service.registerStrategy({
        id: 'test-healing',
        name: 'Test Healing',
        triggerMetric: 'test',
        triggerSeverity: AlertSeverity.WARNING,
        triggerCondition: { operator: 'gt', threshold: 0 },
        actions: [
          {
            type: 'command',
            command: 'echo "test"',
            timeout: 5000,
          },
        ],
      });

      const result = await service.checkAndHeal('test', 100, AlertSeverity.WARNING);
      expect(result.actions.length).toBe(1);
    });

    it('should retry failed actions', async () => {
      service.registerStrategy({
        id: 'retry-test',
        name: 'Retry Test',
        triggerMetric: 'test',
        triggerSeverity: AlertSeverity.WARNING,
        triggerCondition: { operator: 'gt', threshold: 0 },
        actions: [
          {
            type: 'command',
            command: 'exit 1',
            timeout: 5000,
            retryable: true,
          },
        ],
      });

      const result = await service.checkAndHeal('test', 100, AlertSeverity.WARNING);
      // Should have attempted retry
      expect(result.actions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Healing history', () => {
    it('should track healing history', async () => {
      service.registerStrategy({
        id: 'track-test',
        name: 'Track Test',
        triggerMetric: 'test',
        triggerSeverity: AlertSeverity.WARNING,
        triggerCondition: { operator: 'gt', threshold: 0 },
        actions: [
          {
            type: 'command',
            command: 'echo "test"',
            timeout: 5000,
          },
        ],
      });

      await service.checkAndHeal('test', 100, AlertSeverity.WARNING);

      const history = service.getHealingHistory();
      expect(history.length).toBe(1);
    });

    it('should get healing statistics', async () => {
      service.registerStrategy({
        id: 'stats-test',
        name: 'Stats Test',
        triggerMetric: 'test',
        triggerSeverity: AlertSeverity.WARNING,
        triggerCondition: { operator: 'gt', threshold: 0 },
        actions: [
          {
            type: 'command',
            command: 'echo "test"',
            timeout: 5000,
          },
        ],
      });

      await service.checkAndHeal('test', 100, AlertSeverity.WARNING);

      const stats = service.getHealingStats();
      expect(stats.totalHealings).toBe(1);
    });
  });

  describe('Strategy evaluation', () => {
    it('should evaluate conditions correctly', () => {
      const strategy = {
        id: 'eval-test',
        name: 'Eval Test',
        triggerMetric: 'cpu',
        triggerSeverity: AlertSeverity.WARNING,
        triggerCondition: { operator: 'gt' as const, threshold: 80 },
        actions: [],
      };

      // Greater than
      expect(service.evaluateCondition(strategy.triggerCondition, 90)).toBe(true);
      expect(service.evaluateCondition(strategy.triggerCondition, 80)).toBe(false);

      // Less than
      const ltStrategy = { ...strategy, triggerCondition: { operator: 'lt' as const, threshold: 80 } };
      expect(service.evaluateCondition(ltStrategy.triggerCondition, 70)).toBe(true);
      expect(service.evaluateCondition(ltStrategy.triggerCondition, 80)).toBe(false);

      // Equal
      const eqStrategy = { ...strategy, triggerCondition: { operator: 'eq' as const, threshold: 80 } };
      expect(service.evaluateCondition(eqStrategy.triggerCondition, 80)).toBe(true);
      expect(service.evaluateCondition(eqStrategy.triggerCondition, 90)).toBe(false);
    });
  });

  describe('Event emission', () => {
    it('should emit healing started event', async () => {
      const handler = jest.fn();
      service.onHealingStarted(handler);

      service.registerStrategy({
        id: 'event-test',
        name: 'Event Test',
        triggerMetric: 'test',
        triggerSeverity: AlertSeverity.WARNING,
        triggerCondition: { operator: 'gt', threshold: 0 },
        actions: [
          {
            type: 'command',
            command: 'echo "test"',
            timeout: 5000,
          },
        ],
      });

      await service.checkAndHeal('test', 100, AlertSeverity.WARNING);
      expect(handler).toHaveBeenCalled();
    });

    it('should emit healing completed event', async () => {
      const handler = jest.fn();
      service.onHealingCompleted(handler);

      service.registerStrategy({
        id: 'complete-test',
        name: 'Complete Test',
        triggerMetric: 'test',
        triggerSeverity: AlertSeverity.WARNING,
        triggerCondition: { operator: 'gt', threshold: 0 },
        actions: [
          {
            type: 'command',
            command: 'echo "test"',
            timeout: 5000,
          },
        ],
      });

      await service.checkAndHeal('test', 100, AlertSeverity.WARNING);
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Reset', () => {
    it('should reset healing state', async () => {
      service.registerStrategy({
        id: 'reset-test',
        name: 'Reset Test',
        triggerMetric: 'test',
        triggerSeverity: AlertSeverity.WARNING,
        triggerCondition: { operator: 'gt', threshold: 0 },
        actions: [
          {
            type: 'command',
            command: 'echo "test"',
            timeout: 5000,
          },
        ],
      });

      await service.checkAndHeal('test', 100, AlertSeverity.WARNING);
      service.reset();

      const history = service.getHealingHistory();
      expect(history.length).toBe(0);
    });
  });
});
