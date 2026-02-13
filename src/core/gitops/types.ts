// GitOps Types
export interface GitConfig {
  repoPath: string;
  defaultBranch: string;
  authorName: string;
  authorEmail: string;
}

export interface CommitResult {
  success: boolean;
  commitHash?: string;
  message?: string;
  error?: string;
}

export interface BranchResult {
  success: boolean;
  branchName?: string;
  error?: string;
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  content?: string;
}

export interface GitStatus {
  branch: string;
  isClean: boolean;
  ahead: number;
  behind: number;
  changes: FileChange[];
}

export interface DiffResult {
  file: string;
  additions: number;
  deletions: number;
  changes: string;
}

export interface TagResult {
  success: boolean;
  tagName?: string;
  error?: string;
}
