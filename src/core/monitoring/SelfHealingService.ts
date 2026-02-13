/**
 * SelfHealingService - 自愈服务
 * 提供自动修复、预设修复策略、自动执行修复功能
 */

import { EventEmitter } from 'events';
import { AlertSeverity, AlertCondition } from './types';

/**
 * 自愈配置
 */
export interface SelfHealingConfig {
  /** 是否启用自动修复 */
  enableAutoHealing?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelayMs?: number;
  /** 动作执行超时（毫秒） */
  actionTimeoutMs?: number;
}

/**
 * 修复动作类型
 */
export type HealingActionType = 'command' | 'script' | 'restart' | 'scale' | 'notify';

/**
 * 修复动作
 */
export interface HealingAction {
  type: HealingActionType;
  command?: string;
  script?: string;
  service?: string;
  target?: string;
  replicas?: number;
  timeout?: number;
  retryable?: boolean;
  notification?: {
    channel: string;
    message: string;
  };
}

/**
 * 修复策略
 */
export interface HealingStrategy {
  id: string;
  name: string;
  description?: string;
  triggerMetric: string;
  triggerSeverity: AlertSeverity;
  triggerCondition: AlertCondition;
  actions: HealingAction[];
  enabled?: boolean;
  cooldownMs?: number;
}

/**
 * 修复结果
 */
export interface HealingResult {
  triggered: boolean;
  strategyId?: string;
  actions: HealingActionResult[];
  success: boolean;
  timestamp: number;
}

/**
 * 动作执行结果
 */
export interface HealingActionResult {
  action: HealingAction;
  success: boolean;
  output?: string;
  error?: string;
  retries: number;
  duration: number;
}

/**
 * 修复历史记录
 */
interface HealingHistoryRecord {
  strategyId: string;
  metric: string;
  value: number;
  severity: AlertSeverity;
  actions: HealingActionResult[];
  success: boolean;
  timestamp: number;
}

/**
 * 修复统计
 */
export interface HealingStats {
  totalHealings: number;
  successfulHealings: number;
  failedHealings: number;
  successRate: number;
  totalActions: number;
  successfulActions: number;
  byStrategy: Record<string, number>;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<SelfHealingConfig> = {
  enableAutoHealing: true,
  maxRetries: 3,
  retryDelayMs: 5000,
  actionTimeoutMs: 30000,
};

/**
 * 预置修复策略
 */
export const DEFAULT_HEALING_STRATEGIES: Omit<HealingStrategy, 'id'>[] = [
  {
    name: 'CPU使用率过高',
    description: '当CPU使用率超过80%时，清理不必要的进程',
    triggerMetric: 'cpu',
    triggerSeverity: AlertSeverity.WARNING,
    triggerCondition: { operator: 'gt', threshold: 80 },
    actions: [
      {
        type: 'command',
        command: 'sync && echo 3 > /proc/sys/vm/drop_caches',
        timeout: 10000,
      },
    ],
    cooldownMs: 300000, // 5分钟冷却
  },
  {
    name: '内存使用率过高',
    description: '当内存使用率超过85%时，清理缓存',
    triggerMetric: 'memory',
    triggerSeverity: AlertSeverity.WARNING,
    triggerCondition: { operator: 'gt', threshold: 85 },
    actions: [
      {
        type: 'command',
        command: 'sync && echo 3 > /proc/sys/vm/drop_caches',
        timeout: 10000,
      },
    ],
    cooldownMs: 300000,
  },
  {
    name: '磁盘空间不足',
    description: '当磁盘使用率超过90%时，清理临时文件',
    triggerMetric: 'disk',
    triggerSeverity: AlertSeverity.WARNING,
    triggerCondition: { operator: 'gt', threshold: 90 },
    actions: [
      {
        type: 'command',
        command: 'rm -rf /tmp/* 2>/dev/null || true',
        timeout: 30000,
      },
    ],
    cooldownMs: 600000, // 10分钟冷却
  },
  {
    name: '队列积压',
    description: '当队列深度超过阈值时，增加处理能力',
    triggerMetric: 'queue',
    triggerSeverity: AlertSeverity.ERROR,
    triggerCondition: { operator: 'gt', threshold: 1000 },
    actions: [
      {
        type: 'notify',
        notification: {
          channel: 'admin',
          message: 'Queue backup detected, manual intervention may be required',
        },
      },
    ],
    cooldownMs: 180000, // 3分钟冷却
  },
  {
    name: 'API错误率过高',
    description: '当API错误率超过10%时，重启API服务',
    triggerMetric: 'api_error_rate',
    triggerSeverity: AlertSeverity.ERROR,
    triggerCondition: { operator: 'gt', threshold: 10 },
    actions: [
      {
        type: 'command',
        command: 'systemctl restart api-service || true',
        timeout: 30000,
        retryable: true,
      },
    ],
    cooldownMs: 300000,
  },
];

/**
 * SelfHealingService - 自愈服务
 * 提供自动修复、预设修复策略、自动执行修复功能
 */
export class SelfHealingService extends EventEmitter {
  private config: Required<SelfHealingConfig>;
  private strategies: Map<string, HealingStrategy> = new Map();
  private cooldownTracker: Map<string, number> = new Map();
  private healingHistory: HealingHistoryRecord[] = [];
  private readonly maxHistorySize = 500;

