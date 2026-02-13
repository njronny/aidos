// GitHub Integration Types

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  baseUrl?: string;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description?: string;
  default_branch?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateRepoOptions {
  private?: boolean;
  description?: string;
  auto_init?: boolean;
  gitignore_template?: string;
  license_template?: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: string;
  html_url: string;
  draft?: boolean;
  merged?: boolean;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  user?: { login: string };
  merged_at?: string;
}

export interface CreatePROptions {
  title: string;
  body?: string;
  head: string;
  base: string;
  draft?: boolean;
  maintainer_can_modify?: boolean;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: string;
  html_url: string;
  labels: Array<{ name: string; color: string }>;
  assignees: Array<{ login: string }>;
  user?: { login: string };
  created_at?: string;
  updated_at?: string;
}

export interface CreateIssueOptions {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}

export interface Branch {
  name: string;
  commit: { sha: string; url: string };
  protected: boolean;
}

export interface Commit {
  sha: string;
  message: string;
  author: { name: string; email: string; date: string };
  url: string;
}

export interface CIStatus {
  id: number;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | null;
  head_branch: string;
  head_sha: string;
  check_runs: Array<{
    name: string;
    status: string;
    conclusion: string | null;
  }>;
}

export interface CommitStatus {
  state: 'pending' | 'success' | 'error' | 'failure';
  statuses: Array<{
    context: string;
    state: string;
    description?: string;
  }>;
}

export interface Comment {
  id: number;
  body: string;
  user: { login: string };
  created_at: string;
}

export interface ListOptions {
  state?: 'open' | 'closed' | 'all';
  page?: number;
  per_page?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface GitOpsOptions {
  autoCreateBranch?: boolean;
  branchPrefix?: string;
  autoMergeOnSuccess?: boolean;
  notifyOnFailure?: boolean;
}

export interface WorkflowResult {
  success: boolean;
  branch?: string;
  prNumber?: number;
  ciStatus?: CIStatus;
  error?: string;
}
