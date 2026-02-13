/**
 * AlertService - 告警管理服务
 * 使用TDD方式实现，负责告警规则的创建、评估和触发
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Alert,
  AlertRule,
  AlertSeverity,
  AlertStatus,
  AlertCondition,
  CoreMetricName,
} from './types';
import { MetricsService } from './MetricsService';
import { getMetricsService } from './MetricsService';

/**
 * 预定义的告警规则
 */
export const DEFAULT_ALERT_RULES: Omit<AlertRule, 'id' | 'createdAt'>[] = [
  {
    name: '任务成功率低',
    metricName: CoreMetricName.TASK_SUCCESS_RATE,
    condition: { operator: 'lt', threshold: 80 },
    severity: AlertSeverity.WARNING,
    enabled: true,
    cooldownMs: 300000, // 5分钟
  },
  {
    name: '任务失败率过高',
    metricName: CoreMetricName.TASK_SUCCESS_RATE,
    condition: { operator: 'lt', threshold: 50 },
    severity: AlertSeverity.ERROR,
    enabled: true,
    cooldownMs: 60000, // 1分钟
  },
  {
    name: '队列积压',
    metricName: CoreMetricName.QUEUE_DEPTH,
    condition: { operator: 'gt', threshold: 100 },
    severity: AlertSeverity.WARNING,
    enabled: true,
    cooldownMs: 120000, // 2分钟
  },
  {
    name: '队列严重积压',
    metricName: CoreMetricName.QUEUE_DEPTH,
    condition: { operator: 'gt', threshold: 500 },
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    cooldownMs: 60000, // 1分钟
  },
  {
    name: 'API响应时间过长',
    metricName: CoreMetricName.API_RESPONSE_TIME,
    condition: { operator: 'gt', threshold: 5000 }, // 5秒
    severity: AlertSeverity.WARNING,
    enabled: true,
    cooldownMs: 120000, // 2分钟
  },
  {
    name: 'API响应超时',
    metricName: CoreMetricName.API_RESPONSE_TIME,
    condition: { operator: 'gt', threshold: 10000 }, // 10秒
    severity: AlertSeverity.ERROR,
    enabled: true,
    cooldownMs: 60000, // 1分钟
  },
  {
    name: 'API错误率过高',
    metricName: CoreMetricName.API_ERROR_RATE,
    condition: { operator: 'gt', threshold: 10 }, // 10%
    severity: AlertSeverity.ERROR,
    enabled: true,
    cooldownMs: 60000, // 1分钟
  },
  {
    name: 'Agent全部忙碌',
    metricName: CoreMetricName.AGENT_ACTIVE_COUNT,
    condition: { operator: 'gt', threshold: 0 }, // 有活跃Agent时检查
    severity: AlertSeverity.INFO,
    enabled: false, // 默认关闭
    cooldownMs: 60000,
  },
];

/**
 * AlertService - 告警管理服务
 */
export class AlertService {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private lastTriggered: Map<string, number> = new Map();
  private metricsService: MetricsService;
  private alertHandlers: ((alert: Alert) => void)[] = [];

  constructor(metricsService?: MetricsService) {
    this.metricsService = metricsService ?? getMetricsService();
    this.initializeDefaultRules();
  }

  /**
   * 初始化默认告警规则
   */
  private initializeDefaultRules(): void {
    for (const rule of DEFAULT_ALERT_RULES) {
      this.createRule(rule);
    }
  }

  /**
   * 创建告警规则
   */
  createRule(
    rule: Omit<AlertRule, 'id' | 'createdAt'>
  ): AlertRule {
    const newRule: AlertRule = {
      ...rule,
      id: uuidv4(),
      createdAt: new Date(),
    };
    this.rules.set(newRule.id, newRule);
    return newRule;
  }

  /**
   * 更新告警规则
   */
  updateRule(id: string, updates: Partial<Omit<AlertRule, 'id' | 'createdAt'>>): AlertRule | null {
    const rule = this.rules.get(id);
    if (!rule) {
      return null;
    }
    const updatedRule = { ...rule, ...updates };
    this.rules.set(id, updatedRule);
    return updatedRule;
  }

  /**
   * 删除告警规则
   */
  deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  /**
   * 获取所有告警规则
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取启用的告警规则
   */
  getEnabledRules(): AlertRule[] {
    return Array.from(this.rules.values()).filter((rule) => rule.enabled);
  }

  /**
   * 评估告警条件
   */
  private evaluateCondition(condition: AlertCondition, value: number): boolean {
    switch (condition.operator) {
      case 'gt':
        return value > condition.threshold;
      case 'lt':
        return value < condition.threshold;
      case 'eq':
        return value === condition.threshold;
      case 'gte':
        return value >= condition.threshold;
      case 'lte':
        return value <= condition.threshold;
      case 'not_eq':
        return value !== condition.threshold;
      default:
        return false;
    }
  }

  /**
   * 检查是否在冷却时间内
   */
  private isInCooldown(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return true;
    }

    const lastTriggeredAt = this.lastTriggered.get(ruleId);
    if (!lastTriggeredAt) {
      return false;
    }