  constructor(config: SelfHealingConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadDefaultStrategies();
  }

  /**
   * 加载默认策略
   */
  private loadDefaultStrategies(): void {
    for (const strategy of DEFAULT_HEALING_STRATEGIES) {
      const id = strategy.name.toLowerCase().replace(/\s+/g, '-');
      this.registerStrategy({ ...strategy, id });
    }
  }

  /**
   * 注册修复策略
   */
  registerStrategy(strategy: HealingStrategy): void {
    this.strategies.set(strategy.id, { ...strategy, enabled: strategy.enabled ?? true });
  }

  /**
   * 注销修复策略
   */
  unregisterStrategy(strategyId: string): boolean {
    return this.strategies.delete(strategyId);
  }

  /**
   * 获取所有策略
   */
  getStrategies(): HealingStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * 获取启用的策略
   */
  getEnabledStrategies(): HealingStrategy[] {
    return this.getStrategies().filter(s => s.enabled);
  }

  /**
   * 启用/禁用策略
   */
  setStrategyEnabled(strategyId: string, enabled: boolean): boolean {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      return false;
    }
    strategy.enabled = enabled;
    return true;
  }

  /**
   * 检查冷却时间
   */
  private isInCooldown(strategy: HealingStrategy): boolean {
    const lastTriggered = this.cooldownTracker.get(strategy.id);
    if (!lastTriggered) {
      return false;
    }

    const cooldown = strategy.cooldownMs ?? 60000;
    return Date.now() - lastTriggered < cooldown;
  }

