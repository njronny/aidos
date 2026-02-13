import { Agent, AgentType, AgentCapabilities, AgentExecutionResult, AgentStatus } from './Agent';

/**
 * QA Engineer - QA工程师代理
 * 负责测试计划、测试用例编写、测试执行、缺陷跟踪
 */
export class QAEngineer extends Agent {
  constructor() {
    super(
      'QA Engineer',
      AgentType.QA_ENGINEER,
      {
        canDesign: false,
        canDevelop: false,
        canTest: true,
        canAnalyze: true,
        canManage: false,
        canDesignDatabase: false,
        canReview: true,
      }
    );
    this.metadata.role = 'QA测试工程师';
    this.metadata.responsibilities = [
      '测试计划制定',
      '测试用例编写',
      '功能测试执行',
      '性能测试',
      '自动化测试',
      '缺陷跟踪与管理',
      '测试报告编写',
    ];
  }

  async execute(input: Record<string, unknown>): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    this.status = AgentStatus.BUSY;

    try {
      const action = input.action as string || 'test';
      let output = '';

      switch (action) {
        case 'plan':
          output = await this.createTestPlan(input);
          break;
        case 'case':
          output = await this.writeTestCases(input);
          break;
        case 'execute':
          output = await this.executeTests(input);
          break;
        case 'report':
          output = await this.generateTestReport(input);
          break;
        case 'automate':
          output = await this.createAutomationTests(input);
          break;
        case 'defect':
          output = await this.trackDefects(input);
          break;
        default:
          output = await this.createTestPlan(input);
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

  private async createTestPlan(input: Record<string, unknown>): Promise<string> {
    const projectName = input.projectName as string || '项目';
    const version = input.version as string || 'v1.0';
    
    const plan = `
# 测试计划 - ${projectName} ${version}

## 1. 测试目标
确保${projectName}的功能、性能和可靠性符合需求规格说明书的要求。

## 2. 测试范围

### 功能测试
- [ ] 核心业务流程
- [ ] 用户界面交互
- [ ] 数据处理逻辑
- [ ] 接口功能

### 非功能测试
- [ ] 性能测试 (响应时间、并发)
- [ ] 安全测试 (身份认证、权限控制)
- [ ] 兼容性测试 (浏览器、设备)
- [ ] 可用性测试

## 3. 测试策略

### 测试方法
- 黑盒测试: 基于需求规格
- 白盒测试: 代码逻辑覆盖
- 灰盒测试: 接口与数据

### 测试类型
| 类型 | 优先级 | 备注 |
|------|--------|------|
| 功能测试 | P0 | 必须通过 |
| 集成测试 | P1 | 必须通过 |
| 回归测试 | P1 | 每次发布前 |
| 性能测试 | P2 | 关键路径 |
| 安全测试 | P2 | 敏感功能 |

## 4. 测试资源

### 人力资源
- 测试负责人: 1人
- 功能测试工程师: 2人
- 自动化测试工程师: 1人

### 环境资源
- 测试环境: test.${projectName}.com
- 预发布环境: pre.${projectName}.com
- 测试数据: 模拟数据1000条

## 5. 测试时间线

| 阶段 | 开始 | 结束 | 负责人 |
|------|------|------|--------|
| 测试计划 | Day 1 | Day 2 | QA Lead |
| 用例编写 | Day 3 | Day 7 | QA Team |
| 功能测试 | Day 8 | Day 14 | QA Team |
| 集成测试 | Day 15 | Day 17 | QA Team |
| 回归测试 | Day 18 | Day 20 | QA Team |
| 测试报告 | Day 21 | Day 21 | QA Lead |

## 6. 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 需求变更 | 中 | 及时更新用例 |
| 环境不稳定 | 高 | 准备备用环境 |
| 时间紧迫 | 中 | 优先测试核心功能 |
    `.trim();

    this.metadata.lastTestPlan = plan;
    return plan;
  }

  private async writeTestCases(input: Record<string, unknown>): Promise<string> {
    const featureName = input.featureName as string || '功能模块';
    const testType = input.testType as string || 'functional';
    
    const cases = `
# 测试用例 - ${featureName}

## 用例汇总
- 总用例数: 20
- 功能用例: 15
- 边界用例: 3
- 异常用例: 2

## 功能测试用例

### TC001: 正常流程
| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 输入有效数据 | 数据验证通过 |
| 2 | 点击提交按钮 | 提交成功提示 |
| 3 | 查看结果列表 | 新数据已添加 |

### TC002: 数据验证
| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 输入空数据 | 提示"字段不能为空" |
| 2 | 输入格式错误 | 提示具体错误信息 |
| 3 | 输入超长内容 | 提示"超过最大长度" |

### TC003: 边界条件
| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 输入最小值 | 验证通过 |
| 2 | 输入最大值 | 验证通过 |
| 3 | 输入最大值+1 | 提示超出范围 |

## ${testType === 'api' ? 'API测试用例' : 'UI测试用例'}

\`\`\`typescript
// 自动化测试用例示例
describe('${featureName}', () => {
  it('should work correctly', async () => {
    const result = await ${this.toCamelCase(featureName)}Service.process({
      // 测试数据
    });
    expect(result.success).toBe(true);
  });

  it('should handle errors', async () => {
    await expect(
      ${this.toCamelCase(featureName)}Service.process({})
    ).rejects.toThrow();
  });
});
\`\`\`

## 测试数据
| 场景 | 输入数据 | 预期结果 |
|------|----------|----------|
| 正常 | {name: "test", value: 100} | 成功 |
| 空值 | {name: "", value: 100} | 失败 |
| 负数 | {name: "test", value: -1} | 失败 |
| 边界 | {name: "a".repeat(100), value: 999999} | 成功/失败 |
    `.trim();

    this.metadata.lastTestCases = cases;
    return cases;
  }

  private async executeTests(input: Record<string, unknown>): Promise<string> {
    const testType = input.testType as string || 'functional';
    const environment = input.environment as string || '测试环境';
    
    const result = `
# 测试执行报告

## 测试环境
- 环境: ${environment}
- 版本: ${input.version || 'v1.0.0'}
- 执行时间: ${new Date().toLocaleString()}

## 执行摘要

| 指标 | 数量 | 占比 |
|------|------|------|
| 总用例数 | 50 | 100% |
| 通过 | 45 | 90% |
| 失败 | 3 | 6% |
| 阻塞 | 2 | 4% |
| 通过率 | 90% | - |

## 测试详情

### 功能测试
| 用例ID | 用例名称 | 状态 | 缺陷ID |
|--------|----------|------|--------|
| TC001 | 正常流程 | ✅ 通过 | - |
| TC002 | 数据验证 | ✅ 通过 | - |
| TC003 | 边界条件 | ❌ 失败 | BUG-001 |
| TC004 | 异常处理 | ✅ 通过 | - |

### 接口测试
| 接口 | 方法 | 状态 | 响应时间 |
|------|------|------|----------|
| /api/users | GET | ✅ | 120ms |
| /api/users | POST | ✅ | 200ms |
| /api/login | POST | ❌ | 500ms |

## 缺陷汇总

### 严重缺陷 (S1)
- [ ] BUG-001: 提交表单闪退 - 开发中
- [ ] BUG-002: 数据导出失败 - 待处理

### 一般缺陷 (S2)
- [ ] BUG-003: 提示信息不准确 - 待处理

## 结论
**测试状态**: ${input.status || '进行中'}

${(input.passRate as number || 90) >= 90 ? '✅ 通过，可以进入下一阶段' : '❌ 未通过，需修复后重新测试'}
    `.trim();

    this.metadata.lastExecution = result;
    return result;
  }

  private async generateTestReport(input: Record<string, unknown>): Promise<string> {
    const projectName = input.projectName as string || '项目';
    
    return `
# 测试报告 - ${projectName}

## 执行概述
- 测试周期: ${input.testCycle || '2024-Q1'}
- 测试类型: ${input.testType || '完整测试'}
- 总耗时: ${input.totalHours || '40'} 小时

## 质量指标

| 指标 | 目标 | 实际 | 状态 |
|------|------|------|------|
| 测试覆盖率 | ≥80% | ${input.coverage || '85%'} | ✅ |
| 缺陷修复率 | ≥95% | ${input.fixRate || '92%'} | ⚠️ |
| 测试通过率 | ≥90% | ${input.passRate || '95%'} | ✅ |
| 阻塞缺陷数 | 0 | ${input.blockingBugs || '1'} | ⚠️ |

## 缺陷统计

### 按严重程度
- S1 (严重): ${input.s1Count || 2} 个
- S2 (一般): ${input.s2Count || 5} 个
- S3 (轻微): ${input.s3Count || 8} 个

### 按模块分布
- 用户模块: 5 个
- 订单模块: 3 个
- 支付模块: 4 个
- 其他: 3 个

## 测试风险
1. ⚠️ 第三方接口不稳定
2. ⚠️ 性能测试资源有限

## 建议
1. 建议增加自动化测试覆盖率到90%
2. 建议进行安全扫描
3. 建议进行性能压测

## 最终结论
**${input.conclusion || '测试通过，可以发布'}**
    `.trim();
  }

  private async createAutomationTests(input: Record<string, unknown>): Promise<string> {
    const featureName = input.featureName as string || 'Feature';
    const framework = input.framework as string || 'Jest';
    
    return `
# 自动化测试 - ${featureName}

## 测试框架
- 单元测试: ${framework}
- E2E测试: Playwright / Cypress
- API测试: SuperTest

## 项目结构
\`\`\`
tests/
├── unit/
│   └── ${this.toKebabCase(featureName)}.test.ts
├── integration/
│   └── ${this.toKebabCase(featureName)}.integration.test.ts
└── e2e/
    └── ${this.toKebabCase(featureName)}.spec.ts
\`\`\`

## 单元测试示例
\`\`\`typescript
// ${featureName}.test.ts
import { ${this.toPascalCase(featureName)}Service } from './${this.toPascalCase(featureName)}Service';

describe('${this.toPascalCase(featureName)}Service', () => {
  let service: ${this.toPascalCase(featureName)}Service;

  beforeEach(() => {
    service = new ${this.toPascalCase(featureName)}Service();
  });

  describe('process', () => {
    it('should process valid input', async () => {
      const input = { name: 'test', value: 100 };
      const result = await service.process(input);
      expect(result.success).toBe(true);
    });

    it('should throw on invalid input', async () => {
      await expect(service.process({})).rejects.toThrow();
    });
  });
});
\`\`\`

## E2E测试示例
\`\`\`typescript
// ${featureName}.spec.ts
import { test, expect } from '@playwright/test';

test('${featureName} flow', async ({ page }) => {
  await page.goto('/${this.toKebabCase(featureName)}');
  await page.fill('#name', 'test');
  await page.click('#submit');
  await expect(page.locator('.success')).toBeVisible();
});
\`\`\`

## 运行命令
\`\`\`bash
# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行E2E测试
npm run test:e2e

# 运行所有测试
npm test

# 生成覆盖率报告
npm run test:coverage
\`\`\`

## 覆盖率目标
- 行覆盖率: ≥80%
- 分支覆盖率: ≥70%
- 函数覆盖率: ≥80%
    `.trim();
  }

  private async trackDefects(input: Record<string, unknown>): Promise<string> {
    const defects = input.defects as Array<{id: string, title: string, status: string}> || [];
    
    const tracking = `
# 缺陷跟踪

## 当前状态

| 状态 | 数量 |
|------|------|
| 新建 | ${defects.filter(d => d.status === 'new').length || 1} |
| 进行中 | ${defects.filter(d => d.status === 'in_progress').length || 2} |
| 已修复 | ${defects.filter(d => d.status === 'fixed').length || 10} |
| 已关闭 | ${defects.filter(d => d.status === 'closed').length || 8} |

## 缺陷列表

### 待处理
| ID | 标题 | 严重程度 | 模块 |
|----|------|----------|------|
| BUG-001 | 提交闪退 | S1 | 前端 |
| BUG-002 | 数据丢失 | S1 | 后端 |

### 进行中
| ID | 标题 | 严重程度 | 模块 |
|----|------|----------|------|
| BUG-003 | 界面错位 | S2 | 前端 |

### 已修复
| ID | 标题 | 修复版本 |
|----|------|----------|
| BUG-004 | 登录超时 | v1.0.1 |
| BUG-005 | 导出失败 | v1.0.1 |

## 缺陷模板
\`\`\`
## BUG-XXX: [标题]

### 环境
- 版本:
- 浏览器:
- 操作系统:

### 重现步骤
1. 步骤1
2. 步骤2
3. 步骤3

### 预期结果
[描述预期行为]

### 实际结果
[描述实际行为]

### 严重程度
- [ ] S1 - 系统崩溃
- [ ] S2 - 功能失败
- [ ] S3 - UI问题

### 优先级
- [ ] P0 - 立即处理
- [ ] P1 - 本周处理
- [ ] P2 - 下周处理
\`\`\`
    `.trim();

    return tracking;
  }

  // 命名转换辅助方法
  private toPascalCase(str: string): string {
    return str.replace(/(\w)(\w*)/g, (_, a, b) => a.toUpperCase() + b.toLowerCase()).replace(/\s/g, '');
  }

  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase();
  }
}

export default QAEngineer;
