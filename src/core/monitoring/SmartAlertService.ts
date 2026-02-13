/**
 * SmartAlertService - 智能告警服务
 * 提供告警抑制、升级、路由等智能功能
 */

import { EventEmitter } from 'events';
import { AlertSeverity, AlertStatus } from './types';

/**
 * 智能告警配置
 */
export interface SmartAlertConfig {
  /** 是否启用告警抑制 */
  enableSuppression?: boolean;
  /** 是否启用告警升级 */
  enableEscalation?: boolean;
  /** 抑制窗口时间（毫秒） */
  suppressionWindowMs?: number;
  /** 升级阈值（触发次数） */
  escalationThreshold?: number;
  /** 升级间隔（毫秒） */
  escalationIntervalMs?: number;
}

/**
 * 告警事件
 */
export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  message: string;
  metricName: string;
  value: number;
  threshold: number;
  timestamp: number;
  tags?: Record<string, string>;
}

/**
 * 告警处理结果
 */
export interface AlertProcessResult {
  alert: AlertEvent;
  processed: boolean;
  suppressed: boolean;
  escalated: boolean;
  route?: string;
}

/**
 * 告警抑制记录
 */
export interface AlertSuppression {
  ruleId: string;
  metricName: string;
  count: number;
  firstTriggered: number;
  lastTriggered: number;
  suppressedSince: number;
}

/**
 * 告警升级记录
 */
export interface AlertEscalation {
  ruleId: string;
  originalSeverity: AlertSeverity;
  currentSeverity: AlertSeverity;
  triggerCount: number;
  firstTriggered: number;
  lastTriggered: number;
  escalatedAt?: number;
}

/**
 * 告警统计
 */
export interface AlertStats {
  total: number;
  processed: number;
  suppressed: number;
  escalated: number;
  bySeverity: Record<AlertSeverity, number>;
  byRule: Record<string, number>;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<SmartAlertConfig> = {
  enableSuppression: true,
  enableEscalation: true,
  suppressionWindowMs: 60000, // 1 minute
  escalationThreshold: 3,
  escalationIntervalMs: 300000, // 5 minutes
};

/**
 * 告警历史记录
 */
interface AlertHistoryRecord {
  id: string;
  ruleId: string;
  severity: AlertSeverity;
  suppressed: boolean;
  escalated: boolean;
  timestamp: number;
}

/**
 * SmartAlertService - 智能告警服务
 * 提供告警抑制、升级、路由等智能功能
 */
export class SmartAlertService extends EventEmitter {
  private config: Required<SmartAlertConfig>;
  private suppressions: Map<string, AlertSuppression> = new Map();
  private escalations: Map<string, AlertEscalation> = new Map();
  private alertHistory: AlertHistoryRecord[] = [];
  private ruleHandlers: Map<string, (alert: AlertEvent) => void> = new Map();
  private alertCountByRule: Map<string, number> = new Map();
  private readonly maxHistorySize = 1000;

