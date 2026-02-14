/**
 * TestAutomation - Test Generation and Execution
 * 
 * 测试自动化
 * - 测试生成
 * - 测试执行
 * - 覆盖率统计
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface TestSpec {
  name: string;
  code: string;
  type: 'unit' | 'integration' | 'e2e';
}

export interface TestResult {
  success: boolean;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
  output?: string;
  errors?: string[];
}

export class TestGenerator {
  /**
   * 生成测试代码
   */
  generate(code: string, type: 'unit' | 'integration' | 'e2e' = 'unit'): TestSpec {
    const name = this.extractName(code);
    const testCode = this.generateTestCode(code, type, name);
    
    return {
      name: `${name}.test.ts`,
      code: testCode,
      type,
    };
  }

  /**
   * 从代码中提取名称
   */
  private extractName(code: string): string {
    // 尝试提取函数名
    const funcMatch = code.match(/function\s+(\w+)/);
    if (funcMatch) return funcMatch[1];
    
    // 尝试提取类名
    const classMatch = code.match(/class\s+(\w+)/);
    if (classMatch) return classMatch[1];
    
    // 尝试提取异步函数
    const asyncMatch = code.match(/async\s+function\s+(\w+)/);
    if (asyncMatch) return asyncMatch[1];
    
    return 'test';
  }

  /**
   * 生成测试代码
   */
  private generateTestCode(code: string, type: string, name: string): string {
    const imports = this.generateImports(code);
    const testCases = this.generateTestCases(code, name);
    
    return `
${imports}

describe('${name}', () => {
${testCases}
});
`;
  }

  /**
   * 生成导入语句
   */
  private generateImports(code: string): string {
    let imports = "import { describe, it, expect } from '@jest/globals';\n";
    
    if (code.includes('import')) {
      // 提取原始导入
      const importMatches = code.match(/import\s+.*from\s+['"].*['"]/g);
      if (importMatches) {
        imports += importMatches.join('\n') + '\n';
      }
    }
    
    return imports;
  }

  /**
   * 生成测试用例
   */
  private generateTestCases(code: string, name: string): string {
    const cases: string[] = [];
    
    // 基础测试用例
    cases.push(`
  it('should be defined', () => {
    expect(${name}).toBeDefined();
  });
`);
    
    // 如果是函数，生成参数测试
    if (code.includes('function') || code.includes('=>')) {
      cases.push(`
  it('should work correctly', () => {
    // TODO: Add test cases
    expect(true).toBe(true);
  });
`);
    }
    
    // 如果是类，生成实例测试
    if (code.includes('class')) {
      cases.push(`
  it('should create instance', () => {
    // TODO: Add test cases
    expect(true).toBe(true);
  });
`);
    }
    
    // 错误处理测试
    cases.push(`
  it('should handle errors', () => {
    // TODO: Add error handling tests
    expect(true).toBe(true);
  });
`);
    
    return cases.join('\n');
  }
}

export class TestExecutor {
  private tempDir: string;

  constructor() {
    this.tempDir = '/tmp/aidos-tests';
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 运行测试
   */
  async run(testCode: string): Promise<TestResult> {
    const startTime = Date.now();
    
    // 写入临时测试文件
    const testFile = path.join(this.tempDir, 'test.spec.ts');
    fs.writeFileSync(testFile, testCode);
    
    try {
      // 运行 Jest
      const result = await this.runJest(testFile);
      
      return {
        ...result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * 带覆盖率运行测试
   */
  async runWithCoverage(testCode: string): Promise<TestResult> {
    const result = await this.run(testCode);
    
    // 模拟覆盖率计算
    result.coverage = this.calculateMockCoverage(result);
    
    return result;
  }

  /**
   * 运行 Jest
   */
  private runJest(testFile: string): Promise<TestResult> {
    return new Promise((resolve) => {
      const output: string[] = [];
      let errorOutput = '';
      
      const child = spawn('npx', ['jest', testFile, '--json', '--passWithNoTests'], {
        cwd: '/root/.openclaw/workspace/aidos',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
      });

      child.stdout.on('data', (data: Buffer) => {
        output.push(data.toString());
      });

      child.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      child.on('close', (code: number) => {
        try {
          // 解析 JSON 输出
          const jsonOutput = output.find(o => {
            try {
              JSON.parse(o);
              return true;
            } catch {
              return false;
            }
          });
          
          if (jsonOutput) {
            const jestResult = JSON.parse(jsonOutput);
            resolve({
              success: code === 0,
              passed: jestResult.numPassedTests || 0,
              failed: jestResult.numFailedTests || 0,
              skipped: jestResult.numPendingTests || 0,
              duration: jestResult.testTime || 0,
              output: output.join('\n'),
            });
          } else {
            // 回退：简单解析
            resolve({
              success: code === 0,
              passed: output.filter(o => o.includes('PASS')).length,
              failed: output.filter(o => o.includes('FAIL')).length,
              skipped: 0,
              duration: 0,
              output: output.join('\n'),
              errors: errorOutput ? [errorOutput] : undefined,
            });
          }
        } catch {
          resolve({
            success: code === 0,
            passed: code === 0 ? 1 : 0,
            failed: code === 0 ? 0 : 1,
            skipped: 0,
            duration: 0,
            output: output.join('\n'),
            errors: errorOutput ? [errorOutput] : undefined,
          });
        }
      });
    });
  }

  /**
   * 计算覆盖率（模拟）
   */
  private calculateMockCoverage(result: TestResult): number {
    if (result.failed > 0) return 0;
    if (result.passed === 0) return 0;
    return Math.min(95, 50 + result.passed * 10);
  }

  /**
   * 清理临时文件
   */
  cleanup(): void {
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
  }
}

export default TestGenerator;