  /**
   * 评估条件
   */
  evaluateCondition(condition: AlertCondition, value: number): boolean {
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
   * 检查并触发修复
   */
  async checkAndHeal(
    metric: string,
    value: number,
    severity: AlertSeverity
  ): Promise<HealingResult> {
    const result: HealingResult = {
      triggered: false,
      actions: [],
      success: true,
      timestamp: Date.now(),
    };

    if (!this.config.enableAutoHealing) {
      return result;
    }

    // 查找匹配的策略
    for (const strategy of this.getEnabledStrategies()) {
      // 检查指标和严重程度
      if (strategy.triggerMetric !== metric) {
        continue;
      }

      if (this.getSeverityLevel(severity) < this.getSeverityLevel(strategy.triggerSeverity)) {
        continue;
      }

      // 检查冷却时间
      if (this.isInCooldown(strategy)) {
        continue;
      }

      // 评估触发条件
      if (!this.evaluateCondition(strategy.triggerCondition, value)) {
        continue;
      }

      // 触发修复
      result.triggered = true;
      result.strategyId = strategy.id;

      // 设置冷却时间
      this.cooldownTracker.set(strategy.id, Date.now());

      // 发出修复开始事件
      this.emit('healingStarted', { strategy, metric, value, severity });

      // 执行修复动作
      const actionResults = await this.executeActions(strategy.actions);
      result.actions = actionResults;
      result.success = actionResults.every(a => a.success);

      // 记录历史
      this.recordHealing(strategy.id, metric, value, severity, actionResults, result.success);

      // 发出修复完成事件
      this.emit('healingCompleted', { strategy, result });

      break; // 只触发一个策略
    }

    return result;
  }

  /**
   * 获取严重程度级别
   */
  private getSeverityLevel(severity: AlertSeverity): number {
    switch (severity) {
      case AlertSeverity.INFO:
        return 0;
      case AlertSeverity.WARNING:
        return 1;
      case AlertSeverity.ERROR:
        return 2;
      case AlertSeverity.CRITICAL:
        return 3;
      default:
        return 0;
    }
  }

  /**
   * 执行修复动作
   */
  private async executeActions(actions: HealingAction[]): Promise<HealingActionResult[]> {
    const results: HealingActionResult[] = [];

    for (const action of actions) {
      const result = await this.executeAction(action);
      results.push(result);

      // 如果动作失败且不可重试，停止执行后续动作
      if (!result.success && !action.retryable) {
        break;
      }
    }

    return results;
  }

  /**
   * 执行单个修复动作
   */
  private async executeAction(action: HealingAction): Promise<HealingActionResult> {
    const startTime = Date.now();
    let retries = 0;
    let success = false;
    let output: string | undefined;
    let error: string | undefined;

    const maxRetries = action.retryable ? this.config.maxRetries : 1;

    while (retries < maxRetries && !success) {
      try {
        const execResult = await this.executeActionType(action);
        output = execResult.output;
        success = execResult.success;
        error = execResult.error;

        if (success) {
          break;
        }
      } catch (err: any) {
        error = err.message;
      }

      retries++;

      if (!success && retries < maxRetries) {
        await this.sleep(this.config.retryDelayMs);
      }
    }

    return {
      action,
      success,
      output,
      error,
      retries,
      duration: Date.now() - startTime,
    };
  }

  /**
   * 执行动作类型
   */
  private async executeActionType(action: HealingAction): Promise<{ success: boolean; output?: string; error?: string }> {
    switch (action.type) {
      case 'command':
        return this.executeCommand(action.command!, action.timeout ?? this.config.actionTimeoutMs);

      case 'script':
        return this.executeScript(action.script!, action.timeout ?? this.config.actionTimeoutMs);

      case 'restart':
        return this.restartService(action.service!);

      case 'scale':
        return this.scaleService(action.target!, action.replicas!);

      case 'notify':
        this.emit('notification', action.notification);
        return { success: true };

      default:
        return { success: false, error: 'Unknown action type' };
    }
  }

  /**
   * 执行命令
   */
  private executeCommand(command: string, timeout: number): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      const child = exec(command, { timeout }, (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
          resolve({ success: false, output: stdout, error: stderr || error.message });
        } else {
          resolve({ success: true, output: stdout });
        }
      });
    });
  }

  /**
   * 执行脚本
   */
  private executeScript(script: string, timeout: number): Promise<{ success: boolean; output?: string; error?: string }> {
    // 简化实现，实际应该写入临时文件并执行
    return this.executeCommand(`bash -c "${script.replace(/"/g, '\\"')}"`, timeout);
  }

  /**
   * 重启服务
   */
  private restartService(service: string): Promise<{ success: boolean; output?: string; error?: string }> {
    return this.executeCommand(`systemctl restart ${service}`, 30000);
  }

  /**
   * 扩缩容
   */
  private scaleService(target: string, replicas: number): Promise<{ success: boolean; output?: string; error?: string }> {
    // 简化实现
    return this.executeCommand(`kubectl scale deployment ${target} --replicas=${replicas}`, 30000);
  }

  /**
   * 睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 记录修复历史
   */
  private recordHealing(
    strategyId: string,
    metric: string,
    value: number,
    severity: AlertSeverity,
    actions: HealingActionResult[],
    success: boolean
  ): void {
    this.healingHistory.push({
      strategyId,
      metric,
      value,
      severity,
      actions,
      success,
      timestamp: Date.now(),
    });

    if (this.healingHistory.length > this.maxHistorySize) {
      this.healingHistory.shift();
    }
  }

  /**
   * 获取修复历史
   */
  getHealingHistory(limit?: number): HealingHistoryRecord[] {
    if (limit) {
      return this.healingHistory.slice(-limit);
    }
    return [...this.healingHistory];
  }

  /**
   * 获取修复统计
   */
  getHealingStats(): HealingStats {
    const totalHealings = this.healingHistory.length;
    const successfulHealings = this.healingHistory.filter(h => h.success).length;
    const failedHealings = totalHealings - successfulHealings;

    let totalActions = 0;
    let successfulActions = 0;
    const byStrategy: Record<string, number> = {};

    for (const record of this.healingHistory) {
      byStrategy[record.strategyId] = (byStrategy[record.strategyId] || 0) + 1;
      for (const action of record.actions) {
        totalActions++;
        if (action.success) {
          successfulActions++;
        }
      }
    }

    return {
      totalHealings,
      successfulHealings,
      failedHealings,
      successRate: totalHealings > 0 ? (successfulHealings / totalHealings) * 100 : 0,
      totalActions,
      successfulActions,
      byStrategy,
    };
  }

  /**
   * 注册修复开始处理器
   */
  onHealingStarted(handler: (data: { strategy: HealingStrategy; metric: string; value: number; severity: AlertSeverity }) => void): void {
    this.on('healingStarted', handler);
  }

  /**
   * 注册修复完成处理器
   */
  onHealingCompleted(handler: (data: { strategy: HealingStrategy; result: HealingResult }) => void): void {
    this.on('healingCompleted', handler);
  }

  /**
   * 注册通知处理器
   */
  onNotification(handler: (notification: { channel: string; message: string }) => void): void {
    this.on('notification', handler);
  }

  /**
   * 清除冷却时间
   */
  clearCooldown(strategyId?: string): void {
    if (strategyId) {
      this.cooldownTracker.delete(strategyId);
    } else {
      this.cooldownTracker.clear();
    }
  }

  /**
   * 重置所有状态
   */
  reset(): void {
    this.healingHistory = [];
    this.cooldownTracker.clear();
  }
}

export default SelfHealingService;
