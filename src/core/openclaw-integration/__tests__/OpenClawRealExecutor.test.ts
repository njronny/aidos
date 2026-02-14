/**
 * OpenClawIntegration Tests - TDD
 * 
 * 测试真实的 OpenClaw 集成
 */

import { OpenClawRealExecutor } from '../OpenClawRealExecutor';

describe('OpenClawRealExecutor', () => {
  let executor: OpenClawRealExecutor;

  beforeEach(() => {
    executor = new OpenClawRealExecutor();
  });

  describe('constructor', () => {
    it('should create executor', () => {
      expect(executor).toBeDefined();
    });

    it('should accept options', () => {
      const exec = new OpenClawRealExecutor({ timeout: 60000 });
      expect(exec).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should execute task in mock mode', async () => {
      const result = await executor.execute({
        id: 'test-1',
        prompt: '写一个 hello 函数',
        agent: 'developer',
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
    });

    it('should generate code for function prompt', async () => {
      const result = await executor.execute({
        id: 'test-2',
        prompt: '实现一个加法函数',
      });

      expect(result.output).toContain('function');
    });

    it('should generate test for test prompt', async () => {
      const result = await executor.execute({
        id: 'test-3',
        prompt: '编写单元测试',
      });

      expect(result.output).toContain('describe');
    });
  });

  describe('real execution', () => {
    it('should enable real execution', () => {
      executor.enableRealExecution();
      expect(executor.isRealExecutionEnabled()).toBe(true);
    });

    it('should disable real execution', () => {
      executor.disableRealExecution();
      expect(executor.isRealExecutionEnabled()).toBe(false);
    });
  });

  describe('prepare task', () => {
    it('should prepare task prompt', () => {
      const prompt = executor.prepareTask({
        id: 't1',
        prompt: '实现功能',
        agent: 'developer',
      });

      expect(prompt).toContain('[developer agent]');
      expect(prompt).toContain('实现功能');
    });
  });
});
