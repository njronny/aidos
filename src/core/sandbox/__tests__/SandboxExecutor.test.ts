/**
 * SandboxExecutor Tests - TDD
 * 
 * 测试代码执行沙箱能力
 */

import { SandboxExecutor, ExecutionResult, SandboxConfig } from '../SandboxExecutor';

describe('SandboxExecutor', () => {
  let sandbox: SandboxExecutor;

  beforeEach(() => {
    sandbox = new SandboxExecutor();
  });

  describe('constructor', () => {
    it('should create sandbox executor', () => {
      expect(sandbox).toBeDefined();
    });

    it('should create with custom config', () => {
      const config: SandboxConfig = {
        timeout: 5000,
        memoryLimit: 256,
      };
      const sb = new SandboxExecutor(config);
      expect(sb).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should execute JavaScript code', async () => {
      const result = await sandbox.execute('javascript', '1 + 1');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
      expect(result).toHaveProperty('executionTime');
    });

    it('should handle simple expressions', async () => {
      const result = await sandbox.execute('javascript', '10 * 2');
      
      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const result = await sandbox.execute('javascript', 'undefined_function()');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('timeout', () => {
    it('should timeout on infinite loop', async () => {
      const config: SandboxConfig = { timeout: 100 };
      const sb = new SandboxExecutor(config);
      
      const result = await sb.execute('javascript', 'while(true) {}');
      
      expect(result.success).toBe(false);
    });

    it('should complete fast code', async () => {
      const config: SandboxConfig = { timeout: 2000 };
      const sb = new SandboxExecutor(config);
      
      const result = await sb.execute('javascript', 'let sum = 0; for(let i=0; i<100; i++) sum += i; sum');
      
      expect(result.success).toBe(true);
    });
  });

  describe('security', () => {
    it('should block filesystem access', async () => {
      const result = await sandbox.execute('javascript', 'require("fs").readFileSync("/etc/passwd")');
      
      expect(result.success).toBe(false);
    });

    it('should block child process', async () => {
      const result = await sandbox.execute('javascript', 'require("child_process").execSync("ls")');
      
      expect(result.success).toBe(false);
    });

    it('should block eval', async () => {
      const result = await sandbox.execute('javascript', 'eval("1+1")');
      
      expect(result.success).toBe(false);
    });
  });

  describe('multi-language', () => {
    it('should support Python', async () => {
      const result = await sandbox.execute('python', 'print(1 + 1)');
      
      expect(result.success).toBe(true);
    });

    it('should handle Python errors', async () => {
      const result = await sandbox.execute('python', 'print(undefined_variable)');
      
      expect(result.success).toBe(false);
    });
  });
});

describe('ExecutionResult', () => {
  it('should create valid result object', () => {
    const result: ExecutionResult = {
      success: true,
      output: 'Hello',
      error: undefined,
      executionTime: 100,
      memoryUsed: 50,
    };
    
    expect(result.success).toBe(true);
    expect(result.executionTime).toBe(100);
  });
});
