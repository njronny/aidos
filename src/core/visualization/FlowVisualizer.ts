/**
 * FlowVisualizer - 流程图可视化
 * 
 * 生成任务流程图
 */

export interface FlowNode {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  metadata?: Record<string, any>;
}

export interface FlowEdge {
  from: string;
  to: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface TaskInput {
  id: string;
  name: string;
  status: string;
  dependencies: string[];
  [key: string]: any;
}

export class FlowVisualizer {
  private statusColors: Record<string, string> = {
    pending: '#9e9e9e',
    running: '#2196f3',
    completed: '#4caf50',
    failed: '#f44336',
    cancelled: '#ff9800',
  };

  /**
   * 从任务生成流程图
   */
  async generateFlow(tasks: TaskInput[]): Promise<FlowGraph> {
    // 输入验证
    if (!Array.isArray(tasks)) {
      throw new Error('Invalid tasks: must be an array');
    }
    
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];

    // 创建节点
    for (const task of tasks) {
      // 验证任务对象
      if (!task || typeof task !== 'object') {
        console.warn('Skipping invalid task:', task);
        continue;
      }
      
      if (!task.id || typeof task.id !== 'string') {
        console.warn('Skipping task without valid id:', task);
        continue;
      }
      
      nodes.push({
        id: task.id,
        label: task.name,
        status: task.status as FlowNode['status'],
        metadata: {
          type: task.type,
          createdAt: task.createdAt,
        },
      });
    }

    // 创建边（依赖关系）
    for (const task of tasks) {
      for (const depId of task.dependencies) {
        edges.push({
          from: depId,
          to: task.id,
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * 导出为 Mermaid 格式
   */
  async exportToMermaid(tasks: TaskInput[]): Promise<string> {
    const graph = await this.generateFlow(tasks);
    
    let mermaid = '```mermaid\ngraph TD\n';
    
    // 添加节点
    for (const node of graph.nodes) {
      const color = this.statusColors[node.status] || '#9e9e9e';
      mermaid += `    ${node.id}["${node.label}"]\n`;
      mermaid += `    style ${node.id} fill:${color},stroke:#333,stroke-width:2px\n`;
    }

    // 添加边
    for (const edge of graph.edges) {
      mermaid += `    ${edge.from} --> ${edge.to}\n`;
    }

    mermaid += '```';
    return mermaid;
  }

  /**
   * 导出为 JSON
   */
  async exportToJson(tasks: TaskInput[]): Promise<string> {
    const graph = await this.generateFlow(tasks);
    return JSON.stringify(graph, null, 2);
  }

  /**
   * 导出为 DOT 格式 (Graphviz)
   */
  async exportToDot(tasks: TaskInput[]): Promise<string> {
    const graph = await this.generateFlow(tasks);
    
    let dot = 'digraph {\n';
    dot += '  rankdir=LR\n';
    dot += '  node [shape=box, style=rounded]\n';
    
    for (const node of graph.nodes) {
      const color = this.statusColors[node.status] || '#9e9e9e';
      dot += `  "${node.id}" [label="${node.label}", fillcolor="${color}"]\n`;
    }

    for (const edge of graph.edges) {
      dot += `  "${edge.from}" -> "${edge.to}"\n`;
    }

    dot += '}';
    return dot;
  }

  /**
   * 获取状态颜色
   */
  getStatusColor(status: string): string {
    return this.statusColors[status] || '#9e9e9e';
  }

  /**
   * 获取流程统计
   */
  async getFlowStats(tasks: TaskInput[]): Promise<{
    total: number;
    completed: number;
    running: number;
    pending: number;
    failed: number;
  }> {
    const stats = {
      total: tasks.length,
      completed: 0,
      running: 0,
      pending: 0,
      failed: 0,
    };

    for (const task of tasks) {
      if (task.status === 'completed') stats.completed++;
      else if (task.status === 'running') stats.running++;
      else if (task.status === 'pending') stats.pending++;
      else if (task.status === 'failed') stats.failed++;
    }

    return stats;
  }
}

export default FlowVisualizer;
