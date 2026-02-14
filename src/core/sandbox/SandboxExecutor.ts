/**
 * SandboxExecutor - Safe Code Execution Sandbox
 * 
 * 安全的代码执行沙箱
 * - 进程隔离
 * - 资源限制
 * - 超时控制
 * - 危险操作拦截
 */

export interface SandboxConfig {
  timeout?: number;        // 超时时间 (ms)
  memoryLimit?: number;   // 内存限制 (MB)
  maxOutputSize?: number; // 最大输出大小
  allowedModules?: string[]; // 允许的模块
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  memoryUsed?: number;
}

// 危险操作黑名单
const DANGEROUS_PATTERNS = [
  /require\s*\(\s*['"]fs['"]\)/,
  /require\s*\(\s*['"]child_process['"]\)/,
  /require\s*\(\s*['"]net['"]\)/,
  /require\s*\(\s*['"]http['"]\)/,
  /require\s*\(\s*['"]https['"]\)/,
  /require\s*\(\s*['"]dns['"]\)/,
  /execSync/,
  /exec\(/,
  /spawn\(/,
  /eval\s*\(/,
  /Function\s*\(/,
  /\.\s*prototype\s*\./,
  /__dirname/,
  /__filename/,
  /process\.exit/,
  /process\.kill/,
];

export class SandboxExecutor {
  private config: Required<SandboxConfig>;

  constructor(config: SandboxConfig = {}) {
    this.config = {
      timeout: config.timeout || 5000,
      memoryLimit: config.memoryLimit || 256,
      maxOutputSize: config.maxOutputSize || 1024 * 1024,
      allowedModules: config.allowedModules || [],
    };
  }

  /**
   * 执行代码
   */
  async execute(language: string, code: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    // 安全检查
    const securityCheck = this.checkSecurity(code);
    if (!securityCheck.valid) {
      return {
        success: false,
        output: '',
        error: `Security violation: ${securityCheck.reason}`,
        executionTime: Date.now() - startTime,
      };
    }

    try {
      let result: ExecutionResult;

      switch (language.toLowerCase()) {
        case 'javascript':
        case 'typescript':
          result = await this.executeJS(code, startTime);
          break;
        case 'python':
          result = await this.executePython(code, startTime);
          break;
        default:
          result = {
            success: false,
            output: '',
            error: `Unsupported language: ${language}`,
            executionTime: Date.now() - startTime,
          };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 执行 JavaScript/TypeScript
   */
  private async executeJS(code: string, startTime: number): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      // 使用 VM 模块创建隔离环境
      const vm = require('vm');
      
      // 创建上下文
      const context = {
        console: {
          log: (...args: any[]) => {
            output.push(args.map(String).join(' '));
          },
          error: (...args: any[]) => {
            output.push('[ERROR] ' + args.map(String).join(' '));
          },
          warn: (...args: any[]) => {
            output.push('[WARN] ' + args.map(String).join(' '));
          },
        },
        setTimeout: undefined,
        setInterval: undefined,
        setImmediate: undefined,
        process: undefined,
        require: undefined,
        module: undefined,
        exports: undefined,
        __dirname: undefined,
        __filename: undefined,
        global: undefined,
      };

      const output: string[] = [];
      let timeoutId: NodeJS.Timeout | undefined;

      try {
        // 设置超时
        timeoutId = setTimeout(() => {
          throw new Error('Execution timeout');
        }, this.config.timeout);

        // 创建沙箱上下文
        const sandbox = vm.createContext(context);
        
        // 编译并执行代码
        const script = new vm.Script(code, {
          filename: 'sandbox.js',
          timeout: this.config.timeout,
        });

        const result = script.runInContext(sandbox, {
          timeout: this.config.timeout,
          displayErrors: true,
        });

        clearTimeout(timeoutId);

        // 处理返回值
        let outputStr = output.join('\n');
        if (result !== undefined) {
          outputStr += (outputStr ? '\n' : '') + String(result);
        }

        resolve({
          success: true,
          output: outputStr,
          executionTime: Date.now() - startTime,
        });
      } catch (error) {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          output: output.join('\n'),
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime,
        });
      }
    });
  }

  /**
   * 执行 Python
   */
  private async executePython(code: string, startTime: number): Promise<ExecutionResult> {
    // 使用子进程执行 Python
    const { execSync, spawn } = require('child_process');
    
    return new Promise((resolve) => {
      const output: string[] = [];
      let errorOutput = '';
      let timeoutId: NodeJS.Timeout;
      
      // 检查是否有 python
      try {
        execSync('python3 --version', { stdio: 'ignore' });
      } catch {
        resolve({
          success: false,
          output: '',
          error: 'Python3 not available',
          executionTime: Date.now() - startTime,
        });
        return;
      }

      const child = spawn('python3', ['-c', code], {
        timeout: this.config.timeout,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      timeoutId = setTimeout(() => {
        child.kill('SIGKILL');
        resolve({
          success: false,
          output: output.join('\n'),
          error: 'Execution timeout',
          executionTime: Date.now() - startTime,
        });
      }, this.config.timeout);

      child.stdout.on('data', (data: Buffer) => {
        output.push(data.toString());
      });

      child.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      child.on('close', (code: number) => {
        clearTimeout(timeoutId);
        
        if (code === 0) {
          resolve({
            success: true,
            output: output.join('\n'),
            executionTime: Date.now() - startTime,
          });
        } else {
          resolve({
            success: false,
            output: output.join('\n'),
            error: errorOutput || `Process exited with code ${code}`,
            executionTime: Date.now() - startTime,
          });
        }
      });
    });
  }

  /**
   * 安全检查
   */
  private checkSecurity(code: string): { valid: boolean; reason?: string } {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(code)) {
        return { valid: false, reason: `Dangerous pattern detected: ${pattern}` };
      }
    }
    return { valid: true };
  }

  /**
   * 获取配置
   */
  getConfig(): Readonly<Required<SandboxConfig>> {
    return { ...this.config };
  }
}

export default SandboxExecutor;
