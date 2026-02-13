// AutoFix Types
export interface FixResult {
  success: boolean;
  attempts: number;
  fixes: Fix[];
  error?: string;
}

export interface Fix {
  type: FixType;
  description: string;
  file?: string;
  line?: number;
  original?: string;
  replacement?: string;
}

export type FixType =
  | 'syntax_error'
  | 'type_error'
  | 'import_error'
  | 'missing_dependency'
  | 'configuration_error'
  | 'test_failure'
  | 'lint_error'
  | 'unknown';

export interface ErrorAnalysis {
  type: FixType;
  message: string;
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  stackTrace?: string;
  suggestions: string[];
}

export interface FixStrategy {
  type: FixType;
  attempts: number;
  strategies: string[];
}

export interface AutoFixConfig {
  maxRetries: number;
  enableLinting: boolean;
  enableTesting: boolean;
  autoCommit: boolean;
  backupBeforeFix: boolean;
}
