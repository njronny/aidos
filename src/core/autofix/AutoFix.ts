import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { FixResult, Fix, FixType, ErrorAnalysis, AutoFixConfig } from './types';

const execAsync = promisify(exec);

/**
 * AutoFix - Automatic Error Fixing Engine
 * Analyzes errors and automatically applies fixes
 */
export class AutoFix {
  private config: AutoFixConfig;
  private fixStrategies: Map<FixType, (error: ErrorAnalysis) => Promise<Fix[]>>;

  constructor(config: Partial<AutoFixConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      enableLinting: config.enableLinting ?? true,
      enableTesting: config.enableTesting ?? true,
      autoCommit: config.autoCommit ?? false,
      backupBeforeFix: config.backupBeforeFix ?? true,
    };

    this.fixStrategies = new Map();
    this.initializeStrategies();
  }

  /**
   * Initialize built-in fix strategies
   */
  private initializeStrategies(): void {
    this.fixStrategies.set('syntax_error', this.fixSyntaxError.bind(this));
    this.fixStrategies.set('type_error', this.fixTypeError.bind(this));
    this.fixStrategies.set('import_error', this.fixImportError.bind(this));
    this.fixStrategies.set('missing_dependency', this.fixMissingDependency.bind(this));
    this.fixStrategies.set('configuration_error', this.fixConfigurationError.bind(this));
    this.fixStrategies.set('lint_error', this.fixLintError.bind(this));
    this.fixStrategies.set('test_failure', this.fixTestFailure.bind(this));
  }

  /**
   * Analyze error and determine type
   */
  async analyzeError(errorOutput: string): Promise<ErrorAnalysis> {
    const lowerError = errorOutput.toLowerCase();

    // Determine error type
    let type: FixType = 'unknown';
    if (lowerError.includes('syntax error') || lowerError.includes('unexpected token')) {
      type = 'syntax_error';
    } else if (lowerError.includes('type error') || lowerError.includes('cannot find type')) {
      type = 'type_error';
    } else if (lowerError.includes('cannot find module') || lowerError.includes('import')) {
      type = 'import_error';
    } else if (lowerError.includes('not found') || lowerError.includes('missing')) {
      type = 'missing_dependency';
    } else if (lowerError.includes('config') || lowerError.includes('configuration')) {
      type = 'configuration_error';
    } else if (lowerError.includes('test') || lowerError.includes('expect')) {
      type = 'test_failure';
    } else if (lowerError.includes('lint') || lowerError.includes('eslint')) {
      type = 'lint_error';
    }

    // Extract location
    const locationMatch = errorOutput.match(/at\s+(.*?):(\d+):(\d+)/);
    const location = locationMatch
      ? {
          file: locationMatch[1],
          line: parseInt(locationMatch[2]),
          column: parseInt(locationMatch[3]),
        }
      : undefined;

    // Generate suggestions
    const suggestions = this.generateSuggestions(type, errorOutput);

    return {
      type,
      message: this.extractMainMessage(errorOutput),
      location,
      stackTrace: errorOutput,
      suggestions,
    };
  }

  /**
   * Extract main error message
   */
  private extractMainMessage(errorOutput: string): string {
    const lines = errorOutput.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('at ') && !trimmed.startsWith('    at')) {
        return trimmed;
      }
    }
    return 'Unknown error';
  }

  /**
   * Generate fix suggestions based on error type
   */
  private generateSuggestions(type: FixType, errorOutput: string): string[] {
    const suggestions: string[] = [];

    switch (type) {
      case 'syntax_error':
        suggestions.push('检查括号、引号是否匹配');
        suggestions.push('检查是否有遗漏的分号或逗号');
        break;
      case 'type_error':
        suggestions.push('检查类型定义是否正确');
        suggestions.push('确认变量类型与赋值匹配');
        break;
      case 'import_error':
        suggestions.push('确认导入路径是否正确');
        suggestions.push('检查模块是否已安装');
        break;
      case 'missing_dependency':
        suggestions.push('运行 npm install 或 yarn install');
        suggestions.push('检查 package.json 中的依赖');
        break;
      case 'configuration_error':
        suggestions.push('检查配置文件格式是否正确');
        suggestions.push('验证必需的配置文件是否存在');
        break;
      case 'test_failure':
        suggestions.push('检查测试用例是否正确');
        suggestions.push('查看测试预期值是否合理');
        break;
      case 'lint_error':
        suggestions.push('运行 eslint --fix 自动修复');
        suggestions.push('检查代码风格规范');
        break;
      default:
        suggestions.push('查看完整错误信息');
    }

    return suggestions;
  }

  /**
   * Fix syntax errors
   */
  private async fixSyntaxError(error: ErrorAnalysis): Promise<Fix[]> {
    const fixes: Fix[] = [];

    if (!error.location?.file) {
      return fixes;
    }

    try {
      const content = await fs.readFile(error.location.file, 'utf-8');
      const lines = content.split('\n');

      // Simple fixes for common syntax errors
      const line = lines[error.location.line! - 1];
      if (line.includes('===') && line.includes('==')) {
        // Fix double equals
        const newLine = line.replace(/==(?!\s*=)/g, '===');
        lines[error.location.line! - 1] = newLine;
        fixes.push({
          type: 'syntax_error',
          description: '将 == 改为 === 以避免类型 coercion',
          file: error.location.file,
          line: error.location.line,
          original: line,
          replacement: newLine,
        });
      }

      await fs.writeFile(error.location.file, lines.join('\n'), 'utf-8');
    } catch {
      // Ignore read/write errors
    }

    return fixes;
  }

  /**
   * Fix type errors
   */
  private async fixTypeError(error: ErrorAnalysis): Promise<Fix[]> {
    const fixes: Fix[] = [];

    if (error.message.includes('any')) {
      fixes.push({
        type: 'type_error',
        description: '添加类型注解或接口定义',
        file: error.location?.file,
        line: error.location?.line,
      });
    }

    return fixes;
  }

  /**
   * Fix import errors
   */
  private async fixImportError(error: ErrorAnalysis): Promise<Fix[]> {
    const fixes: Fix[] = [];
    const match = error.message.match(/cannot find module ['"](.*?)['"]/);

    if (match) {
      const moduleName = match[1];
      fixes.push({
        type: 'import_error',
        description: `安装缺失的模块: npm install ${moduleName}`,
        file: error.location?.file,
      });
    }

    return fixes;
  }

  /**
   * Fix missing dependencies
   */
  private async fixMissingDependency(error: ErrorAnalysis): Promise<Fix[]> {
    const fixes: Fix[] = [];

    fixes.push({
      type: 'missing_dependency',
      description: '运行 npm install 安装依赖',
    });

    return fixes;
  }

  /**
   * Fix configuration errors
   */
  private async fixConfigurationError(error: ErrorAnalysis): Promise<Fix[]> {
    const fixes: Fix[] = [];

    fixes.push({
      type: 'configuration_error',
      description: '检查并修复配置文件',
    });

    return fixes;
  }

  /**
   * Fix lint errors
   */
  private async fixLintError(error: ErrorAnalysis): Promise<Fix[]> {
    const fixes: Fix[] = [];

    try {
      await execAsync('npx eslint --fix .', { stdio: 'pipe' });
      fixes.push({
        type: 'lint_error',
        description: '已运行 eslint --fix 自动修复',
      });
    } catch {
      // Ignore if eslint fails
    }

    return fixes;
  }

  /**
   * Fix test failures
   */
  private async fixTestFailure(error: ErrorAnalysis): Promise<Fix[]> {
    const fixes: Fix[] = [];

    fixes.push({
      type: 'test_failure',
      description: '检查测试用例并修复',
      file: error.location?.file,
      line: error.location?.line,
    });

    return fixes;
  }

  /**
   * Main fix method - attempt to fix errors
   */
  async fix(errorOutput: string): Promise<FixResult> {
    const result: FixResult = {
      success: false,
      attempts: 0,
      fixes: [],
    };

    // Analyze the error
    const analysis = await this.analyzeError(errorOutput);
    result.attempts = 1;

    // Get fix strategy for this error type
    const strategy = this.fixStrategies.get(analysis.type);

    if (strategy) {
      try {
        const fixes = await strategy(analysis);
        result.fixes = fixes;
        result.success = fixes.length > 0 && fixes.every((f) => f.replacement !== undefined);
      } catch (error) {
        result.error = (error as Error).message;
      }
    }

    // If still failed and have retries, try again
    if (!result.success && result.attempts < this.config.maxRetries) {
      result.attempts++;
      // Add retry delay could be implemented here
    }

    return result;
  }

  /**
   * Register custom fix strategy
   */
  registerStrategy(type: FixType, strategy: (error: ErrorAnalysis) => Promise<Fix[]>): void {
    this.fixStrategies.set(type, strategy);
  }

  /**
   * Get configuration
   */
  getConfig(): AutoFixConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AutoFixConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default AutoFix;
