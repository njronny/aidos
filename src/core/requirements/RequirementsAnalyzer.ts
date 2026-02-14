/**
 * RequirementsAnalyzer - 需求分析器
 * 自动将需求拆分为任务、估算工作量、排优先级
 */

export interface TaskTemplate {
  title: string;
  description: string;
  type: 'backend' | 'frontend' | 'database' | 'devops' | 'testing' | 'documentation';
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
}

export interface WorkEstimate {
  hours: number;
  complexity: 'simple' | 'medium' | 'complex';
  risks: string[];
  recommendations: string[];
}

export interface AnalysisResult {
  originalRequirement: string;
  tasks: TaskTemplate[];
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'medium' | 'complex';
  risks: string[];
}

export class RequirementsAnalyzer {
  private taskPatterns: Map<string, TaskTemplate[]> = new Map();

  constructor() {
    this.initPatterns();
  }

  /**
   * 初始化任务模式
   */
  private initPatterns(): void {
    // 电商相关
    this.taskPatterns.set('电商', [
      {
        title: '用户模块后端开发',
        description: '实现用户注册、登录、个人中心等API',
        type: 'backend',
        estimatedHours: 8,
        priority: 'high',
      },
      {
        title: '商品模块开发',
        description: '商品 CRUD、分类、搜索等功能',
        type: 'backend',
        estimatedHours: 12,
        priority: 'high',
      },
      {
        title: '订单模块开发',
        description: '购物车、订单创建、支付集成',
        type: 'backend',
        estimatedHours: 16,
        priority: 'critical',
      },
      {
        title: '前端商品展示页',
        description: '商品列表、详情页开发',
        type: 'frontend',
        estimatedHours: 8,
        priority: 'medium',
      },
      {
        title: '数据库设计',
        description: '设计用户、商品、订单表结构',
        type: 'database',
        estimatedHours: 4,
        priority: 'high',
      },
    ]);

    // 登录/用户相关
    this.taskPatterns.set('登录', [
      {
        title: '用户注册 API',
        description: '实现用户注册接口',
        type: 'backend',
        estimatedHours: 4,
        priority: 'high',
      },
      {
        title: '用户登录 API',
        description: '实现登录、JWT token 生成',
        type: 'backend',
        estimatedHours: 4,
        priority: 'critical',
      },
      {
        title: '登录页面开发',
        description: '前端登录界面',
        type: 'frontend',
        estimatedHours: 3,
        priority: 'medium',
      },
      {
        title: '用户表设计',
        description: '设计用户表结构',
        type: 'database',
        estimatedHours: 2,
        priority: 'high',
      },
    ]);

    // API 开发
    this.taskPatterns.set('API', [
      {
        title: 'RESTful API 开发',
        description: '实现 CRUD 接口',
        type: 'backend',
        estimatedHours: 6,
        priority: 'medium',
      },
      {
        title: 'API 文档编写',
        description: '编写 OpenAPI/Swagger 文档',
        type: 'documentation',
        estimatedHours: 2,
        priority: 'low',
      },
    ]);
  }

  /**
   * 分析需求并生成任务
   */
  async analyzeRequirement(requirement: string): Promise<AnalysisResult> {
    if (!requirement || requirement.trim().length === 0) {
      throw new Error('需求描述不能为空');
    }

    const tasks = this.decomposeRequirement(requirement);
    const estimatedHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const priority = await this.suggestPriority(requirement);
    const complexity = this.assessComplexity(requirement, tasks);
    const risks = this.identifyRisks(requirement, tasks);

    return {
      originalRequirement: requirement,
      tasks,
      estimatedHours,
      priority,
      complexity,
      risks,
    };
  }

  /**
   * 估算工作量
   */
  async estimateWork(requirement: string): Promise<WorkEstimate> {
    const result = await this.analyzeRequirement(requirement);
    
    return {
      hours: result.estimatedHours,
      complexity: result.complexity,
      risks: result.risks,
      recommendations: this.getRecommendations(result),
    };
  }

