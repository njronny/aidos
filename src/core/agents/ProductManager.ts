import { Agent, AgentType, AgentCapabilities, AgentExecutionResult, AgentStatus } from './Agent';

/**
 * Product Manager - 产品经理代理
 * 负责需求分析、产品规划、用户故事编写
 */
export class ProductManager extends Agent {
  constructor() {
    super(
      'Product Manager',
      AgentType.PRODUCT_MANAGER,
      {
        canDesign: false,
        canDevelop: false,
        canTest: false,
        canAnalyze: true,
        canManage: true,
        canDesignDatabase: false,
        canReview: false,
      }
    );
    this.metadata.role = '产品经理';
    this.metadata.responsibilities = [
      '需求分析与整理',
      '产品规划与Roadmap制定',
      '用户故事编写',
      '产品需求文档(PRD)撰写',
      '优先级排序',
      '用户体验优化',
    ];
  }

  async execute(input: Record<string, unknown>): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    this.status = AgentStatus.BUSY;

    try {
      const action = input.action as string || 'analyze';
      let output = '';

      switch (action) {
        case 'analyze':
          output = await this.analyzeRequirement(input);
          break;
        case 'story':
          output = await this.writeUserStory(input);
          break;
        case 'priority':
          output = await this.prioritizeFeatures(input);
          break;
        case 'roadmap':
          output = await this.createRoadmap(input);
          break;
        case ' PRD':
          output = await this.writePRD(input);
          break;
        default:
          output = await this.analyzeRequirement(input);
      }

      this.status = AgentStatus.IDLE;
      return {
        success: true,
        output,
        data: { action, agentType: this.type },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.status = AgentStatus.ERROR;
      return {
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime,
      };
    }
  }

  private async analyzeRequirement(input: Record<string, unknown>): Promise<string> {
    const requirement = input.requirement as string || '';
    const source = input.source as string || '用户';
    
    const analysis = `
# 需求分析报告

## 原始需求
${requirement}

## 需求来源
${source}

## 分析结果

### 核心功能
1. 用户登录认证
2. 数据CRUD操作
3. 业务逻辑处理

### 用户痛点
- 操作流程繁琐
- 响应速度慢
- 界面不友好

### 边界条件
- 高并发场景
- 数据安全
- 异常处理

### 建议方案
采用敏捷开发方式，分阶段交付：
1. MVP版本: 核心功能
2. 迭代版本: 优化体验

## 结论
需求分析完成，建议进入设计阶段。
    `.trim();

    this.metadata.lastAnalysis = analysis;
    return analysis;
  }

  private async writeUserStory(input: Record<string, unknown>): Promise<string> {
    const feature = input.feature as string || '';
    const user = input.user as string || '用户';
    
    const story = `
# 用户故事

## ${feature}

**作为** ${user}，
**我希望** ${input.want || '实现某功能'}，
**以便** ${input.benefit || '获得某收益'}。

## 验收标准
${input.acceptanceCriteria || `
- [ ] 功能正常运行
- [ ] 响应时间 < 2秒
- [ ] 错误率 < 0.1%
`}

## 优先级
${input.priority || 'P1 - 高'}

## 估算
${input.estimate || '5 个故事点'}
    `.trim();

    this.metadata.lastStory = story;
    return story;
  }

  private async prioritizeFeatures(input: Record<string, unknown>): Promise<string> {
    const features = input.features as string[] || [];
    
    const prioritized = features.map((feature, index) => {
      const priority = index === 0 ? 'P0' : index < 3 ? 'P1' : index < 6 ? 'P2' : 'P3';
      return `${priority}: ${feature}`;
    }).join('\n');

    return `# 功能优先级排序\n\n${prioritized}\n\n**排序依据**: 商业价值、用户影响、技术复杂度`;
  }

  private async createRoadmap(input: Record<string, unknown>): Promise<string> {
    const product = input.product as string || '产品';
    
    const roadmap = `
# 产品路线图 - ${product}

## Q1 (基础功能)
- [ ] 核心功能开发
- [ ] 基础用户界面
- [ ] MVP版本发布

## Q2 (功能完善)
- [ ] 高级功能
- [ ] 性能优化
- [ ] 用户反馈改进

## Q3 (扩展功能)
- [ ] 新业务模块
- [ ] 移动端适配
- [ ] 国际化支持

## Q4 (生态建设)
- [ ] 开放API
- [ ] 第三方集成
- [ ] 企业版功能
    `.trim();

    this.metadata.lastRoadmap = roadmap;
    return roadmap;
  }

  private async writePRD(input: Record<string, unknown>): Promise<string> {
    const product = input.product as string || '';
    
    const prd = `
# 产品需求文档 (PRD)

## 1. 产品概述
### 产品名称: ${product}
### 产品定位: ${input.positioning || '待定'}
### 目标用户: ${input.targetUsers || '待定'}

## 2. 功能需求
### 2.1 核心功能
${input.coreFeatures || '- 功能1\n- 功能2'}

### 2.2 扩展功能
${input.extendedFeatures || '- 功能3\n- 功能4'}

## 3. 非功能需求
- 性能: 响应时间 < 2秒
- 可用性: 99.9% uptime
- 安全: 数据加密传输

## 4. 风险与依赖
${input.risks || '- 技术风险可控\n- 依赖外部服务'}

## 5. 发布计划
${input.releasePlan || '按迭代发布'}
    `.trim();

    this.metadata.lastPRD = prd;
    return prd;
  }
}

export default ProductManager;
