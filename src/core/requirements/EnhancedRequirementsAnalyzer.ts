/**
 * EnhancedRequirementsAnalyzer - LLM-powered Requirements Analysis
 * 
 * 基于 LLM 的增强需求分析器
 * - 语义理解
 * - 自动生成验收标准
 * - 智能任务拆分
 * - PRD 自动生成
 */

import { LLMService } from '../llm';
import { ChatMessage } from '../llm/types';

export interface Entity {
  name: string;
  type: 'user' | 'object' | 'action' | 'system';
}

export interface LLMAnalysisResult {
  requirement: string;
  intent: string;
  entities: Entity[];
  suggestions: string[];
  confidence: number;
}

export interface AcceptanceCriteria {
  id: string;
  description: string;
  testable: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  testCases?: string[];
}

export interface EnhancedTask {
  title: string;
  description: string;
  type: 'backend' | 'frontend' | 'database' | 'devops' | 'testing' | 'documentation';
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  subtasks?: string[];
  implementationNotes?: string;
  dependencies?: string[];
}

export interface PRD {
  title: string;
  background: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  acceptanceCriteria: AcceptanceCriteria[];
  technicalSuggestions: string[];
  estimatedTimeline: string;
}

export class EnhancedRequirementsAnalyzer {
  private llm: LLMService;
  private criteriaCounter = 0;

  constructor(llm: LLMService) {
    if (!llm) {
      throw new Error('LLM service is required');
    }
    this.llm = llm;
  }

