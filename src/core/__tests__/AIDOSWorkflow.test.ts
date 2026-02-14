/**
 * AIDOSWorkflow Tests - TDD
 */

import { AIDOSWorkflow, createAIDOSWorkflow } from '../AIDOSWorkflow';

describe('AIDOSWorkflow', () => {
  let workflow: AIDOSWorkflow;

  beforeEach(() => {
    workflow = new AIDOSWorkflow();
  });

  describe('constructor', () => {
    it('should create workflow', () => {
      expect(workflow).toBeDefined();
    });

    it('should accept options', () => {
      const wf = new AIDOSWorkflow({ maxRetries: 5 });
      expect(wf).toBeDefined();
    });
  });

  describe('run workflow', () => {
    it('should run simple workflow', async () => {
      const result = await workflow.run('实现用户登录功能');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('projectId');
      expect(result).toHaveProperty('taskResults');
    });

    it('should create project', async () => {
      const result = await workflow.run('开发一个计算器');

      expect(result.projectId).toBeDefined();
    });

    it('should execute tasks', async () => {
      const result = await workflow.run('实现加法函数');

      expect(result.taskResults.length).toBeGreaterThan(0);
    });
  });

  describe('real execution', () => {
    it('should enable real execution', () => {
      workflow.enableRealExecution();
      // Should not throw
    });

    it('should disable real execution', () => {
      workflow.disableRealExecution();
      // Should not throw
    });
  });

  describe('createAIDOSWorkflow', () => {
    it('should create workflow with helper', () => {
      const wf = createAIDOSWorkflow();
      expect(wf).toBeDefined();
    });
  });
});
