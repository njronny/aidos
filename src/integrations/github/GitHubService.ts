import {
  GitHubConfig,
  Repository,
  PullRequest,
  Issue,
  Branch,
  CIStatus,
  CreateRepoOptions,
  CreatePROptions,
  CreateIssueOptions,
  ListOptions,
  CommitStatus,
  Comment,
  GitOpsOptions,
  WorkflowResult,
} from './types';

/**
 * GitHubService - GitHub API Integration
 * Handles repository management, PR operations, issues, and CI status
 */
export class GitHubService {
  private config: GitHubConfig;
  private baseUrl: string;

  constructor(config: GitHubConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.github.com';
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' })) as { message?: string };
      throw new Error(`GitHub API error: ${error.message || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Create a new repository
   */
  async createRepository(
    name: string,
    options: CreateRepoOptions = {}
  ): Promise<Repository> {
    return this.request<Repository>('/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name,
        private: options.private || false,
        description: options.description,
        auto_init: options.auto_init ?? true,
        gitignore_template: options.gitignore_template,
        license_template: options.license_template,
      }),
    });
  }

  /**
   * Get repository information
   */
  async getRepository(): Promise<Repository> {
    return this.request<Repository>(
      `/repos/${this.config.owner}/${this.config.repo}`
    );
  }

  /**
   * List user repositories
   */
  async listRepositories(options: ListOptions = {}): Promise<Repository[]> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', String(options.page));
    if (options.per_page) params.append('per_page', String(options.per_page));
    if (options.sort) params.append('sort', options.sort);
    if (options.direction) params.append('direction', options.direction);

    const query = params.toString();
    return this.request<Repository[]>(`/user/repos${query ? `?${query}` : ''}`);
  }

  /**
   * Create a new branch
   */
  async createBranch(branchName: string, sourceBranch: string = 'main'): Promise<Branch> {
    // Get the SHA of the source branch
    const sourceRef = await this.request<{ object: { sha: string } }>(
      `/repos/${this.config.owner}/${this.config.repo}/git/refs/heads/${sourceBranch}`
    );

    return this.request<Branch>(`/repos/${this.config.owner}/${this.config.repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: sourceRef.object.sha,
      }),
    });
  }

  /**
   * Get branch information
   */
  async getBranch(branchName: string): Promise<Branch> {
    return this.request<Branch>(
      `/repos/${this.config.owner}/${this.config.repo}/branches/${branchName}`
    );
  }

  /**
   * List branches
   */
  async listBranches(): Promise<Branch[]> {
    return this.request<Branch[]>(
      `/repos/${this.config.owner}/${this.config.repo}/branches`
    );
  }

  /**
   * Delete a branch
   */
  async deleteBranch(branchName: string): Promise<void> {
    await this.request<void>(
      `/repos/${this.config.owner}/${this.config.repo}/git/refs/heads/${branchName}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Create a pull request
   */
  async createPullRequest(options: CreatePROptions): Promise<PullRequest> {
    return this.request<PullRequest>(
      `/repos/${this.config.owner}/${this.config.repo}/pulls`,
      {
        method: 'POST',
        body: JSON.stringify({
          title: options.title,
          body: options.body,
          head: options.head,
          base: options.base,
          draft: options.draft || false,
          maintainer_can_modify: options.maintainer_can_modify ?? true,
        }),
      }
    );
  }

  /**
   * Get pull request by number
   */
  async getPullRequest(prNumber: number): Promise<PullRequest> {
    return this.request<PullRequest>(
      `/repos/${this.config.owner}/${this.config.repo}/pulls/${prNumber}`
    );
  }

  /**
   * List pull requests
   */
  async listPullRequests(options: ListOptions = {}): Promise<PullRequest[]> {
    const params = new URLSearchParams();
    if (options.state) params.append('state', options.state);
    if (options.page) params.append('page', String(options.page));
    if (options.per_page) params.append('per_page', String(options.per_page));

    const query = params.toString();
    return this.request<PullRequest[]>(
      `/repos/${this.config.owner}/${this.config.repo}/pulls${query ? `?${query}` : ''}`
    );
  }

  /**
   * Merge a pull request
   */
  async mergePullRequest(
    prNumber: number,
    mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash'
  ): Promise<{ merged: boolean; sha: string; message: string }> {
    return this.request<{ merged: boolean; sha: string; message: string }>(
      `/repos/${this.config.owner}/${this.config.repo}/pulls/${prNumber}/merge`,
      {
        method: 'PUT',
        body: JSON.stringify({
          merge_method: mergeMethod,
        }),
      }
    );
  }

  /**
   * Create an issue
   */
  async createIssue(options: CreateIssueOptions): Promise<Issue> {
    return this.request<Issue>(
      `/repos/${this.config.owner}/${this.config.repo}/issues`,
      {
        method: 'POST',
        body: JSON.stringify({
          title: options.title,
          body: options.body,
          labels: options.labels,
          assignees: options.assignees,
        }),
      }
    );
  }

  /**
   * Get issue by number
   */
  async getIssue(issueNumber: number): Promise<Issue> {
    return this.request<Issue>(
      `/repos/${this.config.owner}/${this.config.repo}/issues/${issueNumber}`
    );
  }

  /**
   * List issues
   */
  async listIssues(options: ListOptions = {}): Promise<Issue[]> {
    const params = new URLSearchParams();
    if (options.state) params.append('state', options.state);
    if (options.page) params.append('page', String(options.page));
    if (options.per_page) params.append('per_page', String(options.per_page));
    if (options.sort) params.append('sort', options.sort);
    if (options.direction) params.append('direction', options.direction);

    const query = params.toString();
    return this.request<Issue[]>(
      `/repos/${this.config.owner}/${this.config.repo}/issues${query ? `?${query}` : ''}`
    );
  }

  /**
   * Add a comment to an issue or PR
   */
  async addComment(
    issueNumber: number,
    body: string
  ): Promise<Comment> {
    return this.request<Comment>(
      `/repos/${this.config.owner}/${this.config.repo}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ body }),
      }
    );
  }

  /**
   * Get CI status for a branch
   */
  async getCIStatus(branch: string): Promise<CIStatus> {
    const response = await this.request<{
      check_runs: Array<{
        name: string;
        status: string;
        conclusion: string | null;
      }>;
    }>(
      `/repos/${this.config.owner}/${this.config.repo}/commits/${branch}/check-runs`
    );

    const checkRuns = response.check_runs || [];
    
    // Determine overall status
    let status: CIStatus['status'] = 'queued';
    let conclusion: CIStatus['conclusion'] = null;

    if (checkRuns.every(run => run.status === 'completed')) {
      status = 'completed';
      conclusion = checkRuns.some(run => run.conclusion === 'failure' || run.conclusion === 'cancelled')
        ? 'failure'
        : checkRuns.some(run => run.conclusion === 'success')
        ? 'success'
        : null;
    } else if (checkRuns.some(run => run.status === 'in_progress')) {
      status = 'in_progress';
    }

    return {
      id: 0,
      status,
      conclusion,
      head_branch: branch,
      head_sha: '',
      check_runs: checkRuns,
    };
  }

  /**
   * Get commit status (legacy)
   */
  async getCommitStatus(commitSha: string): Promise<CommitStatus> {
    return this.request<CommitStatus>(
      `/repos/${this.config.owner}/${this.config.repo}/commits/${commitSha}/status`
    );
  }

  /**
   * Wait for CI to complete
   */
  async waitForCI(
    branch: string,
    timeout: number = 300000,
    interval: number = 10000
  ): Promise<CIStatus> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await this.getCIStatus(branch);

      if (status.status === 'completed') {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`CI timeout after ${timeout}ms`);
  }

  /**
   * GitOps workflow: Create branch, PR, and optionally wait for CI
   */
  async executeGitOpsWorkflow(
    taskId: string,
    options: GitOpsOptions = {}
  ): Promise<WorkflowResult> {
    const {
      autoCreateBranch = true,
      branchPrefix = 'feature',
      autoMergeOnSuccess = false,
    } = options;

    try {
      // Create branch
      const branchName = `${branchPrefix}/${taskId}`;
      
      if (autoCreateBranch) {
        await this.createBranch(branchName);
      }

      // Create PR
      const pr = await this.createPullRequest({
        title: `[${taskId}] Automated Pull Request`,
        body: `Automated PR for task: ${taskId}`,
        head: branchName,
        base: 'main',
      });

      // Wait for CI if enabled
      let ciStatus: CIStatus | undefined;
      if (autoMergeOnSuccess) {
        ciStatus = await this.waitForCI(branchName);
        
        // Auto merge on success
        if (ciStatus.conclusion === 'success') {
          await this.mergePullRequest(pr.number);
          return {
            success: true,
            branch: branchName,
            prNumber: pr.number,
            ciStatus,
          };
        }
      }

      return {
        success: true,
        branch: branchName,
        prNumber: pr.number,
        ciStatus,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get configuration
   */
  getConfig(): GitHubConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GitHubConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }
}

export default GitHubService;