  constructor(config: SmartAlertConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 处理告警
   */
  processAlert(alert: AlertEvent): AlertProcessResult {
    const result: AlertProcessResult = {
      alert,
      processed: true,
      suppressed: false,
      escalated: false,
    };

    // 检查是否应该抑制
    if (this.config.enableSuppression && this.isSuppressed(alert)) {
      result.processed = false;
      result.suppressed = true;
      this.updateSuppression(alert);
      this.recordHistory(alert, true, false);
      return result;
    }

    // 更新抑制状态
    if (this.config.enableSuppression) {
      this.updateSuppression(alert);
    }

    // 检查是否应该升级
    if (this.config.enableEscalation) {
      const escalation = this.checkAndEscalate(alert);
      if (escalation) {
        result.escalated = true;
        alert.severity = escalation.currentSeverity;
        this.emit('escalation', escalation);
      }
    }

    // 路由告警
    result.route = this.routeAlert(alert);

    // 记录历史
    this.recordHistory(alert, false, result.escalated);

    // 更新计数
    this.updateAlertCount(alert.ruleId);

    // 发出告警事件
    this.emit('alert', alert);

    return result;
  }

  /**
   * 检查告警是否应该被抑制
   */
  private isSuppressed(alert: AlertEvent): boolean {
    const key = `${alert.ruleId}:${alert.metricName}`;
    const suppression = this.suppressions.get(key);

    if (!suppression) {
      return false;
    }

    // 检查是否在抑制窗口内
    const timeSinceLastTriggered = Date.now() - suppression.lastTriggered;
    return timeSinceLastTriggered < this.config.suppressionWindowMs;
  }

  /**
   * 更新抑制状态
   */
  private updateSuppression(alert: AlertEvent): void {
    const key = `${alert.ruleId}:${alert.metricName}`;
    const existing = this.suppressions.get(key);

    if (existing) {
      existing.count++;
      existing.lastTriggered = alert.timestamp;
      existing.suppressedSince = Date.now();
    } else {
      this.suppressions.set(key, {
        ruleId: alert.ruleId,
        metricName: alert.metricName,
        count: 1,
        firstTriggered: alert.timestamp,
        lastTriggered: alert.timestamp,
        suppressedSince: 0,
      });
    }
  }

  /**
   * 检查并处理告警升级
   */
  private checkAndEscalate(alert: AlertEvent): AlertEscalation | null {
    const existing = this.escalations.get(alert.ruleId);
    const triggerCount = (this.alertCountByRule.get(alert.ruleId) || 0) + 1;

    if (triggerCount < this.config.escalationThreshold) {
      return null;
    }

    // 确定升级后的严重程度
    let newSeverity = alert.severity;
    if (alert.severity === AlertSeverity.INFO) {
      newSeverity = AlertSeverity.WARNING;
    } else if (alert.severity === AlertSeverity.WARNING) {
      newSeverity = AlertSeverity.ERROR;
    } else if (alert.severity === AlertSeverity.ERROR) {
      newSeverity = AlertSeverity.CRITICAL;
    }

    // 检查是否需要升级
    if (existing && existing.currentSeverity !== newSeverity) {
      existing.currentSeverity = newSeverity;
      existing.triggerCount = triggerCount;
      existing.lastTriggered = alert.timestamp;
      existing.escalatedAt = Date.now();
      return existing;
    }

    // 创建新的升级记录
    const escalation: AlertEscalation = {
      ruleId: alert.ruleId,
      originalSeverity: alert.severity,
      currentSeverity: newSeverity,
      triggerCount,
      firstTriggered: alert.timestamp,
      lastTriggered: alert.timestamp,
      escalatedAt: Date.now(),
    };

    this.escalations.set(alert.ruleId, escalation);
    return escalation;
  }

  /**
   * 路由告警
   */
  private routeAlert(alert: AlertEvent): string {
    // 检查是否有特定的规则处理器
    const handler = this.ruleHandlers.get(alert.ruleId);
    if (handler) {
      try {
        handler(alert);
      } catch (error) {
        console.error('Rule handler error:', error);
      }
    }

    // 根据严重程度确定路由
    switch (alert.severity) {
      case AlertSeverity.CRITICAL:
        return 'critical-channel';
      case AlertSeverity.ERROR:
        return 'error-channel';
      case AlertSeverity.WARNING:
        return 'warning-channel';
      default:
        return 'info-channel';
    }
  }

  /**
   * 注册规则处理器
   */
  registerRuleHandler(ruleId: string, handler: (alert: AlertEvent) => void): void {
    this.ruleHandlers.set(ruleId, handler);
  }

  /**
   * 记录告警历史
   */
  private recordHistory(alert: AlertEvent, suppressed: boolean, escalated: boolean): void {
    this.alertHistory.push({
      id: alert.id,
      ruleId: alert.ruleId,
      severity: alert.severity,
      suppressed,
      escalated,
      timestamp: alert.timestamp,
    });

    // 维护历史大小
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.shift();
    }
  }