  /**
   * 建议优先级
   */
  async suggestPriority(requirement: string): Promise<'low' | 'medium' | 'high' | 'critical'> {
    const lower = requirement.toLowerCase();
    
    // 高优先级关键词
    if (lower.includes('漏洞') || lower.includes('安全') || lower.includes('泄露')) {
      return 'critical';
    }
    if (lower.includes('bug') || lower.includes('错误') || lower.includes('修复')) {
      return 'high';
    }
    if (lower.includes('登录') || lower.includes('支付') || lower.includes('核心')) {
      return 'high';
    }
    if (lower.includes('文档') || lower.includes('说明')) {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * 生成任务模板
   */
  async generateTaskTemplate(type: string): Promise<TaskTemplate> {
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('api') || lowerType.includes('后端')) {
      return {
        title: 'RESTful API 开发',
        description: '开发 RESTful 接口',
        type: 'backend',
        estimatedHours: 6,
        priority: 'medium',
      };
    }
    
    if (lowerType.includes('前端') || lowerType.includes('页面') || lowerType.includes('ui')) {
      return {
        title: '前端页面开发',
        description: '开发用户界面',
        type: 'frontend',
        estimatedHours: 8,
        priority: 'medium',
      };
    }
    
    if (lowerType.includes('数据库') || lowerType.includes('db')) {
      return {
        title: '数据库设计',
        description: '设计数据表结构',
        type: 'database',
        estimatedHours: 4,
        priority: 'high',
      };
    }
    
    if (lowerType.includes('测试')) {
      return {
        title: '测试用例编写',
        description: '编写单元测试和集成测试',
        type: 'testing',
        estimatedHours: 6,
        priority: 'medium',
      };
    }
    
    // 默认模板
    return {
      title: '功能开发',
      description: `开发 ${type} 功能`,
      type: 'backend',
      estimatedHours: 8,
      priority: 'medium',
    };
  }

  /**
   * 分解需求为任务
   */
  private decomposeRequirement(requirement: string): TaskTemplate[] {
    const tasks: TaskTemplate[] = [];
    const lower = requirement.toLowerCase();
    
    // 匹配模式
    for (const [keyword, patternTasks] of this.taskPatterns) {
      if (lower.includes(keyword)) {
        tasks.push(...patternTasks);
      }
    }
    
    // 如果没有匹配任何模式，生成通用任务
    if (tasks.length === 0) {
      tasks.push(
        {
          title: '需求分析',
          description: '分析需求细节',
          type: 'backend',
          estimatedHours: 2,
          priority: 'medium',
        },
        {
          title: '数据库设计',
          description: '设计数据模型',
          type: 'database',
          estimatedHours: 3,
          priority: 'high',
        },
        {
          title: '后端开发',
          description: '实现核心业务逻辑',
          type: 'backend',
          estimatedHours: 8,
          priority: 'high',
        },
        {
          title: '前端开发',
          description: '开发用户界面',
          type: 'frontend',
          estimatedHours: 6,
          priority: 'medium',
        },
        {
          title: '测试',
          description: '编写测试用例',
          type: 'testing',
          estimatedHours: 4,
          priority: 'medium',
        }
      );
    }
    
    // 去重
    const uniqueTasks = tasks.filter((task, index, self) =>
      index === self.findIndex(t => t.title === task.title)
    );
    
    return uniqueTasks;
  }

  /**
   * 评估复杂度
   */
  private assessComplexity(requirement: string, tasks: TaskTemplate[]): 'simple' | 'medium' | 'complex' {
    if (tasks.length <= 2) return 'simple';
    if (tasks.length <= 5) return 'medium';
    return 'complex';
  }

  /**
   * 识别风险
   */
  private identifyRisks(requirement: string, tasks: TaskTemplate[]): string[] {
    const risks: string[] = [];
    const lower = requirement.toLowerCase();
    
    if (lower.includes('支付') || lower.includes('钱')) {
      risks.push('涉及资金安全，需要特别注意');
    }
    
    if (lower.includes('第三方') || lower.includes('集成')) {
      risks.push('第三方集成可能存在兼容性问题');
    }
    
    if (tasks.length > 5) {
      risks.push('任务较多，需要分阶段交付');
    }
    
    if (lower.includes('实时') || lower.includes('高并发')) {
      risks.push('性能要求高，需要优化');
    }
    
    return risks;
  }

  /**
   * 获取建议
   */
  private getRecommendations(result: AnalysisResult): string[] {
    const recommendations: string[] = [];
    
    if (result.complexity === 'complex') {
      recommendations.push('建议分阶段交付');
    }
    
    if (result.priority === 'critical') {
      recommendations.push('优先开发核心功能');
    }
    
    if (result.risks.length > 0) {
      recommendations.push('关注风险点，提前准备方案');
    }
    
    return recommendations;
  }
}

export const requirementsAnalyzer = new RequirementsAnalyzer();
