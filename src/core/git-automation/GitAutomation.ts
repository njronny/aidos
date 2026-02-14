/**
 * GitAutomation - Git Operations Automation
 * 
 * Git 自动化操作
 * - 自动 commit
 * - 分支管理
 * - 提交规范
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface GitCommit {
  message: string;
  files: string[];
  author?: string;
}

export interface GitBranch {
  name: string;
  base: string;
}

export interface GitStatus {
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
}

export interface AutoFixConfig {
  maxAttempts: number;
  strategies: string[];
}

export class GitAutomation {
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  /**
   * 初始化仓库
   */
  async init(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.repoPath)) {
        fs.mkdirSync(this.repoPath, { recursive: true });
      }
      
      this.runGit(['init']);
      return true;
    } catch (error) {
      console.error('[GitAutomation] Init failed:', error);
      return false;
    }
  }

  /**
   * 获取状态
   */
  async getStatus(): Promise<GitStatus> {
    try {
      const output = this.runGit(['status', '--porcelain']);
      
      const status: GitStatus = {
        modified: [],
        added: [],
        deleted: [],
        untracked: [],
      };

      for (const line of output.split('\n')) {
        if (!line.trim()) continue;
        
        const code = line.substring(0, 2);
        const file = line.substring(3);

        if (code.includes('M')) status.modified.push(file);
        if (code.includes('A')) status.added.push(file);
        if (code.includes('D')) status.deleted.push(file);
        if (code.includes('?')) status.untracked.push(file);
      }

      return status;
    } catch (error) {
      return { modified: [], added: [], deleted: [], untracked: [] };
    }
  }

  /**
   * 添加文件
   */
  async add(files: string[] | string): Promise<boolean> {
    try {
      const fileList = Array.isArray(files) ? files : [files];
      this.runGit(['add', ...fileList]);
      return true;
    } catch (error) {
      console.error('[GitAutomation] Add failed:', error);
      return false;
    }
  }

  /**
   * 提交
   */
  async commit(commit: GitCommit): Promise<boolean> {
    try {
      // 验证提交信息
      if (!GitAutomation.isValidCommitMessage(commit.message)) {
        console.warn('[GitAutomation] Invalid commit message format');
      }

      const args = ['commit', '-m', commit.message];
      
      if (commit.author) {
        args.push('--author', commit.author);
      }

      this.runGit(args);
      return true;
    } catch (error) {
      console.error('[GitAutomation] Commit failed:', error);
      return false;
    }
  }

  /**
   * 自动提交更改
   */
  async autoCommit(files: string[], message: string): Promise<boolean> {
    const status = await this.getStatus();
    
    // 检查是否有更改
    const hasChanges = files.some(f => 
      status.modified.includes(f) || 
      status.added.includes(f) ||
      status.untracked.includes(f)
    );

    if (!hasChanges) {
      console.log('[GitAutomation] No changes to commit');
      return false;
    }

    // 添加文件
    await this.add(files);

    // 提交
    return this.commit({ message, files });
  }

  /**
   * 创建分支
   */
  async createBranch(branch: GitBranch): Promise<boolean> {
    try {
      this.runGit(['checkout', '-b', branch.name, branch.base]);
      return true;
    } catch (error) {
      console.error('[GitAutomation] Create branch failed:', error);
      return false;
    }
  }

  /**
   * 切换分支
   */
  async checkout(branchName: string): Promise<boolean> {
    try {
      this.runGit(['checkout', branchName]);
      return true;
    } catch (error) {
      console.error('[GitAutomation] Checkout failed:', error);
      return false;
    }
  }

  /**
   * 获取当前分支
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const output = this.runGit(['branch', '--show-current']);
      return output.trim();
    } catch {
      return '';
    }
  }

  /**
   * 列出分支
   */
  async listBranches(): Promise<string[]> {
    try {
      const output = this.runGit(['branch', '-a']);
      return output.split('\n').map(b => b.trim()).filter(b => b);
    } catch {
      return [];
    }
  }

  /**
   * 格式化提交信息
   */
  static formatCommitMessage(message: string, taskId?: string): string {
    const prefix = taskId ? `[${taskId}] ` : '';
    return `${prefix}${message}`;
  }

  /**
   * 生成分支名
   */
  static generateBranchName(feature: string, type: 'feature' | 'bugfix' | 'hotfix' = 'feature'): string {
    const slug = feature
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    return `${type}/${slug}`;
  }

  /**
   * 验证提交信息格式
   */
  static isValidCommitMessage(message: string): boolean {
    const conventionalTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'build'];
    const regex = new RegExp(`^(${conventionalTypes.join('|')}):\\s+.+`);
    return regex.test(message);
  }

  /**
   * 运行 git 命令
   */
  private runGit(args: string[]): string {
    return execSync(args.join(' '), {
      cwd: this.repoPath,
      encoding: 'utf-8',
    });
  }
}

/**
 * AutoFix - Automatic Error Fixing
 * 
 * 自动修复错误
 */
export class AutoFix {
  private config: AutoFixConfig;
  private attempts: Map<string, number> = new Map();

  constructor(config: AutoFixConfig) {
    this.config = {
      maxAttempts: config.maxAttempts || 3,
      strategies: config.strategies || ['analyze_and_fix', 'retry', 'rollback'],
    };
  }

  /**
   * 分析错误
   */
  analyzeError(error: string): { type: string; message: string; suggestion?: string } {
    // 常见的错误类型
    if (error.includes('SyntaxError')) {
      return {
        type: 'syntax',
        message: error,
        suggestion: '检查代码语法错误',
      };
    }
    
    if (error.includes('ReferenceError')) {
      return {
        type: 'reference',
        message: error,
        suggestion: '检查变量/函数是否定义',
      };
    }
    
    if (error.includes('TypeError')) {
      return {
        type: 'type',
        message: error,
        suggestion: '检查数据类型',
      };
    }
    
    if (error.includes('Test') || error.includes('expect')) {
      return {
        type: 'test',
        message: error,
        suggestion: '修复测试用例',
      };
    }

    return {
      type: 'unknown',
      message: error,
    };
  }

  /**
   * 生成修复策略
   */
  generateFixStrategy(error: string): string {
    const analysis = this.analyzeError(error);
    
    // 根据错误类型选择策略
    switch (analysis.type) {
      case 'syntax':
        return 'fix_syntax';
      case 'reference':
        return 'add_import';
      case 'type':
        return 'fix_type';
      case 'test':
        return 'fix_test';
      default:
        return 'analyze_and_fix';
    }
  }

  /**
   * 记录尝试次数
   */
  recordAttempt(errorId: string): number {
    const current = this.attempts.get(errorId) || 0;
    const next = current + 1;
    this.attempts.set(errorId, next);
    return next;
  }

  /**
   * 检查是否应该放弃
   */
  shouldGiveUp(errorId: string): boolean {
    const attempts = this.attempts.get(errorId) || 0;
    return attempts >= this.config.maxAttempts;
  }

  /**
   * 重置
   */
  reset(errorId?: string): void {
    if (errorId) {
      this.attempts.delete(errorId);
    } else {
      this.attempts.clear();
    }
  }
}

export default GitAutomation;
