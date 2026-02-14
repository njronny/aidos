/**
 * FlowVisualizer Tests - TDD
 * 
 * 测试流程图可视化
 */

import { FlowVisualizer, FlowNode, FlowEdge } from '../FlowVisualizer';

describe('FlowVisualizer', () => {
  let visualizer: FlowVisualizer;

  beforeEach(() => {
    visualizer = new FlowVisualizer();
  });

  describe('generate flow', () => {
    it('should generate flow from tasks', async () => {
      const tasks = [
        { id: 't1', name: 'Task 1', status: 'completed', dependencies: [] },
        { id: 't2', name: 'Task 2', status: 'running', dependencies: ['t1'] },
      ];

      const flow = await visualizer.generateFlow(tasks);

      expect(flow.nodes).toBeDefined();
      expect(flow.edges).toBeDefined();
    });

    it('should create nodes for tasks', async () => {
      const tasks = [
        { id: 't1', name: 'Task 1', status: 'pending', dependencies: [] },
      ];

      const flow = await visualizer.generateFlow(tasks);

      expect(flow.nodes.length).toBe(1);
      expect(flow.nodes[0].id).toBe('t1');
    });

    it('should create edges for dependencies', async () => {
      const tasks = [
        { id: 't1', name: 'Task 1', status: 'completed', dependencies: [] },
        { id: 't2', name: 'Task 2', status: 'pending', dependencies: ['t1'] },
      ];

      const flow = await visualizer.generateFlow(tasks);

      expect(flow.edges.length).toBe(1);
    });
  });

  describe('node status', () => {
    it('should color nodes by status', async () => {
      const tasks = [
        { id: 't1', name: 'Completed', status: 'completed', dependencies: [] },
        { id: 't2', name: 'Running', status: 'running', dependencies: [] },
        { id: 't3', name: 'Failed', status: 'failed', dependencies: [] },
      ];

      const flow = await visualizer.generateFlow(tasks);

      const completedNode = flow.nodes.find(n => n.status === 'completed');
      const failedNode = flow.nodes.find(n => n.status === 'failed');

      expect(completedNode).toBeDefined();
      expect(failedNode).toBeDefined();
    });
  });

  describe('export', () => {
    it('should export to mermaid', async () => {
      const tasks = [
        { id: 't1', name: 'Task 1', status: 'completed', dependencies: [] },
      ];

      const mermaid = await visualizer.exportToMermaid(tasks);

      expect(mermaid).toContain('graph');
    });

    it('should export to json', async () => {
      const tasks = [
        { id: 't1', name: 'Task 1', status: 'completed', dependencies: [] },
      ];

      const json = await visualizer.exportToJson(tasks);

      expect(() => JSON.parse(json)).not.toThrow();
    });
  });
});

describe('FlowNode', () => {
  it('should create valid flow node', () => {
    const node: FlowNode = {
      id: 't1',
      label: 'Task 1',
      status: 'pending',
    };

    expect(node.id).toBe('t1');
  });
});

describe('FlowEdge', () => {
  it('should create valid flow edge', () => {
    const edge: FlowEdge = {
      from: 't1',
      to: 't2',
    };

    expect(edge.from).toBe('t1');
  });
});
