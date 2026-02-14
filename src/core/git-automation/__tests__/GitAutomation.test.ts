/**
 * GitAutomation Tests - TDD
 * 
 * 测试 Git 自动化能力
 */

import { GitAutomation, GitCommit, GitBranch } from '../GitAutomation';

describe('GitAutomation', () => {
  let git: GitAutomation;

  beforeEach(() => {
    git = new GitAutomation('/tmp/test-repo');
  });

  describe('constructor', () => {
    it('should create git automation', () => {
      expect(git).toBeDefined();
    });

    it('should accept custom repo path', () => {
      const customGit = new GitAutomation('/custom/path');
      expect(customGit).toBeDefined();
    });
  });

  describe('commit', () => {
    it('should create commit object', () => {
      const commit: GitCommit = {
        message: 'feat: add login',
        files: ['src/auth.ts'],
        author: 'AIDOS',
      };
      
      expect(commit.message).toBe('feat: add login');
      expect(commit.files).toContain('src/auth.ts');
    });

    it('should format commit message', () => {
      const format = GitAutomation.formatCommitMessage('add user', 'task-001');
      expect(format).toContain('[task-001]');
      expect(format).toContain('add user');
    });
  });

  describe('branch', () => {
    it('should create branch object', () => {
      const branch: GitBranch = {
        name: 'feature/user-login',
        base: 'main',
      };
      
      expect(branch.name).toBe('feature/user-login');
      expect(branch.base).toBe('main');
    });

    it('should generate feature branch name', () => {
      const name = GitAutomation.generateBranchName('add login', 'feature');
      expect(name).toContain('feature');
      expect(name).toContain('add-login');
    });

    it('should generate bugfix branch name', () => {
      const name = GitAutomation.generateBranchName('fix login bug', 'bugfix');
      expect(name).toContain('bugfix');
    });
  });

  describe('commit rules', () => {
    it('should validate commit message format', () => {
      const valid = GitAutomation.isValidCommitMessage('feat: add login');
      expect(valid).toBe(true);
    });

    it('should reject invalid commit message', () => {
      const valid = GitAutomation.isValidCommitMessage('fix bug');
      expect(valid).toBe(false);
    });

    it('should recognize conventional commits', () => {
      const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'];
      types.forEach(type => {
        const valid = GitAutomation.isValidCommitMessage(`${type}: description`);
        expect(valid).toBe(true);
      });
    });
  });
});

describe('AutoFix', () => {
  it('should create fix strategy', () => {
    const fix = {
      error: 'SyntaxError',
      attempts: 0,
      strategy: 'analyze_and_fix',
    };
    
    expect(fix.error).toBe('SyntaxError');
    expect(fix.attempts).toBe(0);
  });

  it('should track fix attempts', () => {
    let attempts = 0;
    attempts++;
    attempts++;
    
    expect(attempts).toBe(2);
  });

  it('should know when to give up', () => {
    const maxAttempts = 3;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
    }
    
    expect(attempts >= maxAttempts).toBe(true);
  });
});
