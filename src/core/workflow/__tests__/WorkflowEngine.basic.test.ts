import { WorkflowEngine } from '../WorkflowEngine';

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    engine = new WorkflowEngine();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(engine).toBeDefined();
    });
  });

  describe('start', () => {
    it('should have start method', () => {
      expect(typeof engine.start).toBe('function');
    });
  });

  describe('stop', () => {
    it('should have stop method', () => {
      expect(typeof engine.stop).toBe('function');
    });
  });

  describe('getStatus', () => {
    it('should have getStatus method', () => {
      expect(typeof engine.getStatus).toBe('function');
    });
  });
});