    return Date.now() - lastTriggeredAt < rule.cooldownMs;
  }

  /**
   * 评估所有启用的规则
   */
  evaluate(): Alert[] {
    const triggeredAlerts: Alert[] = [];
    const enabledRules = this.getEnabledRules();

    for (const rule of enabledRules) {
      // 检查冷却时间
      if (this.isInCooldown(rule.id)) {
        continue;
      }

      // 获取指标值
      const metric = this.metricsService.getMetric(rule.metricName);
      if (!metric) {
        continue;
      }

      // 评估条件
      const value = metric.value;
      if (this.evaluateCondition(rule.condition, value)) {
        const alert = this.createAlert(rule, value);
        triggeredAlerts.push(alert);
        this.lastTriggered.set(rule.id, Date.now());
      }
    }

    return triggeredAlerts;
  }

  /**
   * 创建告警实例
   */
  private createAlert(rule: AlertRule, value: number): Alert {
    const alert: Alert = {
      id: uuidv4(),
      ruleId: rule.id,
      ruleName: rule.name,
      metricName: rule.metricName,
      severity: rule.severity,
      message: this.generateAlertMessage(rule, value),
      value,
      threshold: rule.condition.threshold,
      status: AlertStatus.ACTIVE,
      triggeredAt: new Date(),
      tags: rule.metricName ? { metric: rule.metricName } : undefined,
    };

    this.alerts.set(alert.id, alert);

    // 触发告警处理程序
    this.notifyAlertHandlers(alert);

    return alert;
  }

  /**
   * 生成告警消息
   */
  private generateAlertMessage(rule: AlertRule, value: number): string {
    const operatorText = {
      gt: '超过',
      lt: '低于',
      eq: '等于',
      gte: '大于等于',
      lte: '小于等于',
      not_eq: '不等于',
    };

    return `${rule.name}: ${rule.metricName} 为 ${value.toFixed(2)}，${operatorText[rule.condition.operator]} ${rule.condition.threshold}`;
  }

  /**
   * 注册告警处理程序
   */
  onAlert(handler: (alert: Alert) => void): void {
    this.alertHandlers.push(handler);
  }

  /**
   * 通知告警处理程序
   */
  private notifyAlertHandlers(alert: Alert): void {
    for (const handler of this.alertHandlers) {
      try {
        handler(alert);
      } catch (error) {
        console.error('Alert handler error:', error);
      }
    }
  }

  /**
   * 获取所有告警
   */
  getAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): Alert[] {
    return this.getAlerts().filter((alert) => alert.status === AlertStatus.ACTIVE);
  }

  /**
   * 获取告警按严重程度排序
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return this.getAlerts().filter((alert) => alert.severity === severity);
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string, acknowledgedBy?: string): Alert | null {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== AlertStatus.ACTIVE) {
      return null;
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    return alert;
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): Alert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return null;
    }

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();

    return alert;
  }

  /**
   * 获取告警统计
   */
  getAlertStats(): {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    bySeverity: Record<AlertSeverity, number>;
  } {
    const alerts = this.getAlerts();
    const bySeverity = {
      [AlertSeverity.INFO]: 0,
      [AlertSeverity.WARNING]: 0,
      [AlertSeverity.ERROR]: 0,
      [AlertSeverity.CRITICAL]: 0,
    };

    let active = 0;
    let acknowledged = 0;
    let resolved = 0;

    for (const alert of alerts) {
      bySeverity[alert.severity]++;

      switch (alert.status) {
        case AlertStatus.ACTIVE:
          active++;
          break;
        case AlertStatus.ACKNOWLEDGED:
          acknowledged++;
          break;
        case AlertStatus.RESOLVED:
          resolved++;
          break;
      }
    }

    return {
      total: alerts.length,
      active,
      acknowledged,
      resolved,
      bySeverity,
    };
  }

  /**
   * 清理已解决的旧告警
   */
  cleanupResolvedAlerts(olderThanMs: number = 86400000): number {
    const cutoff = Date.now() - olderThanMs;
    let cleaned = 0;

    for (const [id, alert] of this.alerts) {
      if (
        alert.status === AlertStatus.RESOLVED &&
        alert.resolvedAt &&
        alert.resolvedAt.getTime() < cutoff
      ) {
        this.alerts.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 手动触发告警（用于测试）
   */
  triggerAlert(ruleId: string, value: number): Alert | null {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return null;
    }

    if (this.evaluateCondition(rule.condition, value)) {
      return this.createAlert(rule, value);
    }

    return null;
  }
}

// Singleton instance
let alertServiceInstance: AlertService | null = null;

/**
 * 获取AlertService单例
 */
export function getAlertService(metricsService?: MetricsService): AlertService {
  if (!alertServiceInstance) {
    alertServiceInstance = new AlertService(metricsService);
  }
  return alertServiceInstance;
}

/**
 * 重置AlertService单例（用于测试）
 */
export function resetAlertService(): void {
  alertServiceInstance = null;
}

export default AlertService;
