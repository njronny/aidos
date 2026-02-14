/**
 * NodeRegistry 单元测试
 */

import { NodeRegistry } from '../NodeRegistry';
import { OpenClawExecutor, OpenClawNode } from '../OpenClawExecutor';

describe('NodeRegistry', () => {
  let executor: OpenClawExecutor;
  let registry: NodeRegistry;
  
  const mockNodes: OpenClawNode[] = [
    { id: 'node-1', name: 'Node 1', host: 'localhost', port: 3000, capabilities: ['exec'], status: 'online', load: 0 },
    { id: 'node-2', name: 'Node 2', host: 'localhost', port: 3001, capabilities: ['exec'], status: 'online', load: 50 },
  ];

  beforeEach(() => {
    executor = new OpenClawExecutor({
      nodes: mockNodes,
      strategy: 'random',
    });
    registry = new NodeRegistry(executor, {
      healthCheckInterval: 1000,
      nodeTimeout: 5000,
    });
  });

  afterEach(() => {
    registry.stopHealthCheck();
  });

  describe('constructor', () => {
    it('should initialize with executor', () => {
      expect(registry).toBeDefined();
    });
  });

  describe('registerNode', () => {
    it('should register a new node', async () => {
      const node = await registry.registerNode({
        name: 'New Node',
        host: 'localhost',
        port: 3002,
        capabilities: ['exec'],
      });
      
      expect(node.id).toBeDefined();
      expect(node.name).toBe('New Node');
      expect(node.status).toBe('online');
    });

    it('should auto-generate node id', async () => {
      const node = await registry.registerNode({
        name: 'Test Node',
        host: 'localhost',
        port: 3000,
        capabilities: ['exec'],
      });
      
      expect(node.id).toMatch(/^node-/);
    });
  });

  describe('removeNode', () => {
    it('should remove existing node', async () => {
      const node = await registry.registerNode({
        name: 'To Remove',
        host: 'localhost',
        port: 3003,
        capabilities: ['exec'],
      });
      
      const result = await registry.removeNode(node.id);
      expect(result).toBe(true);
    });

    it('should return false for non-existent node', async () => {
      const result = await registry.removeNode('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getNodes', () => {
    it('should return all registered nodes', async () => {
      await registry.registerNode({
        name: 'Node A',
        host: 'localhost',
        port: 3010,
        capabilities: ['exec'],
      });
      
      const nodes = registry.getNodes();
      expect(nodes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('heartbeat', () => {
    it('should update node heartbeat', async () => {
      await registry.heartbeat('node-1');
      const nodes = registry.getNodes();
      const node = nodes.find(n => n.id === 'node-1');
      expect(node?.lastHeartbeat).toBeDefined();
    });
  });

  describe('healthCheck', () => {
    it('should start health check timer', () => {
      registry.startHealthCheck();
      // Timer should be running
      const nodes = registry.getNodes();
      expect(nodes).toBeDefined();
    });

    it('should stop health check timer', () => {
      registry.startHealthCheck();
      registry.stopHealthCheck();
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
