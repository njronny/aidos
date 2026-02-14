/**
 * NodeRegistry - 节点注册中心
 * 
 * 管理 OpenClaw 节点
 */

export type NodeStatus = 'online' | 'offline' | 'busy' | 'error';

export interface OpenClawNode {
  id: string;
  name: string;
  host: string;
  port: number;
  capabilities: string[];
  status: NodeStatus;
  lastHeartbeat?: number;
  load?: number;
  metadata?: Record<string, any>;
}

export class NodeRegistry {
  private nodes: Map<string, OpenClawNode> = new Map();
  private heartbeatInterval = 30000; // 30 seconds

  constructor() {
    // 自动清理 stale 节点
    setInterval(() => this.cleanup(), this.heartbeatInterval);
  }

  /**
   * 注册节点
   */
  registerNode(node: OpenClawNode): boolean {
    if (this.nodes.has(node.id)) {
      return false;
    }

    this.nodes.set(node.id, {
      ...node,
      lastHeartbeat: Date.now(),
      status: 'online',
    });

    return true;
  }

  /**
   * 注销节点
   */
  unregisterNode(nodeId: string): boolean {
    return this.nodes.delete(nodeId);
  }

  /**
   * 获取节点
   */
  getNode(nodeId: string): OpenClawNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * 列出所有节点
   */
  listNodes(): OpenClawNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 更新心跳
   */
  updateHeartbeat(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return false;
    }

    node.lastHeartbeat = Date.now();
    node.status = 'online';
    return true;
  }

  /**
   * 获取 stale 节点
   */
  getStaleNodes(maxAge: number = 30000): OpenClawNode[] {
    const now = Date.now();
    return Array.from(this.nodes.values()).filter(
      node => (now - (node.lastHeartbeat || 0)) > maxAge
    );
  }

  /**
   * 根据能力查找节点
   */
  findNodesByCapability(capability: string): OpenClawNode[] {
    return Array.from(this.nodes.values()).filter(
      node => node.capabilities.includes(capability) && node.status === 'online'
    );
  }

  /**
   * 获取负载最低的节点
   */
  getLeastLoadedNode(capability?: string): OpenClawNode | undefined {
    let candidates = Array.from(this.nodes.values())
      .filter(n => n.status === 'online');

    if (capability) {
      candidates = candidates.filter(n => n.capabilities.includes(capability));
    }

    if (candidates.length === 0) {
      return undefined;
    }

    return candidates.reduce((min, node) => 
      (node.load || 0) < (min.load || 0) ? node : min
    );
  }

  /**
   * 更新节点状态
   */
  updateNodeStatus(nodeId: string, status: NodeStatus): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return false;
    }

    node.status = status;
    return true;
  }

  /**
   * 更新节点负载
   */
  updateNodeLoad(nodeId: string, load: number): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return false;
    }

    node.load = load;
    return true;
  }

  /**
   * 清理 stale 节点
   */
  private cleanup(): void {
    const staleNodes = this.getStaleNodes();
    
    for (const node of staleNodes) {
      node.status = 'offline';
    }
  }

  /**
   * 获取统计
   */
  getStats(): { total: number; online: number; offline: number; busy: number } {
    const nodes = this.listNodes();
    
    return {
      total: nodes.length,
      online: nodes.filter(n => n.status === 'online').length,
      offline: nodes.filter(n => n.status === 'offline').length,
      busy: nodes.filter(n => n.status === 'busy').length,
    };
  }
}

export default NodeRegistry;
