import { v4 as uuidv4 } from 'uuid';
import {
  AnalysisResult,
  Requirement,
  Risk,
  TaskTemplate,
  ComplexityLevel,
  AnalyzerConfig,
} from './types';

/**
 * Requirement Analyzer
 * Analyzes user requirements and generates structured analysis results
 */
export class RequirementAnalyzer {
  private config: AnalyzerConfig;

  constructor(config: Partial<AnalyzerConfig> = {}) {
    this.config = {
      model: config.model ?? 'gpt-4',
      maxTokens: config.maxTokens ?? 4000,
      temperature: config.temperature ?? 0.7,
    };
  }

  /**
   * Analyze requirements from text input
   */
  async analyze(requirementsText: string): Promise<AnalysisResult> {
    // Parse and extract requirements
    const requirements = this.extractRequirements(requirementsText);

    // Identify risks
    const risks = this.identifyRisks(requirements);

    // Generate architecture suggestions
    const architecture = this.suggestArchitecture(requirements);

    // Generate task templates
    const tasks = this.generateTaskTemplates(requirements, architecture);

    // Calculate complexity
    const complexity = this.calculateComplexity(requirements, tasks);

    return {
      requirements,
      risks,
      architecture,
      tasks,
      estimatedComplexity: complexity,
    };
  }

  /**
   * Extract structured requirements from text
   */
  private extractRequirements(text: string): Requirement[] {
    const requirements: Requirement[] = [];
    const lines = text.split('\n').filter((line) => line.trim());

    let currentRequirement: Partial<Requirement> | null = null;

    for (const line of lines) {
      // Simple parsing - in production would use LLM
      if (line.includes('需要') || line.includes('should') || line.includes('must')) {
        if (currentRequirement?.description) {
          requirements.push(this.createRequirement(currentRequirement));
        }
        currentRequirement = {
          id: uuidv4(),
          description: line.trim(),
          type: this.detectRequirementType(line),
          priority: this.detectPriority(line),
          acceptanceCriteria: [],
        };
      }
    }

    if (currentRequirement?.description) {
      requirements.push(this.createRequirement(currentRequirement));
    }

    // If no requirements extracted, create a default one
    if (requirements.length === 0) {
      requirements.push({
        id: uuidv4(),
        description: text.substring(0, 200),
        type: 'functional',
        priority: 'medium',
        acceptanceCriteria: ['完成基本功能'],
      });
    }

    return requirements;
  }

  /**
   * Create a complete requirement object
   */
  private createRequirement(partial: Partial<Requirement>): Requirement {
    return {
      id: partial.id ?? uuidv4(),
      description: partial.description ?? '',
      type: partial.type ?? 'functional',
      priority: partial.priority ?? 'medium',
      acceptanceCriteria: partial.acceptanceCriteria ?? [],
    };
  }

  /**
   * Detect requirement type from text
   */
  private detectRequirementType(text: string): Requirement['type'] {
    const lowerText = text.toLowerCase();
    if (
      lowerText.includes('性能') ||
      lowerText.includes('security') ||
      lowerText.includes('scalability')
    ) {
      return 'non-functional';
    }
    if (
      lowerText.includes('限制') ||
      lowerText.includes('constraint') ||
      lowerText.includes('只能')
    ) {
      return 'constraint';
    }
    return 'functional';
  }

  /**
   * Detect priority from text
   */
  private detectPriority(text: string): Requirement['priority'] {
    const lowerText = text.toLowerCase();
    if (
      lowerText.includes('重要') ||
      lowerText.includes('critical') ||
      lowerText.includes('必须')
    ) {
      return 'critical';
    }
    if (lowerText.includes('高') || lowerText.includes('high') || lowerText.includes('优先')) {
      return 'high';
    }
    if (lowerText.includes('低') || lowerText.includes('low') || lowerText.includes('可选')) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Identify potential risks
   */
  private identifyRisks(requirements: Requirement[]): Risk[] {
    const risks: Risk[] = [];

    for (const req of requirements) {
      if (req.priority === 'critical') {
        risks.push({
          id: uuidv4(),
          description: `关键需求: ${req.description}`,
          severity: 'high',
          mitigation: '优先实现并充分测试',
        });
      }

      if (req.type === 'non-functional') {
        risks.push({
          id: uuidv4(),
          description: `非功能性需求: ${req.description}`,
          severity: 'medium',
          mitigation: '制定专门的性能/安全测试计划',
        });
      }
    }

    // Check for integration risks
    if (requirements.length > 10) {
      risks.push({
        id: uuidv4(),
        description: '需求数量较多，存在集成复杂性风险',
        severity: 'medium',
        mitigation: '分阶段交付，设置集成检查点',
      });
    }

    return risks;
  }

  /**
   * Suggest architecture based on requirements
   */
  private suggestArchitecture(requirements: Requirement[]): AnalysisResult['architecture'] {
    const hasHighPerformance = requirements.some(
      (r) => r.type === 'non-functional' && r.description.toLowerCase().includes('性能')
    );

    const isComplex = requirements.length > 15;

    let type: AnalysisResult['architecture']['type'] = 'monolithic';
    if (isComplex || hasHighPerformance) {
      type = 'microservices';
    }

    return {
      type,
      techStack: {
        frontend: 'React',
        backend: 'Node.js',
        database: 'PostgreSQL',
        infrastructure: ['Docker', 'Kubernetes'],
      },
    };
  }

  /**
   * Generate task templates from requirements
   */
  private generateTaskTemplates(
    requirements: Requirement[],
    architecture: AnalysisResult['architecture']
  ): TaskTemplate[] {
    const tasks: TaskTemplate[] = [];

    // Setup task
    tasks.push({
      name: '项目初始化',
      description: '初始化项目结构、配置开发环境',
      type: 'infrastructure',
      dependencies: [],
      estimatedDuration: 30,
    });

    // Create task for each requirement
    for (const req of requirements) {
      tasks.push({
        name: `实现: ${req.description.substring(0, 50)}`,
        description: req.description,
        type: 'development',
        dependencies: ['项目初始化'],
        estimatedDuration: req.priority === 'critical' ? 120 : 60,
      });
    }

    // Testing task
    tasks.push({
      name: '集成测试',
      description: '执行完整的集成测试',
      type: 'testing',
      dependencies: tasks.filter((t) => t.type === 'development').map((t) => t.name),
      estimatedDuration: 60,
    });

    // Documentation task
    tasks.push({
      name: '文档完善',
      description: '生成项目文档和API文档',
      type: 'documentation',
      dependencies: ['集成测试'],
      estimatedDuration: 30,
    });

    return tasks;
  }

  /**
   * Calculate overall complexity
   */
  private calculateComplexity(requirements: Requirement[], tasks: TaskTemplate[]): ComplexityLevel {
    const criticalCount = requirements.filter((r) => r.priority === 'critical').length;
    const totalTasks = tasks.length;

    if (criticalCount > 5 || totalTasks > 20) {
      return 'very-complex';
    }
    if (criticalCount > 2 || totalTasks > 10) {
      return 'complex';
    }
    if (totalTasks > 5) {
      return 'moderate';
    }
    return 'simple';
  }

  /**
   * Get analyzer configuration
   */
  getConfig(): AnalyzerConfig {
    return { ...this.config };
  }

  /**
   * Update analyzer configuration
   */
  updateConfig(config: Partial<AnalyzerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default RequirementAnalyzer;
