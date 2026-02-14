/**
 * ContextMemory 上下文感知记忆 - TDD 测试
 */

import { ContextMemory } from '../ContextMemory';

describe('ContextMemory', () => {
  let memory: ContextMemory;

  beforeEach(() => {
    memory = new ContextMemory();
  });

  describe('remember', () => {
    it('should store context', () => {
      memory.remember('project', 'tech_stack', { language: 'TypeScript', framework: 'Express' });
      
      const context = memory.recall('project', 'tech_stack');
      expect(context).toBeDefined();
    });
  });

  describe('recall', () => {
    it('should recall stored context', () => {
      memory.remember('project', 'architecture', 'microservices');
      
      const result = memory.recall('project', 'architecture');
      expect(result).toBe('microservices');
    });

    it('should return undefined for missing context', () => {
      const result = memory.recall('project', 'nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('forget', () => {
    it('should remove context', () => {
      memory.remember('project', 'test', 'value');
      memory.forget('project', 'test');
      
      const result = memory.recall('project', 'test');
      expect(result).toBeUndefined();
    });
  });
});
