/**
 * OpenClawExecutor - 基于 OpenClaw 的任务执行器
 * 支持本地和分布式 OpenClaw 节点
 */

import { EventEmitter } from 'events';
import { exec as nodeExec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(nodeExec);

export interface ExecutorConfig {
  /** OpenClaw 节点列表 */
  nodes: OpenClawNode[];
  /** 默认超时时间 (ms) */
  defaultTimeout?: number;
  /** 负载均衡策略 */
  strategy?: 'random' | 'round_robin' | 'least_loaded';
}

export interface OpenClawNode {
  id: string;
  name: string;
  host: string;
  port: number;
  capabilities: string[];
  status: 'online' | 'offline';
  load: number;
  lastHeartbeat?: Date;
}

export interface ExecutionRequest {
  taskId: string;
  prompt: string;
  tool?: 'bash' | 'browser' | 'coding-agent';
  workdir?: string;
  context?: Record<string, any>;
  timeout?: number;
}

export interface ExecutionResult {
  success: boolean;
  taskId: string;
  output?: string;
  error?: string;
  duration: number;
  nodeId: string;
}

/**
 * OpenClawExecutor - 任务执行器
 */
export class OpenClawExecutor extends EventEmitter {
  private nodes: Map<string, OpenClawNode> = new Map();
  private config: Required<ExecutorConfig>;
  private roundRobinIndex: number = 0;

  constructor(config: ExecutorConfig) {
    super();
    this.config = {
      nodes: config.nodes || [],
      defaultTimeout: config.defaultTimeout || 300000,
      strategy: config.strategy || 'random',
    };
    
    for (const node of this.config.nodes) {
      this.nodes.set(node.id, { ...node, status: 'online', load: 0 });
    }
    
    console.log(`[OpenClawExecutor] Initialized with ${this.nodes.size} nodes`);
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    const node = this.selectNode(request.tool);
    
    if (!node) {
      return {
        success: false,
        taskId: request.taskId,
        error: 'No available OpenClaw node',
        duration: 0,
        nodeId: '',
      };
    }
    
    console.log(`[OpenClawExecutor] Executing task ${request.taskId} on node ${node.name}`);
    
    try {
      node.load = Math.min(node.load + 10, 100);
      const output = await this.executeLocal(request);
      node.load = Math.max(node.load - 10, 0);
      
      return {
        success: true,
        taskId: request.taskId,
        output,
        duration: Date.now() - startTime,
        nodeId: node.id,
      };
    } catch (error: any) {
      node.load = Math.max(node.load - 10, 0);
      
      return {
        success: false,
        taskId: request.taskId,
        error: error.message,
        duration: Date.now() - startTime,
        nodeId: node.id,
      };
    }
  }

  private selectNode(tool?: string): OpenClawNode | null {
    const availableNodes = Array.from(this.nodes.values())
      .filter(n => n.status === 'online');
    
    if (availableNodes.length === 0) return null;
    
    switch (this.config.strategy) {
      case 'round_robin':
        const node = availableNodes[this.roundRobinIndex % availableNodes.length];
        this.roundRobinIndex++;
        return node;
      case 'least_loaded':
        return availableNodes.sort((a, b) => a.load - b.load)[0];
      default:
        return availableNodes[Math.floor(Math.random() * availableNodes.length)];
    }
  }

  private async executeLocal(request: ExecutionRequest): Promise<string> {
    const timeout = request.timeout || this.config.defaultTimeout;
    const opts: any = {
      timeout,
      maxBuffer: 10 * 1024 * 1024,
    };
    if (request.workdir) opts.cwd = request.workdir;
    
    try {
      const { stdout, stderr } = await execAsync(request.prompt, opts);
      return (stdout || stderr || '').toString();
    } catch (error: any) {
      if (error.killed) {
        throw new Error(`Command timed out after ${timeout}ms`);
      }
      throw error;
    }
  }

  registerNode(node: OpenClawNode): void {
    this.nodes.set(node.id, { ...node, status: 'online', load: 0 });
    console.log(`[OpenClawExecutor] Registered node: ${node.name}`);
  }

  unregisterNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (node) {
      this.nodes.delete(nodeId);
      console.log(`[OpenClawExecutor] Unregistered node: ${node.name}`);
      return true;
    }
    return false;
  }

  getNodes(): OpenClawNode[] {
    return Array.from(this.nodes.values());
  }

  updateHeartbeat(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.lastHeartbeat = new Date();
      node.status = 'online';
    }
  }

  checkHealth(): void {
    const now = new Date();
    for (const [id, node] of this.nodes) {
      if (node.lastHeartbeat && now.getTime() - node.lastHeartbeat.getTime() > 60000) {
        node.status = 'offline';
        console.warn(`[OpenClawExecutor] Node ${node.name} is offline`);
      }
    }
  }
}

export default OpenClawExecutor;
