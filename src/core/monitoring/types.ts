/**
 * Monitoring Types - 监控类型定义
 */

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
}

/**
 * Core metrics that the system tracks
 */
export enum CoreMetricName {
  // Task metrics
  TASK_SUCCESS_RATE = 'task_success_rate',
  TASK_DURATION = 'task_duration',
  TASK_COUNT = 'task_count',
  TASK_FAILED_COUNT = 'task_failed_count',
  
  // Queue metrics
  QUEUE_DEPTH = 'queue_depth',
  QUEUE_WAIT_TIME = 'queue_wait_time',
  
  // API metrics
  API_REQUEST_COUNT = 'api_request_count',
  API_RESPONSE_TIME = 'api_response_time',
  API_ERROR_RATE = 'api_error_rate',
  API_ERROR_COUNT = 'api_error_count',
  
  // Agent metrics
  AGENT_ACTIVE_COUNT = 'agent_active_count',
  AGENT_IDLE_COUNT = 'agent_idle_count',
  AGENT_TASK_DURATION = 'agent_task_duration',
  
  // System metrics
  SYSTEM_CPU_USAGE = 'system_cpu_usage',
  SYSTEM_MEMORY_USAGE = 'system_memory_usage',
}

/**
 * Metric data point
 */
export interface MetricDataPoint {
  timestamp: number;
  value: number;
}

/**
 * Metric - 单个指标
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  history: MetricDataPoint[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Alert status
 */
export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

/**
 * Alert rule - 告警规则
 */
export interface AlertRule {
  id: string;
  name: string;
  metricName: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownMs: number;
  createdAt: Date;
}

/**
 * Alert condition
 */
export interface AlertCondition {
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'not_eq';
  threshold: number;
}

/**
 * Alert - 告警实例
 */
export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  metricName: string;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  status: AlertStatus;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  tags?: Record<string, string>;
}

/**
 * Metrics summary for dashboard
 */
export interface MetricsSummary {
  taskMetrics: {
    successRate: number;
    totalTasks: number;
    failedTasks: number;
    avgDuration: number;
  };
  queueMetrics: {
    depth: number;
    avgWaitTime: number;
  };
  apiMetrics: {
    requestCount: number;
    errorCount: number;
    avgResponseTime: number;
    errorRate: number;
  };
  agentMetrics: {
    active: number;
    idle: number;
    avgTaskDuration: number;
  };
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  metricsRetentionMs: number;
  defaultAlertCooldownMs: number;
  enableAutoRecovery: boolean;
}
