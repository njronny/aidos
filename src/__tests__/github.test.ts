/**
 * GitHub集成单元测试
 */
import { GitHubService } from '../integrations/github/GitHubService';
import { 
  Repository, 
  PullRequest, 
  Issue, 
  Branch, 
  Commit, 
  CIStatus,
  GitHubConfig,
  CreateRepoOptions,
  CreatePROptions,
  CreateIssueOptions,
} from '../integrations/github/types';

// Mock fetch
global.fetch = jest.fn();

describe('GitHubService', () => {
  let service: GitHubService;
  const mockConfig: GitHubConfig = {
    token: 'test-token',
    owner: 'test-owner',
    repo: 'test-repo',
    baseUrl: 'https://api.github.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GitHubService(mockConfig);
  });

  describe('构造函数', () => {
    test('应该正确初始化配置', () => {
      expect(service).toBeInstanceOf(GitHubService);
    });

    test('应该使用默认baseUrl当未提供时', () => {
      const serviceWithDefault = new GitHubService({ token: 'test', owner: 'owner', repo: 'repo' });
      expect(serviceWithDefault).toBeInstanceOf(GitHubService);
    });
  });

  describe('createRepository', () => {
    test('应该成功创建公开仓库', async () => {
      const mockResponse = {
        id: 123,
        name: 'test-repo',
        full_name: 'test-owner/test-repo',
        private: false,
        html_url: 'https://github.com/test-owner/test-repo',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.createRepository('test-repo', { private: false });

      expect(result).toEqual(expect.objectContaining({
        id: 123,
        name: 'test-repo',
        private: false,
      }));
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/user/repos',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Accept': 'application/vnd.github.v3+json',
          }),
        })
      );
    });

    test('应该创建私有仓库', async () => {
      const mockResponse = {
        id: 456,
        name: 'private-repo',
        private: true,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.createRepository('private-repo', { private: true });

      expect(result.private).toBe(true);
    });

    test('创建失败时应该抛出错误', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
        statusText: 'Unauthorized',
      });

      await expect(service.createRepository('test-repo')).rejects.toThrow('GitHub API error');
    });
  });

  describe('createBranch', () => {
    test('应该成功创建分支', async () => {
      // Mock the source branch lookup first, then the branch creation
      const mockRefResponse = {
        object: { sha: 'abc123def456' },
      };
      
      const mockBranchResponse = {
        name: 'feature/new-feature',
        commit: { sha: 'abc123def456' },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRefResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBranchResponse),
        });

      const result = await service.createBranch('feature/new-feature', 'main');

      expect(result.name).toBe('feature/new-feature');
      // Verify both API calls were made
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('源分支不存在时应该抛出错误', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ message: 'Reference already exists' }),
      });

      await expect(service.createBranch('existing-branch', 'main')).rejects.toThrow();
    });
  });

  describe('createPullRequest', () => {
    test('应该成功创建PR', async () => {
      const mockResponse = {
        id: 789,
        number: 1,
        title: 'Feature: New Feature',
        body: 'Description here',
        state: 'open',
        html_url: 'https://github.com/test-owner/test-repo/pull/1',
        head: { ref: 'feature/new-feature' },
        base: { ref: 'main' },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.createPullRequest({
        title: 'Feature: New Feature',
        body: 'Description here',
        head: 'feature/new-feature',
        base: 'main',
      });

      expect(result.number).toBe(1);
      expect(result.state).toBe('open');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-owner/test-repo/pulls',
        expect.objectContaining({ method: 'POST' })
      );
    });

    test('应该支持draft PR', async () => {
      const mockResponse = {
        draft: true,
        title: 'Draft PR',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.createPullRequest({
        title: 'Draft PR',
        head: 'feature/test',
        base: 'main',
        draft: true,
      });

      expect(result.draft).toBe(true);
    });
  });

  describe('createIssue', () => {
    test('应该成功创建Issue', async () => {
      const mockResponse = {
        id: 101,
        number: 1,
        title: 'Bug: Login failed',
        body: 'Steps to reproduce...',
        state: 'open',
        html_url: 'https://github.com/test-owner/test-repo/issues/1',
        labels: [{ name: 'bug' }],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.createIssue({
        title: 'Bug: Login failed',
        body: 'Steps to reproduce...',
        labels: ['bug'],
      });

      expect(result.number).toBe(1);
      expect(result.state).toBe('open');
    });

    test('应该支持添加assignees', async () => {
      const mockResponse = {
        number: 2,
        assignees: [{ login: 'user1' }, { login: 'user2' }],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.createIssue({
        title: 'Task',
        assignees: ['user1', 'user2'],
      });

      expect(result.assignees).toHaveLength(2);
    });
  });

  describe('getCIStatus', () => {
    test('应该获取CI状态', async () => {
      const mockResponse = {
        id: 202,
        status: 'completed',
        conclusion: 'success',
        head_branch: 'main',
        head_sha: 'abc123def',
        check_runs: [
          { name: 'test', status: 'completed', conclusion: 'success' },
          { name: 'build', status: 'completed', conclusion: 'success' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.getCIStatus('main');

      expect(result.status).toBe('completed');
      expect(result.conclusion).toBe('success');
    });

    test('应该返回运行中状态', async () => {
      const mockResponse = {
        status: 'in_progress',
        conclusion: null,
        check_runs: [
          { name: 'test', status: 'in_progress', conclusion: null },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.getCIStatus('feature/test');

      expect(result.status).toBe('in_progress');
      expect(result.conclusion).toBeNull();
    });

    test('应该处理CI失败', async () => {
      const mockResponse = {
        status: 'completed',
        conclusion: 'failure',
        check_runs: [
          { name: 'test', status: 'completed', conclusion: 'failure' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.getCIStatus('main');

      expect(result.conclusion).toBe('failure');
    });
  });

  describe('listRepositories', () => {
    test('应该列出用户仓库', async () => {
      const mockResponse = [
        { id: 1, name: 'repo1', full_name: 'test-owner/repo1' },
        { id: 2, name: 'repo2', full_name: 'test-owner/repo2' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.listRepositories();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('repo1');
    });
  });

  describe('getPullRequest', () => {
    test('应该获取PR详情', async () => {
      const mockResponse = {
        number: 1,
        title: 'PR Title',
        state: 'open',
        merged: false,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.getPullRequest(1);

      expect(result.number).toBe(1);
      expect(result.state).toBe('open');
    });
  });

  describe('mergePullRequest', () => {
    test('应该成功合并PR', async () => {
      const mockResponse = {
        merged: true,
        sha: 'merged-commit-sha',
        message: 'Pull Request successfully merged',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.mergePullRequest(1);

      expect(result.merged).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-owner/test-repo/pulls/1/merge',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('listIssues', () => {
    test('应该列出仓库Issues', async () => {
      const mockResponse = [
        { id: 1, number: 1, title: 'Issue 1', state: 'open' },
        { id: 2, number: 2, title: 'Issue 2', state: 'closed' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.listIssues({ state: 'open' });

      expect(result).toHaveLength(2);
    });
  });

  describe('addComment', () => {
    test('应该成功添加评论', async () => {
      const mockResponse = {
        id: 1,
        body: 'Great work!',
        user: { login: 'test-user' },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.addComment(1, 'Great work!');

      expect(result.body).toBe('Great work!');
    });
  });

  describe('getCommitStatus', () => {
    test('应该获取提交状态', async () => {
      const mockResponse = {
        state: 'success',
        statuses: [
          { context: 'ci/test', state: 'success' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.getCommitStatus('abc123');

      expect(result.state).toBe('success');
    });
  });
});
