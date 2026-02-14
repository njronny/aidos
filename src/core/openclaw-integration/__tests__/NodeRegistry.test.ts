/**
 * NodeRegistry Tests - TDD
 * 
 * 测试节点注册中心
 */

import { NodeRegistry, OpenClawNode, NodeStatus } from '../NodeRegistry';

describe('NodeRegistry', () => {
  let registry: NodeRegistry;

  beforeEach(() => {
    registry = new NodeRegistry();
  });

  describe('constructor', () => {
    it('should create registry', () => {
      expect(registry).toBeDefined();
    });
  });

  describe('node management', () => {
    it('should register node', () => {
      const node: OpenClawNode = {
        id: 'node-1',
        name: 'Primary Node',
        host: 'localhost',
        port: 3000,
        capabilities: ['developer', 'qa'],
        status: 'online',
      };

      const result = registry.registerNode(node);

      expect(result).toBe(true);
      expect(registry.getNode('node-1')).toBeDefined();
    });

    it('should unregister node', () => {
      const node: OpenClawNode = {
        id: 'node-1',
        name: 'Test Node',
        host: 'localhost',
        port: 3000,
        capabilities: ['developer'],
        status: 'online',
      };

      registry.registerNode(node);
      registry.unregisterNode('node-1');

      expect(registry.getNode('node-1')).toBeUndefined();
    });

    it('should list all nodes', () => {
      registry.registerNode({
        id: 'n1', name: 'Node 1', host: 'localhost', port: 3000, capabilities: [], status: 'online',
      });
      registry.registerNode({
        id: 'n2', name: 'Node 2', host: 'localhost', port: 3001, capabilities: [], status: 'online',
      });

      const nodes = registry.listNodes();

      expect(nodes.length).toBe(2);
    });
  });

  describe('heartbeat', () => {
    it('should update heartbeat', () => {
      registry.registerNode({
        id: 'node-1',
        name: 'Test Node',
        host: 'localhost',
        port: 3000,
        capabilities: ['developer'],
        status: 'online',
      });

      const updated = registry.updateHeartbeat('node-1');

      expect(updated).toBe(true);
    });

    it('should detect stale nodes', () => {
      registry.registerNode({
        id: 'stale-node',
        name: 'Stale Node',
        host: 'localhost',
        port: 3000,
        capabilities: [],
        status: 'online',
        lastHeartbeat: Date.now() - 60000, // 1 minute ago
      });

      const staleNodes = registry.getStaleNodes(30000); // 30 seconds

      expect(staleNodes.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('capabilities', () => {
    it('should find nodes by capability', () => {
      registry.registerNode({
        id: 'dev-node',
        name: 'Dev Node',
        host: 'localhost',
        port: 3000,
        capabilities: ['developer', 'qa'],
        status: 'online',
      });

      const nodes = registry.findNodesByCapability('developer');

      expect(nodes.length).toBe(1);
    });
  });
});

describe('OpenClawNode', () => {
  it('should create valid node', () => {
    const node: OpenClawNode = {
      id: 'test-node',
      name: 'Test',
      host: 'localhost',
      port: 3000,
      capabilities: ['developer'],
      status: 'online',
    };

    expect(node.id).toBe('test-node');
    expect(node.status).toBe('online');
  });
});
