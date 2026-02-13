// Analyzer Types
export interface AnalysisResult {
  requirements: Requirement[];
  risks: Risk[];
  architecture: ArchitectureSuggestion;
  tasks: TaskTemplate[];
  estimatedComplexity: ComplexityLevel;
}

export interface Requirement {
  id: string;
  description: string;
  type: 'functional' | 'non-functional' | 'constraint';
  priority: 'low' | 'medium' | 'high' | 'critical';
  acceptanceCriteria: string[];
}

export interface Risk {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation?: string;
}

export interface ArchitectureSuggestion {
  type: 'monolithic' | 'microservices' | 'serverless' | 'hybrid';
  techStack: TechStackSuggestion;
  diagrams?: string[];
}

export interface TechStackSuggestion {
  frontend?: string;
  backend?: string;
  database?: string;
  infrastructure?: string[];
}

export interface TaskTemplate {
  name: string;
  description: string;
  type: 'development' | 'testing' | 'documentation' | 'infrastructure';
  dependencies: string[];
  estimatedDuration: number; // minutes
}

export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'very-complex';

export interface AnalyzerConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}
