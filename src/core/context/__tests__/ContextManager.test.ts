import { ContextManager } from '../ContextManager';

describe('ContextManager', () => {
  describe('constructor', () => {
    it('should create instance with valid params', () => {
      const cm = new ContextManager('test-project', '/tmp/test');
      expect(cm).toBeDefined();
    });

    it('should throw error with invalid projectName', () => {
      expect(() => {
        new ContextManager('', '/tmp/test');
      }).toThrow('Invalid projectName');
    });

    it('should throw error with invalid projectPath', () => {
      expect(() => {
        new ContextManager('test', '');
      }).toThrow('Invalid projectPath');
    });

    it('should throw error with null projectName', () => {
      expect(() => {
        new ContextManager(null as any, '/tmp/test');
      }).toThrow('Invalid projectName');
    });
  });

  describe('with config', () => {
    it('should accept custom config', () => {
      const cm = new ContextManager('test', '/tmp', {
        language: 'python',
        framework: 'django',
        testing: 'pytest',
      });
      expect(cm).toBeDefined();
    });

    it('should use defaults when config not provided', () => {
      const cm = new ContextManager('test', '/tmp');
      expect(cm).toBeDefined();
    });
  });
});