  /**
   * 使用 LLM 进行语义分析
   */
  async analyzeWithLLM(requirement: string): Promise<LLMAnalysisResult> {
    const prompt = `
分析以下需求，提取关键信息：

需求: ${requirement}

请以 JSON 格式返回分析结果：
{
  "intent": "需求的核心意图（简短描述）",
  "entities": [{"name": "实体名", "type": "user|object|action|system"}],
  "suggestions": ["建议1", "建议2"],
  "confidence": 0.0-1.0
}
`;

    const messages: ChatMessage[] = [
      { role: 'system', content: '你是一个专业的需求分析师，擅长理解用户需求并提取关键信息。' },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.llm.chat(messages);
      const parsed = this.parseJSONResponse(response, requirement);
      
      return {
        requirement,
        intent: parsed.intent || this.extractIntent(requirement),
        entities: parsed.entities?.length ? parsed.entities : this.extractEntities(requirement),
        suggestions: parsed.suggestions?.length ? parsed.suggestions : this.extractSuggestions(requirement),
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      // Fallback to rule-based analysis
      return this.fallbackAnalysis(requirement);
    }
  }

  /**
   * 生成验收标准
   */
  async generateAcceptanceCriteria(requirement: string): Promise<AcceptanceCriteria[]> {
    const prompt = `
为以下需求生成可测试的验收标准：

需求: ${requirement}

请以 JSON 数组格式返回，每个元素包含：
{
  "description": "验收条件描述",
  "testable": true/false,
  "priority": "low|medium|high|critical",
  "testCases": ["测试用例1", "测试用例2"]
}
`;

    const messages: ChatMessage[] = [
      { role: 'system', content: '你是一个 QA 专家，擅长生成可测试的验收标准。' },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.llm.chat(messages);
      const parsed = this.parseJSONArrayResponse(response, requirement);
      
      if (!parsed || parsed.length === 0) {
        return this.generateDefaultCriteria(requirement);
      }
      
      return parsed.map((item: any, index: number) => ({
        id: `AC-${String(index + 1).padStart(3, '0')}`,
        description: item.description || '',
        testable: item.testable ?? true,
        priority: item.priority || 'medium',
        testCases: item.testCases || [],
      }));
    } catch (error) {
      // Fallback
      return this.generateDefaultCriteria(requirement);
    }
  }

  /**
   * 增强任务模板
   */
  async enhanceTaskTemplates(
    baseTasks: Array<{ title: string; description: string; type: 'backend' | 'frontend' | 'database' | 'devops' | 'testing' | 'documentation' }>
  ): Promise<EnhancedTask[]> {
    const prompt = `
为以下任务生成详细的子任务和实现注意事项：

任务列表:
${baseTasks.map((t, i) => `${i + 1}. ${t.title} - ${t.description}`).join('\n')}

请以 JSON 数组格式返回：
[{
  "subtasks": ["子任务1", "子任务2"],
  "implementationNotes": "实现注意事项"
}]
`;

    const messages: ChatMessage[] = [
      { role: 'system', content: '你是一个技术架构师，擅长拆分技术任务。' },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.llm.chat(messages);
      const taskContext = baseTasks.map(t => t.title).join(', ');
      const parsed = this.parseJSONArrayResponse(response, taskContext);
      
      if (!parsed || parsed.length === 0) {
        return this.getDefaultEnhancedTasks(baseTasks);
      }
      
      return baseTasks.map((task, index) => ({
        ...task,
        estimatedHours: 4,
        priority: 'medium' as const,
        subtasks: parsed[index]?.subtasks?.length ? parsed[index].subtasks : ['编写代码', '编写单元测试'],
        implementationNotes: parsed[index]?.implementationNotes || '参考现有代码风格',
      }));
    } catch (error) {
      return this.getDefaultEnhancedTasks(baseTasks);
    }
  }

  /**
   * Get default enhanced tasks
   */
  private getDefaultEnhancedTasks(
    baseTasks: Array<{ title: string; description: string; type: 'backend' | 'frontend' | 'database' | 'devops' | 'testing' | 'documentation' }>
  ): EnhancedTask[] {
    return baseTasks.map(task => ({
      ...task,
      estimatedHours: 4,
      priority: 'medium' as const,
      subtasks: ['编写代码', '编写单元测试'],
      implementationNotes: '参考现有代码风格',
    }));
  }

  /**
   * 生成完整 PRD
   */
  async generatePRD(requirement: string): Promise<PRD> {
    const analysis = await this.analyzeWithLLM(requirement);
    const criteria = await this.generateAcceptanceCriteria(requirement);

    const prompt = `
基于以下需求生成产品需求文档：

需求: ${requirement}
分析结果: ${analysis.intent}
实体: ${analysis.entities.map(e => e.name).join(', ')}

请生成：
{
  "title": "产品标题",
  "background": "背景描述",
  "functionalRequirements": ["功能需求1", "功能需求2"],
  "nonFunctionalRequirements": ["非功能需求1", "非功能需求2"],
  "technicalSuggestions": ["技术建议1", "技术建议2"],
  "estimatedTimeline": "预计时间"
}
`;

    const messages: ChatMessage[] = [
      { role: 'system', content: '你是一个产品经理，擅长编写 PRD。' },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.llm.chat(messages);
      const parsed = this.parseJSONResponse(response, requirement);
      
      // Get nonFunctionalRequirements from parsed or generate based on requirement
      const nfr = parsed.nonFunctionalRequirements?.length 
        ? parsed.nonFunctionalRequirements 
        : this.extractNonFunctionalRequirements(requirement);
      
      return {
        title: parsed.title || requirement,
        background: parsed.background || '',
        functionalRequirements: parsed.functionalRequirements || [],
        nonFunctionalRequirements: nfr,
        acceptanceCriteria: criteria,
        technicalSuggestions: parsed.technicalSuggestions || [],
        estimatedTimeline: parsed.estimatedTimeline || '待评估',
      };
    } catch (error) {
      return {
        title: requirement,
        background: '待补充',
        functionalRequirements: [],
        nonFunctionalRequirements: this.extractNonFunctionalRequirements(requirement),
        acceptanceCriteria: criteria,
        technicalSuggestions: [],
        estimatedTimeline: '待评估',
      };
    }
  }

  /**
   * Extract non-functional requirements from text
   */
  private extractNonFunctionalRequirements(text: string): string[] {
    const requirements: string[] = [];
    if (text.includes('高并发') || text.includes('性能')) {
      requirements.push('性能要求：支持高并发访问');
    }
    if (text.includes('安全') || text.includes('支付')) {
      requirements.push('安全性要求：确保数据安全');
    }
    if (text.includes('实时') || text.includes('聊天')) {
      requirements.push('实时性要求：低延迟响应');
    }
    if (requirements.length === 0) {
      requirements.push('性能要求', '安全性要求');
    }
    return requirements;
  }

  /**
   * 解析 JSON 响应
   */
  private parseJSONResponse(response: string, requirement?: string): any {
    try {
      // Try to find JSON in response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Ignore parsing errors
    }
    // Return empty result, let caller handle fallback
    return {};
  }

  /**
   * 解析 JSON 数组响应
   */
  private parseJSONArrayResponse(response: string, context?: string): any[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Ignore parsing errors
    }
    // Return default based on context
    return this.generateDefaultsFromText(context || response);
  }