  /**
   * 更新告警计数
   */
  private updateAlertCount(ruleId: string): void {
    const count = this.alertCountByRule.get(ruleId) || 0;
    this.alertCountByRule.set(ruleId, count + 1);
  }

  /**
   * 获取抑制统计
   */
  getSuppressionStats(): {
    totalAlerts: number;
    suppressedCount: number;
    suppressionRate: number;
    activeSuppressions: number;
  } {
    const suppressedCount = this.alertHistory.filter(h => h.suppressed).length;
    const totalAlerts = this.alertHistory.length;

    return {
      totalAlerts,
      suppressedCount,
      suppressionRate: totalAlerts > 0 ? (suppressedCount / totalAlerts) * 100 : 0,
      activeSuppressions: this.suppressions.size,
    };
  }

  /**
   * 获取升级统计
   */
  getEscalationStats(): {
    totalAlerts: number;
    escalatedCount: number;
    escalationRate: number;
    activeEscalations: number;
  } {
    const escalatedCount = this.alertHistory.filter(h => h.escalated).length;
    const totalAlerts = this.alertHistory.length;

    return {
      totalAlerts,
      escalatedCount,
      escalationRate: totalAlerts > 0 ? (escalatedCount / totalAlerts) * 100 : 0,
      activeEscalations: this.escalations.size,
    };
  }

  /**
   * 获取告警统计
   */
  getAlertStats(): AlertStats {
    const bySeverity: Record<AlertSeverity, number> = {
      [AlertSeverity.INFO]: 0,
      [AlertSeverity.WARNING]: 0,
      [AlertSeverity.ERROR]: 0,
      [AlertSeverity.CRITICAL]: 0,
    };

    const byRule: Record<string, number> = {};

    for (const record of this.alertHistory) {
      bySeverity[record.severity]++;
      byRule[record.ruleId] = (byRule[record.ruleId] || 0) + 1;
    }

    const processed = this.alertHistory.filter(h => !h.suppressed).length;
    const suppressed = this.alertHistory.filter(h => h.suppressed).length;
    const escalated = this.alertHistory.filter(h => h.escalated).length;

    return {
      total: this.alertHistory.length,
      processed,
      suppressed,
      escalated,
      bySeverity,
      byRule,
    };
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(limit?: number): AlertHistoryRecord[] {
    if (limit) {
      return this.alertHistory.slice(-limit);
    }
    return [...this.alertHistory];
  }

  /**
   * 获取当前活跃的抑制
   */
  getActiveSuppressions(): AlertSuppression[] {
    return Array.from(this.suppressions.values()).filter(s => s.suppressedSince > 0);
  }

  /**
   * 获取当前活跃的升级
   */
  getActiveEscalations(): AlertEscalation[] {
    return Array.from(this.escalations.values());
  }

  /**
   * 注册升级处理器
   */
  onEscalation(handler: (escalation: AlertEscalation) => void): void {
    this.on('escalation', handler);
  }

  /**
   * 注册告警处理器
   */
  onAlert(handler: (alert: AlertEvent) => void): void {
    this.on('alert', handler);
  }

  /**
   * 清除抑制
   */
  clearSuppression(ruleId?: string): void {
    if (ruleId) {
      for (const [key, suppression] of this.suppressions) {
        if (suppression.ruleId === ruleId) {
          this.suppressions.delete(key);
        }
      }
    } else {
      this.suppressions.clear();
    }
  }

  /**
   * 清除升级
   */
  clearEscalation(ruleId?: string): void {
    if (ruleId) {
      this.escalations.delete(ruleId);
      this.alertCountByRule.delete(ruleId);
    } else {
      this.escalations.clear();
      this.alertCountByRule.clear();
    }
  }

  /**
   * 重置所有状态
   */
  reset(): void {
    this.suppressions.clear();
    this.escalations.clear();
    this.alertHistory = [];
    this.alertCountByRule.clear();
  }
}

export default SmartAlertService;
