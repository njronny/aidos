// Visualizer Types
export interface VisualizationData {
  type: VisualizationType;
  title: string;
  data: unknown;
}

export type VisualizationType = 'flowchart' | 'timeline' | 'gantt' | 'graph' | 'dashboard';

export interface FlowchartNode {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked';
  metadata?: Record<string, unknown>;
}

export interface FlowchartEdge {
  from: string;
  to: string;
  label?: string;
}

export interface FlowchartData {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
}

export interface TimelineEvent {
  id: string;
  taskId: string;
  taskName: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  agent?: string;
}

export interface TimelineData {
  events: TimelineEvent[];
}

export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  status: string;
  dependencies: string[];
}

export interface GanttData {
  tasks: GanttTask[];
}

export interface DashboardMetric {
  label: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface DashboardData {
  metrics: DashboardMetric[];
  timestamp: Date;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface VisualizerConfig {
  outputFormat: 'mermaid' | 'json' | 'html';
  theme?: 'light' | 'dark';
  includeTimestamps: boolean;
}
