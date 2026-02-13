import {
  VisualizerConfig,
  VisualizationType,
  FlowchartData,
  TimelineData,
  GanttData,
  DashboardData,
  GraphData,
  FlowchartNode,
  FlowchartEdge,
  TimelineEvent,
  GanttTask,
  DashboardMetric,
} from './types';

/**
 * Visualizer - Visualization Engine
 * Generates visual representations of project progress and workflows
 */
export class Visualizer {
  private config: VisualizerConfig;

  constructor(config: Partial<VisualizerConfig> = {}) {
    this.config = {
      outputFormat: config.outputFormat ?? 'mermaid',
      theme: config.theme ?? 'light',
      includeTimestamps: config.includeTimestamps ?? true,
    };
  }

  /**
   * Generate flowchart for task DAG
   */
  generateFlowchart(data: FlowchartData): string {
    const { nodes, edges } = data;

    const lines: string[] = ['flowchart TD'];

    // Define node styles
    for (const node of nodes) {
      const style = this.getFlowchartNodeStyle(node.status);
      lines.push(`    ${node.id}["${node.label}"]${style}`);
    }

    // Define edges
    for (const edge of edges) {
      const label = edge.label ? `|${edge.label}|` : '';
      lines.push(`    ${edge.from} -->${label} ${edge.to}`);
    }

    return lines.join('\n');
  }

  /**
   * Get Mermaid style for node status
   */
  private getFlowchartNodeStyle(status: FlowchartNode['status']): string {
    switch (status) {
      case 'pending':
        return '';
      case 'running':
        return ':::running';
      case 'completed':
        return ':::completed';
      case 'failed':
        return ':::failed';
      case 'blocked':
        return ':::blocked';
      default:
        return '';
    }
  }

  /**
   * Generate timeline from events
   */
  generateTimeline(data: TimelineData): string {
    const { events } = data;

    const lines: string[] = ['timeline'];

    // Sort events by start time
    const sorted = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    for (const event of sorted) {
      const time = event.startTime.toLocaleTimeString();
      const status = event.status.toUpperCase();
      const name = `${event.taskName} (${status})`;
      lines.push(`    ${time} : ${name}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate Gantt chart
   */
  generateGantt(data: GanttData): string {
    const { tasks } = data;

    const lines: string[] = ['gantt', '    title 项目进度', '    dateFormat HH:mm'];

    // Sort tasks by start time
    const sorted = [...tasks].sort((a, b) => a.start.getTime() - b.start.getTime());

    for (const task of sorted) {
      const duration = this.getDurationMinutes(task.start, task.end);
      const status = task.status.toUpperCase();
      lines.push(`    ${task.name} : ${task.id}, ${task.start.toLocaleTimeString()}, ${duration}m`);
    }

    return lines.join('\n');
  }

  /**
   * Calculate duration in minutes
   */
  private getDurationMinutes(start: Date, end: Date): number {
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }

  /**
   * Generate graph visualization
   */
  generateGraph(data: GraphData): string {
    const { nodes, edges } = data;

    const lines: string[] = ['graph LR'];

    for (const node of nodes) {
      lines.push(`    ${node.id}(${node.label})`);
    }

    for (const edge of edges) {
      const label = edge.label ? ` -- ${edge.label} --> ` : ' --> ';
      lines.push(`    ${edge.source}${label}${edge.target}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate dashboard metrics as JSON
   */
  generateDashboard(data: DashboardData): string {
    return JSON.stringify(
      {
        metrics: data.metrics.map((m) => ({
          label: m.label,
          value: m.value,
          change: m.change,
          trend: m.trend,
        })),
        timestamp: data.timestamp.toISOString(),
      },
      null,
      2
    );
  }

  /**
   * Generate visualization based on type
   */
  generate(type: VisualizationType, data: unknown): string {
    switch (type) {
      case 'flowchart':
        return this.generateFlowchart(data as FlowchartData);
      case 'timeline':
        return this.generateTimeline(data as TimelineData);
      case 'gantt':
        return this.generateGantt(data as GanttData);
      case 'graph':
        return this.generateGraph(data as GraphData);
      case 'dashboard':
        return this.generateDashboard(data as DashboardData);
      default:
        return '';
    }
  }

  /**
   * Generate Mermaid-compatible HTML wrapper
   */
  wrapAsHtml(mermaidCode: string, title = 'Visualization'): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .mermaid { display: flex; justify-content: center; }
  </style>
</head>
<body>
  <h2>${title}</h2>
  <div class="mermaid">
${mermaidCode
  .split('\n')
  .map((l) => '    ' + l)
  .join('\n')}
  </div>
  <script>
    mermaid.initialize({ startOnLoad: true });
  </script>
</body>
</html>`;
  }

  /**
   * Convert task status to flowchart status
   */
  static mapTaskStatusToFlowchart(status: string): FlowchartNode['status'] {
    const statusMap: Record<string, FlowchartNode['status']> = {
      pending: 'pending',
      running: 'running',
      completed: 'completed',
      failed: 'failed',
      blocked: 'blocked',
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Create flowchart from tasks and dependencies
   */
  static createFlowchartFromTasks(
    tasks: Array<{ id: string; name: string; status: string; dependencies: string[] }>
  ): FlowchartData {
    const nodes: FlowchartNode[] = tasks.map((t) => ({
      id: t.id,
      label: t.name,
      status: Visualizer.mapTaskStatusToFlowchart(t.status),
    }));

    const edges: FlowchartEdge[] = [];
    for (const task of tasks) {
      for (const dep of task.dependencies) {
        edges.push({ from: dep, to: task.id });
      }
    }

    return { nodes, edges };
  }

  /**
   * Create timeline from events
   */
  static createTimelineFromEvents(
    events: Array<{
      taskId: string;
      taskName: string;
      startTime: Date;
      endTime?: Date;
      status: string;
      agent?: string;
    }>
  ): TimelineData {
    return {
      events: events.map((e) => ({
        id: e.taskId,
        ...e,
      })),
    };
  }

  /**
   * Create dashboard from metrics
   */
  static createDashboard(
    metrics: Array<{
      label: string;
      value: number | string;
      change?: number;
      trend?: 'up' | 'down' | 'stable';
    }>
  ): DashboardData {
    return {
      metrics: metrics as DashboardMetric[],
      timestamp: new Date(),
    };
  }

  /**
   * Get configuration
   */
  getConfig(): VisualizerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VisualizerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default Visualizer;
