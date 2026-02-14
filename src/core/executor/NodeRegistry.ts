/**
 * NodeRegistry - OpenClaw 节点注册中心
 * 管理分布式 OpenClaw 节点
 */

import { OpenClawExecutor, OpenClawNode } from './OpenClawExecutor';

export interface NodeRegistryConfig {
  /** 健康检查间隔 (ms) */
  healthCheckInterval?: number;
  /** 节点超时时间 (ms) */
  nodeTimeout?: number;
}

/**
 * NodeRegistry - 节点注册与管理
 */
export class NodeRegistry {
  private executor: OpenClawExecutor;
  private healthCheckTimer?: NodeJS.Timeout;
  private config: Required<NodeRegistryConfig>;

  constructor(executor: OpenClawExecutor, config: NodeRegistryConfig = {}) {
    this.executor = executor;
    this.config = {
      healthCheckInterval: config.healthCheckInterval || 30000, // 30秒
      nodeTimeout: config.nodeTimeout || 60000, // 60秒
    };
  }

  /**
   * 启动健康检查
   */
  startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.executor.checkHealth();
    }, this.config.healthCheckInterval);
    
    console.log('[NodeRegistry] Health check started');
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * 注册新节点 (API 处理器)
   */
  async registerNode(data: {
    name: string;
    host: string;
    port: number;
    capabilities: string[];
  }): Promise<OpenClawNode> {
    const node: OpenClawNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      host: data.host,
      port: data.port,
      capabilities: data.capabilities,
      status: 'online',
      load: 0,
      lastHeartbeat: new Date(),
    };
    
    this.executor.registerNode(node);
    
    return node;
  }

  /**
   * 移除节点
   */
  async removeNode(nodeId: string): Promise<boolean> {
    return this.executor.unregisterNode(nodeId);
  }

  /**
   * 获取所有节点
   */
  getNodes(): OpenClawNode[] {
    return this.executor.getNodes();
  }

  /**
   * 节点心跳
   */
  async heartbeat(nodeId: string): Promise<void> {
    this.executor.updateHeartbeat(nodeId);
  }
}

export default NodeRegistry;
