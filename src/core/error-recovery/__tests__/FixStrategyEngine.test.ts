/**
 * FixStrategyEngine Tests - TDD
 * 
 * 测试修复策略引擎
 */

import { FixStrategyEngine, FixStrategy, FixAction } from '../FixStrategyEngine';
import { ErrorType } from '../ErrorClassifier';

describe('FixStrategyEngine', () => {
  let engine: FixStrategyEngine;

  beforeEach(() => {
    engine = new FixStrategyEngine();
  });

  describe('generate strategy', () => {
    it('should generate fix for syntax error', () => {
      const strategy = engine.generateStrategy(ErrorType.SYNTAX, 'const x = ');
      
      expect(strategy).toBeDefined();
      expect(strategy.actions.length).toBeGreaterThan(0);
    });

    it('should generate fix for type error', () => {
      const strategy = engine.generateStrategy(ErrorType.TYPE, 'undefined.property');
      
      expect(strategy).toBeDefined();
      expect(strategy.actions.length).toBeGreaterThan(0);
    });

    it('should generate fix for reference error', () => {
      const strategy = engine.generateStrategy(ErrorType.REFERENCE, 'xxx is not defined');
      
      expect(strategy).toBeDefined();
      expect(strategy.actions.some(a => a.type === 'fix')).toBe(true);
    });

    it('should generate fix for test failure', () => {
      const strategy = engine.generateStrategy(ErrorType.TEST, 'expect(received).toBe(expected)');
      
      expect(strategy).toBeDefined();
      expect(strategy.actions.some(a => a.type === 'fix')).toBe(true);
    });

    it('should handle unknown error', () => {
      const strategy = engine.generateStrategy(ErrorType.UNKNOWN, 'random error');
      
      expect(strategy).toBeDefined();
    });
  });

  describe('action types', () => {
    it('should include analyze action', () => {
      const strategy = engine.generateStrategy(ErrorType.SYNTAX, 'error');
      
      expect(strategy.actions.some(a => a.type === 'analyze')).toBe(true);
    });

    it('should include retry for network error', () => {
      const strategy = engine.generateStrategy(ErrorType.NETWORK, 'ECONNREFUSED');
      
      expect(strategy.actions.some(a => a.type === 'retry')).toBe(true);
    });
  });

  describe('confidence', () => {
    it('should assign high confidence for syntax error', () => {
      const strategy = engine.generateStrategy(ErrorType.SYNTAX, 'error');
      
      expect(strategy.confidence).toBeGreaterThan(0.7);
    });

    it('should assign low confidence for unknown error', () => {
      const strategy = engine.generateStrategy(ErrorType.UNKNOWN, 'error');
      
      expect(strategy.confidence).toBeLessThan(0.5);
    });
  });

  describe('apply fix', () => {
    it('should apply fix to code', () => {
      const code = 'const x = ';
      const action: FixAction = {
        type: 'fix',
        description: 'Add semicolon',
        patch: 'const x = 1;',
      };

      const result = engine.applyFix(code, action);

      expect(result).toContain('1');
    });
  });
});

describe('FixStrategy', () => {
  it('should create valid strategy', () => {
    const strategy: FixStrategy = {
      errorType: ErrorType.SYNTAX,
      confidence: 0.9,
      actions: [
        { type: 'analyze', description: 'Analyze error' },
      ],
    };

    expect(strategy.confidence).toBe(0.9);
  });
});
