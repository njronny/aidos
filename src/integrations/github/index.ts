/**
 * GitHub Integration Module
 * Provides GitHub API integration for repository management, PR, and CI
 */

export { GitHubService, default } from './GitHubService';
export type {
  GitHubConfig,
  Repository,
  PullRequest,
  Issue,
  Branch,
  CIStatus,
  CommitStatus,
  Comment,
  CreateRepoOptions,
  CreatePROptions,
  CreateIssueOptions,
  ListOptions,
  GitOpsOptions,
  WorkflowResult,
} from './types';
