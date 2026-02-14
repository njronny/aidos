/**
 * OpenClawExecutor 单元测试
 */

import { OpenClawExecutor, OpenClawNode } from '../OpenClawExecutor';

describe('OpenClawExecutor', () => {
  let executor: OpenClawExecutor;
  
  const mockNodes: OpenClawNode[] = [
    { id: 'node-1', name: 'Node 1', host: 'localhost', port: 3000, capabilities: ['exec'], status: 'online', load: 0 },
    { id: 'node-2', name: 'Node 2', host: 'localhost', port: 3001, capabilities: ['exec'], status: 'online', load: 50 },
    { id: 'node-3', name: 'Node 3', host: '192.168.1.100', port: 3000, capabilities: ['exec'], status: 'offline', load: 0 },
  ];

  beforeEach(() => {
    executor = new OpenClawExecutor({
      nodes: mockNodes,
      strategy: 'random',
    });
  });

  describe('constructor', () => {
    it('should initialize with given nodes', () => {
      const nodes = executor.getNodes();
      expect(nodes).toHaveLength(3);
    });

    it('should set default strategy to random', () => {
      const exec = new OpenClawExecutor({ nodes: [] });
      expect(exec.getNodes()).toHaveLength(0);
    });
  });

  describe('getNodes', () => {
    it('should return all registered nodes', () => {
      const nodes = executor.getNodes();
      expect(nodes).toHaveLength(3);
    });

    it('should include node status', () => {
      const nodes = executor.getNodes();
      expect(nodes[0].status).toBe('online');
    });
  });

  describe('registerNode', () => {
    it('should register a new node', () => {
      executor.registerNode({
        id: 'node-4',
        name: 'Node 4',
        host: 'localhost',
        port: 3002,
        capabilities: ['exec'],
        status: 'online',
        load: 0,
      });
      
      expect(executor.getNodes()).toHaveLength(4);
    });
  });

  describe('unregisterNode', () => {
    it('should remove a node', () => {
      const result = executor.unregisterNode('node-1');
      expect(result).toBe(true);
      expect(executor.getNodes()).toHaveLength(2);
    });

    it('should return false for non-existent node', () => {
      const result = executor.unregisterNode('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('selectNode', () => {
    it('should select node with random strategy', () => {
      executor = new OpenClawExecutor({
        nodes: mockNodes,
        strategy: 'random',
      });
      
      // Should only select from online nodes
      for (let i = 0; i < 10; i++) {
        const node = (executor as any).selectNode();
        expect(node?.status).toBe('online');
      }
    });

    it('should select node with round_robin strategy', () => {
      executor = new OpenClawExecutor({
        nodes: mockNodes.filter(n => n.status === 'online'),
        strategy: 'round_robin',
      });
      
      const node1 = (executor as any).selectNode();
      const node2 = (executor as any).selectNode();
      
      // Round robin should cycle through nodes
      expect(node1?.id).not.toBe(node2?.id);
    });

    it('should select node with least_loaded strategy', () => {
      executor = new OpenClawExecutor({
        nodes: mockNodes,
        strategy: 'least_loaded',
      });
      
      const node = (executor as any).selectNode();
      // Should select node with lowest load (node-1 has load 0)
      expect(node?.load).toBeLessThanOrEqual(50);
    });

    it('should return null when no nodes available', () => {
      const emptyExecutor = new OpenClawExecutor({ nodes: [] });
      const node = (emptyExecutor as any).selectNode();
      expect(node).toBeNull();
    });

    it('should filter out offline nodes', () => {
      executor = new OpenClawExecutor({
        nodes: mockNodes,
        strategy: 'random',
      });
      
      const node = (executor as any).selectNode();
      expect(node?.status).not.toBe('offline');
    });
  });

  describe('updateHeartbeat', () => {
    it('should update node heartbeat', () => {
      executor.updateHeartbeat('node-1');
      const nodes = executor.getNodes();
      const node = nodes.find(n => n.id === 'node-1');
      expect(node?.lastHeartbeat).toBeDefined();
    });

    it('should set status to online on heartbeat', () => {
      // First set node offline
      const nodes = executor.getNodes();
      const node = nodes.find(n => n.id === 'node-1');
      if (node) node.status = 'offline';
      
      executor.updateHeartbeat('node-1');
      
      expect(node?.status).toBe('online');
    });
  });

  describe('checkHealth', () => {
    it('should mark stale nodes as offline', () => {
      // Set last heartbeat to 2 minutes ago
      const nodes = executor.getNodes();
      const node = nodes.find(n => n.id === 'node-1');
      if (node) {
        node.lastHeartbeat = new Date(Date.now() - 120000);
      }
      
      executor.checkHealth();
      
      expect(node?.status).toBe('offline');
    });
  });

  describe('execute', () => {
    it('should return error when no nodes available', async () => {
      const emptyExecutor = new OpenClawExecutor({ nodes: [] });
      const result = await emptyExecutor.execute({
        taskId: 'test-1',
        prompt: 'echo hello',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No available');
    });

    it('should include taskId in result', async () => {
      const result = await executor.execute({
        taskId: 'test-task-123',
        prompt: 'echo hello',
      });
      
      expect(result.taskId).toBe('test-task-123');
    });

    it('should include nodeId in result', async () => {
      const result = await executor.execute({
        taskId: 'test-task',
        prompt: 'echo hello',
      });
      
      expect(result.nodeId).toBeDefined();
    });
  });
});
