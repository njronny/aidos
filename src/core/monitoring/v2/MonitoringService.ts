/**
 * MonitoringService - Comprehensive Monitoring System
 * 
 * 监控服务
 * - 指标收集
 * - 告警管理
 * - 健康检查
 * - 仪表盘
 */

export type AlertLevel = 'info' | 'warning' | 'critical' | 'emergency';

export interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface Alert {
  id: string;
  name: string;
  message: string;
  level: AlertLevel;
  source: string;
  createdAt: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}

export interface HealthCheckResult {
  healthy: boolean;
  message?: string;
  details?: Record<string, any>;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'stat' | 'table' | 'log';
  title: string;
  config: Record<string, any>;
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  createdAt: number;
}

export class MonitoringService {
  private metrics: Metric[] = [];
  private alerts: Alert[] = [];
  private healthChecks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();

  constructor() {
    // Initialize default dashboard
    this.createDashboard({
      id: 'default',
      name: 'System Overview',
      widgets: [],
    });
  }

  /**
   * 记录指标
   */
  recordMetric(metric: Metric): void {
    this.metrics.push({
      ...metric,
      timestamp: metric.timestamp || Date.now(),
    });

    // Keep only last 10000 metrics
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000);
    }
  }

  /**
   * 获取指标
   */
  getMetrics(name: string): Metric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * 获取指标统计
   */
  getMetricStats(name: string): { count: number; avg: number; min: number; max: number } {
    const values = this.getMetrics(name).map(m => m.value);
    if (values.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0 };
    }
    return {
      count: values.length,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  /**
   * 获取平均值
   */
  getAverage(name: string): number {
    const stats = this.getMetricStats(name);
    return stats.avg;
  }

  /**
   * 创建告警
   */
  createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'acknowledged'>): Alert {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      acknowledged: false,
    };
    this.alerts.push(newAlert);
    return newAlert;
  }

  /**
   * 获取告警
   */
  getAlerts(): Alert[] {
    return [...this.alerts].sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 按级别获取告警
   */
  getAlertsByLevel(level: AlertLevel): Alert[] {
    return this.alerts.filter(a => a.level === level);
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string, userId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = Date.now();
    }
  }

  /**
   * 清除告警
   */
  clearAlert(alertId: string): void {
    this.alerts = this.alerts.filter(a => a.id !== alertId);
  }

  /**
   * 注册健康检查
   */
  registerHealthCheck(name: string, checkFn: () => Promise<HealthCheckResult> | HealthCheckResult): void {
    this.healthChecks.set(name, async () => {
      const result = checkFn();
      return result instanceof Promise ? await result : result;
    });
  }

  /**
   * 获取健康状态
   */
  getHealthStatus(): Record<string, { status: string; message?: string }> {
    const status: Record<string, { status: string; message?: string }> = {};
    for (const [name] of this.healthChecks) {
      status[name] = { status: 'unknown' };
    }
    return status;
  }

  /**
   * 执行健康检查
   */
  async checkHealth(name: string): Promise<HealthCheckResult | null> {
    const checkFn = this.healthChecks.get(name);
    if (!checkFn) return null;
    return checkFn();
  }

  /**
   * 执行所有健康检查
   */
  async checkAllHealth(): Promise<Record<string, HealthCheckResult>> {
    const results: Record<string, HealthCheckResult> = {};
    for (const [name, checkFn] of this.healthChecks) {
      try {
        results[name] = await checkFn();
      } catch (e) {
        results[name] = { healthy: false, message: String(e) };
      }
    }
    return results;
  }

  /**
   * 创建仪表盘
   */
  createDashboard(dashboard: Omit<Dashboard, 'createdAt'>): void {
    this.dashboards.set(dashboard.id, {
      ...dashboard,
      createdAt: Date.now(),
    });
  }

  /**
   * 获取仪表盘
   */
  getDashboard(id: string): Dashboard | undefined {
    return this.dashboards.get(id);
  }

  /**
   * 获取所有仪表盘
   */
  getDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * 添加小部件
   */
  addWidget(dashboardId: string, widget: DashboardWidget): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (dashboard) {
      dashboard.widgets.push(widget);
    }
  }

  /**
   * 获取系统摘要
   */
  getSummary(): {
    totalMetrics: number;
    activeAlerts: number;
    criticalAlerts: number;
    dashboards: number;
    healthChecks: number;
  } {
    return {
      totalMetrics: this.metrics.length,
      activeAlerts: this.alerts.filter(a => !a.acknowledged).length,
      criticalAlerts: this.alerts.filter(a => a.level === 'critical' && !a.acknowledged).length,
      dashboards: this.dashboards.size,
      healthChecks: this.healthChecks.size,
    };
  }
}

export default MonitoringService;
