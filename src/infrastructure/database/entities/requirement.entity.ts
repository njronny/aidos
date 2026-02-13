/**
 * 需求实体
 */
export interface Requirement {
  id: string;
  projectId: string;
  title: string;
  content: string;
  parsedContent?: Record<string, unknown>;
  status: 'pending' | 'analyzing' | 'analyzed' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  riskLevel?: 'low' | 'medium' | 'high';
  riskNotes?: string;
  aiModel?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRequirementInput {
  projectId: string;
  title: string;
  content: string;
  parsedContent?: Record<string, unknown>;
  status?: 'pending' | 'analyzing' | 'analyzed' | 'rejected';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  riskLevel?: 'low' | 'medium' | 'high';
  riskNotes?: string;
  aiModel?: string;
}

export interface UpdateRequirementInput {
  title?: string;
  content?: string;
  parsedContent?: Record<string, unknown>;
  status?: 'pending' | 'analyzing' | 'analyzed' | 'rejected';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  riskLevel?: 'low' | 'medium' | 'high';
  riskNotes?: string;
  aiModel?: string;
}