  /**
   * 从文本提取意图
   */
  private extractIntent(text: string): string {
    if (text.includes('登录') || text.includes('注册')) return '用户认证';
    if (text.includes('订单') || text.includes('购买')) return '交易处理';
    if (text.includes('支付')) return '支付处理';
    if (text.includes('图书') || text.includes('商品')) return '商品管理';
    return '功能开发';
  }

  /**
   * 从文本提取实体
   */
  private extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];
    const entityMap: Record<string, Entity> = {
      '用户': { name: '用户', type: 'user' },
      '订单': { name: '订单', type: 'object' },
      '商品': { name: '商品', type: 'object' },
      '图书': { name: '图书', type: 'object' },
      '购物车': { name: '购物车', type: 'object' },
      '支付': { name: '支付', type: 'action' },
      '任务': { name: '任务', type: 'object' },
    };

    // Check original requirement text (passed in analyzeWithLLM)
    // For now, always return something based on keywords
    const combinedText = text.toLowerCase();
    
    for (const [key, entity] of Object.entries(entityMap)) {
      if (combinedText.includes(key)) {
        entities.push(entity);
      }
    }
    
    // If no entities found, add a default one based on context
    if (entities.length === 0) {
      entities.push({ name: '系统', type: 'system' });
    }
    
    return entities;
  }

  /**
   * 从文本提取建议
   */
  private extractSuggestions(text: string): string[] {
    const suggestions: string[] = [];
    if (text.includes('电商') || text.includes('购物')) {
      suggestions.push('考虑性能优化');
      suggestions.push('安全支付集成');
    }
    if (text.includes('用户')) {
      suggestions.push('用户权限管理');
    }
    if (suggestions.length === 0) {
      suggestions.push('建议详细描述需求');
    }
    return suggestions;
  }

  /**
   * 从文本生成默认值
   */
  private generateDefaultsFromText(text: string): any[] {
    if (text.includes('验收') || text.includes('测试')) {
      return [
        {
          description: '功能正常运行',
          testable: true,
          priority: 'high',
          testCases: ['功能测试'],
        },
      ];
    }
    if (text.includes('任务') || text.includes('API')) {
      return [
        { subtasks: ['设计接口', '实现逻辑', '编写测试'], implementationNotes: '' },
      ];
    }
    return [];
  }

  /**
   * 回退分析（基于规则）
   */
  private fallbackAnalysis(requirement: string): LLMAnalysisResult {
    const entities = this.extractEntities(requirement);
    
    return {
      requirement,
      intent: this.extractIntent(requirement),
      entities,
      suggestions: this.extractSuggestions(requirement),
      confidence: 0.3,
    };
  }

  /**
   * 生成默认验收标准
   */
  private generateDefaultCriteria(requirement: string): AcceptanceCriteria[] {
    return [
      {
        id: `AC-${String(++this.criteriaCounter).padStart(3, '0')}`,
        description: `${requirement}功能正常`,
        testable: true,
        priority: 'medium',
        testCases: ['功能测试'],
      },
    ];
  }
}

export default EnhancedRequirementsAnalyzer;
