import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  GitConfig,
  CommitResult,
  BranchResult,
  GitStatus,
  FileChange,
  DiffResult,
  TagResult,
} from './types';

const execAsync = promisify(exec);

/**
 * GitOps - Git Operations Manager
 * Handles automated Git operations for the development workflow
 */
export class GitOps {
  private config: GitConfig;

  constructor(config: Partial<GitConfig> = {}) {
    this.config = {
      repoPath: config.repoPath ?? process.cwd(),
      defaultBranch: config.defaultBranch ?? 'main',
      authorName: config.authorName ?? 'AIDOS',
      authorEmail: config.authorEmail ?? 'aidos@dev.local',
    };
  }

  /**
   * Execute git command
   */
  private async git(...args: string[]): Promise<string> {
    const gitCmd = `git ${args.join(' ')}`;
    try {
      const { stdout, stderr } = await execAsync(gitCmd, {
        cwd: this.config.repoPath,
      });
      return stdout || stderr;
    } catch (error) {
      const err = error as Error & { stderr?: string };
      throw new Error(`Git command failed: ${err.message}`);
    }
  }

  /**
   * Initialize repository
   */
  async init(): Promise<void> {
    await this.git('init');
    await this.git('config', 'user.name', this.config.authorName);
    await this.git('config', 'user.email', this.config.authorEmail);
  }

  /**
   * Get current status
   */
  async getStatus(): Promise<GitStatus> {
    const branch = (await this.git('rev-parse', '--abbrev-ref', 'HEAD')).trim();
    const isClean = (await this.git('status', '--porcelain')).trim().length === 0;

    let ahead = 0,
      behind = 0;
    try {
      const revList = (
        await this.git(
          'rev-list',
          '--left-right',
          '--count',
          `${this.config.defaultBranch}...${branch}`
        )
      ).trim();
      const [a, b] = revList.split('\t');
      ahead = parseInt(a) || 0;
      behind = parseInt(b) || 0;
    } catch {
      // Ignore if remote not configured
    }

    const changes: FileChange[] = [];
    const statusOutput = await this.git('status', '--porcelain');

    for (const line of statusOutput.split('\n').filter(Boolean)) {
      const status = line.substring(0, 2).trim();
      const filePath = line.substring(3).trim();

      let changeStatus: FileChange['status'];
      if (status.startsWith('A') || status === '??') {
        changeStatus = 'added';
      } else if (status.startsWith('M')) {
        changeStatus = 'modified';
      } else if (status.startsWith('D')) {
        changeStatus = 'deleted';
      } else if (status.startsWith('R')) {
        changeStatus = 'renamed';
      } else {
        continue;
      }

      changes.push({
        path: filePath,
        status: changeStatus,
      });
    }

    return { branch, isClean, ahead, behind, changes };
  }

  /**
   * Stage files
   */
  async add(files: string | string[]): Promise<void> {
    const fileList = Array.isArray(files) ? files.join(' ') : files;
    await this.git('add', fileList);
  }

  /**
   * Create a commit (with pre-added files)
   */
  async commit(message: string, skipAdd: boolean = false): Promise<CommitResult> {
    try {
      if (!skipAdd) {
        await this.git('add', '-A');
      }
      // Use double quotes to handle Chinese characters
      const result = await this.git('commit', '-m', `"${message}"`);
      const commitHash = (await this.git('rev-parse', 'HEAD')).trim();

      return {
        success: true,
        commitHash,
        message,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Create commit with task info (formatted)
   */
  async commitTask(taskId: string, taskName: string, description: string): Promise<CommitResult> {
    const message = `[${taskId}] ${taskName} - ${description}`;
    return this.commit(message);
  }

  /**
   * Create new branch
   */
  async createBranch(branchName: string, checkout = true): Promise<BranchResult> {
    try {
      await this.git('branch', branchName);
      if (checkout) {
        await this.git('checkout', branchName);
      }
      return { success: true, branchName };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * Checkout branch
   */
  async checkout(branchName: string): Promise<BranchResult> {
    try {
      await this.git('checkout', branchName);
      return { success: true, branchName };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    return (await this.git('rev-parse', '--abbrev-ref', 'HEAD')).trim();
  }

  /**
   * List all branches
   */
  async listBranches(): Promise<string[]> {
    const output = await this.git('branch', '--format=%(refname:short)');
    return output.split('\n').filter(Boolean);
  }

  /**
   * Delete branch
   */
  async deleteBranch(branchName: string, force = false): Promise<BranchResult> {
    try {
      const flag = force ? '-D' : '-d';
      await this.git('branch', flag, branchName);
      return { success: true, branchName };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * Get diff between commits or branches
   */
  async diff(compare: string = '--staged'): Promise<DiffResult[]> {
    try {
      const output = await this.git('diff', compare, '--stat');
      const results: DiffResult[] = [];

      for (const line of output.split('\n').filter(Boolean)) {
        const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)\s*\+*(\d+)*\s*$/);
        if (match) {
          results.push({
            file: match[1].trim(),
            additions: parseInt(match[2]) || 0,
            deletions: parseInt(match[3]) || 0,
            changes: line,
          });
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  /**
   * Get file diff
   */
  async diffFile(filePath: string): Promise<string> {
    try {
      return await this.git('diff', filePath);
    } catch {
      return '';
    }
  }

  /**
   * Create tag
   */
  async createTag(tagName: string, message?: string): Promise<TagResult> {
    try {
      if (message) {
        await this.git('tag', '-a', tagName, '-m', message);
      } else {
        await this.git('tag', tagName);
      }
      return { success: true, tagName };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * List tags
   */
  async listTags(): Promise<string[]> {
    const output = await this.git('tag', '-l');
    return output.split('\n').filter(Boolean);
  }

  /**
   * Get commit history
   */
  async log(maxCount = 10, format?: string): Promise<string[]> {
    const formatFlag = format ? `--format=${format}` : '';
    const output = await this.git('log', `--max-count=${maxCount}`, formatFlag);
    return output.split('\n').filter(Boolean);
  }

  /**
   * Revert to a specific commit
   */
  async revert(commitHash: string): Promise<CommitResult> {
    try {
      await this.git('revert', '--no-commit', commitHash);
      await this.git('commit', '-m', `Revert to ${commitHash}`);
      const newHash = (await this.git('rev-parse', 'HEAD')).trim();

      return {
        success: true,
        commitHash: newHash,
        message: `Reverted to ${commitHash}`,
      };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * Reset to a specific commit
   */
  async reset(commitHash: string, hard = false): Promise<CommitResult> {
    try {
      const flag = hard ? '--hard' : '--soft';
      await this.git('reset', flag, commitHash);
      return { success: true, commitHash };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch from remote
   */
  async fetch(remote = 'origin'): Promise<void> {
    await this.git('fetch', remote);
  }

  /**
   * Pull from remote
   */
  async pull(remote = 'origin', branch?: string): Promise<void> {
    const branchArg = branch ?? this.config.defaultBranch;
    await this.git('pull', remote, branchArg);
  }

  /**
   * Push to remote
   */
  async push(remote = 'origin', branch?: string): Promise<void> {
    const branchArg = branch ?? (await this.getCurrentBranch());
    await this.git('push', remote, branchArg);
  }

  /**
   * Get config
   */
  getConfig(): GitConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<GitConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default GitOps;
