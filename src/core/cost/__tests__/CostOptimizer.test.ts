/**
 * CostOptimizer 成本优化引擎 - TDD 测试
 */

import { CostOptimizer, ResourceUsage } from '../CostOptimizer';

describe('CostOptimizer', () => {
  let optimizer: CostOptimizer;

  beforeEach(() => {
    optimizer = new CostOptimizer();
  });

  describe('analyze', () => {
    it('should analyze resource usage', async () => {
      const usage: ResourceUsage = {
        cpu: 10,
        memory: 20,
        storage: 30,
      };
      
      const analysis = await optimizer.analyze(usage);
      
      expect(analysis).toHaveProperty('cost');
      expect(analysis).toHaveProperty('recommendations');
    });
  });

  describe('getRecommendations', () => {
    it('should suggest scaling', async () => {
      const usage: ResourceUsage = { cpu: 5, memory: 5, storage: 5 };
      
      const recs = optimizer.getRecommendations(usage);
      
      expect(Array.isArray(recs)).toBe(true);
    });
  });
});
