/**
 * CodeQualityService - 代码质量服务
 * 自动代码审查、安全扫描、规范检查
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface QualityIssue {
  file: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  rule?: string;
}

export interface QualityReport {
  timestamp: Date;
  issues: QualityIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    score: number;
  };
  passed: boolean;
}

export class CodeQualityService {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * 运行 ESLint 检查
   */
  async runLint(): Promise<QualityIssue[]> {
    try {
      const { stdout } = await execAsync('npx eslint src --format json --max-warnings 50', {
        cwd: this.projectRoot,
        timeout: 60000,
      });

      const results = JSON.parse(stdout);
      const issues: QualityIssue[] = [];

      for (const result of results) {
        for (const msg of result.messages) {
          issues.push({
            file: path.relative(this.projectRoot, result.filePath),
            line: msg.line,
            column: msg.column,
            severity: msg.severity === 2 ? 'error' : msg.severity === 1 ? 'warning' : 'info',
            message: msg.message,
            rule: msg.ruleId,
          });
        }
      }

      return issues;
    } catch (error: any) {
      // ESLint 可能返回非0退出码即使有警告
      if (error.stdout) {
        try {
          const results = JSON.parse(error.stdout);
          const issues: QualityIssue[] = [];
          
          for (const result of results) {
            for (const msg of result.messages) {
              issues.push({
                file: path.relative(this.projectRoot, result.filePath),
                line: msg.line,
                column: msg.column,
                severity: msg.severity === 2 ? 'error' : 'warning',
                message: msg.message,
                rule: msg.ruleId,
              });
            }
          }
          
          return issues;
        } catch {
          // 解析失败返回空数组
        }
      }
      return [];
    }
  }

  /**
   * 运行 TypeScript 类型检查
   */
  async runTypeCheck(): Promise<QualityIssue[]> {
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', {
        cwd: this.projectRoot,
        timeout: 60000,
      });

      const issues: QualityIssue[] = [];
      const output = stdout + stderr;

      // 解析 TypeScript 错误输出
      const lines = output.split('\n');
      for (const line of lines) {
        const match = line.match(/^(.+?)\((\d+),(\d+)\):\s*error\s+TS\d+:\s*(.+)$/);
        if (match) {
          issues.push({
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            severity: 'error',
            message: match[4],
          });
        }
      }

      return issues;
    } catch (error: any) {
      // TypeScript 错误输出在 stderr
      const issues: QualityIssue[] = [];
      const output = error.stdout || error.stderr || '';
      
      const lines = output.split('\n');
      for (const line of lines) {
        const match = line.match(/^(.+?)\((\d+),(\d+)\):\s*error\s+TS\d+:\s*(.+)$/);
        if (match) {
          issues.push({
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            severity: 'error',
            message: match[4],
          });
        }
      }

      return issues;
    }
  }

  /**
   * 安全扫描 - 检查敏感信息泄露
   */
  async runSecurityScan(): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = [];
    const sensitivePatterns = [
      { pattern: /password\s*=\s*['"][^'"]+['"]/gi, message: 'Hardcoded password found', rule: 'no-hardcoded-credentials' },
      { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi, message: 'Hardcoded API key found', rule: 'no-hardcoded-api-key' },
      { pattern: /secret\s*=\s*['"][^'"]+['"]/gi, message: 'Hardcoded secret found', rule: 'no-hardcoded-secret' },
      { pattern: /token\s*=\s*['"][^'"]+['"]/gi, message: 'Hardcoded token found', rule: 'no-hardcoded-token' },
      { pattern: /private[_-]?key\s*=\s*['"]/gi, message: 'Private key exposure risk', rule: 'no-private-key' },
      { pattern: /aws[_-]?access/gi, message: 'AWS credentials exposure risk', rule: 'no-aws-credentials' },
    ];

    const ignoreDirs = ['node_modules', 'dist', 'build', '.git'];
    const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java'];

    const scanFile = async (filePath: string) => {
      const ext = path.extname(filePath);
      if (!codeExtensions.includes(ext)) return;

      try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        
        for (const { pattern, message, rule } of sensitivePatterns) {
          pattern.lastIndex = 0;
          if (pattern.test(content)) {
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              pattern.lastIndex = 0;
              if (pattern.test(lines[i])) {
                issues.push({
                  file: path.relative(this.projectRoot, filePath),
                  line: i + 1,
                  severity: 'error',
                  message,
                  rule,
                });
              }
            }
          }
        }
      } catch {
        // 忽略读取错误
      }
    };

    const scanDir = async (dir: string) => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!ignoreDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            await scanDir(fullPath);
          }
        } else {
          await scanFile(fullPath);
        }
      }
    };

    const srcDir = path.join(this.projectRoot, 'src');
    if (fs.existsSync(srcDir)) {
      await scanDir(srcDir);
    }

    return issues;
  }

  /**
   * 检查未使用的代码
   */
  async checkUnusedCode(): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = [];

    try {
      // 检查未使用的变量 (通过 tsc + noUnusedLocals)
      const { stdout } = await execAsync(
        'npx tsc --noUnusedLocals --noUnusedParameters 2>&1',
        { cwd: this.projectRoot, timeout: 60000 }
      );

      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/^(.+?)\((\d+),\d+\):\s*error\s+TS\d+:\s*(.+ is declared but)/);
        if (match) {
          issues.push({
            file: match[1],
            line: parseInt(match[2]),
            severity: 'warning',
            message: match[3],
            rule: 'no-unused-vars',
          });
        }
      }
    } catch {
      // 忽略错误
    }

    return issues;
  }

  /**
   * 完整代码质量检查
   */
  async runFullCheck(): Promise<QualityReport> {
    const allIssues: QualityIssue[] = [];

    console.log('[CodeQuality] Running lint check...');
    const lintIssues = await this.runLint();
    allIssues.push(...lintIssues);

    console.log('[CodeQuality] Running type check...');
    const typeIssues = await this.runTypeCheck();
    allIssues.push(...typeIssues);

    console.log('[CodeQuality] Running security scan...');
    const securityIssues = await this.runSecurityScan();
    allIssues.push(...securityIssues);

    console.log('[CodeQuality] Checking unused code...');
    const unusedIssues = await this.checkUnusedCode();
    allIssues.push(...unusedIssues);

    const summary = {
      errors: allIssues.filter(i => i.severity === 'error').length,
      warnings: allIssues.filter(i => i.severity === 'warning').length,
      info: allIssues.filter(i => i.severity === 'info').length,
      score: this.calculateScore(allIssues),
    };

    return {
      timestamp: new Date(),
      issues: allIssues,
      summary,
      passed: summary.errors === 0,
    };
  }

  /**
   * 计算质量分数 (0-100)
   */
  private calculateScore(issues: QualityIssue[]): number {
    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;

    // 基础分数 100，每 个错误扣 10 分，每个警告扣 2 分
    let score = 100 - (errors * 10) - (warnings * 2);
    return Math.max(0, Math.min(100, score));
  }
}

export const codeQualityService = new CodeQualityService();
