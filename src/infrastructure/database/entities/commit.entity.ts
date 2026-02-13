/**
 * Git提交实体
 */
export interface Commit {
  id: string;
  projectId: string;
  taskId?: string;
  commitHash: string;
  parentHashes?: string[];
  branch: string;
  message: string;
  author: string;
  authorEmail?: string;
  filesChanged: string[];
  insertions: number;
  deletions: number;
  isRollback: boolean;
  rolledBackById?: string;
  createdAt: Date;
}

export interface CreateCommitInput {
  projectId: string;
  taskId?: string;
  commitHash: string;
  parentHashes?: string[];
  branch: string;
  message: string;
  author: string;
  authorEmail?: string;
  filesChanged?: string[];
  insertions?: number;
  deletions?: number;
  isRollback?: boolean;
  rolledBackById?: string;
}

export interface UpdateCommitInput {
  taskId?: string;
  commitHash?: string;
  parentHashes?: string[];
  branch?: string;
  message?: string;
  author?: string;
  authorEmail?: string;
  filesChanged?: string[];
  insertions?: number;
  deletions?: number;
  isRollback?: boolean;
  rolledBackById?: string;
}
