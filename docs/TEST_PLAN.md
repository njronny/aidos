# AIDOS 测试方案

## 1. 测试策略

### 1.1 测试金字塔

```
                    ┌─────────────┐
                    │   E2E 测试   │  ← 少量关键场景
                   ┌──────────────┐ │
                   │  集成测试    │ │ ← 各组件交互
                  ┌───────────────┐│
                  │   单元测试    ││← 基础，覆盖率高
                 ┌────────────────┐│
                 └────────────────┘│
              投资比例: 70%  20%  10%
```

### 1.2 测试类型定义

| 层级 | 测试类型 | 范围 | 覆盖率目标 |
|------|---------|------|-----------|
| 单元测试 | Unit Test | 独立函数/类/模块 | ≥80% |
| 集成测试 | Integration | 组件间接口/数据流 | ≥60% |
| E2E测试 | E2E | 完整工作流 | 关键路径 |
| 性能测试 | Performance | 响应时间/吞吐量 | 基准对比 |
| 安全测试 | Security | 权限/注入/数据泄露 | OWASP Top 10 |

### 1.3 测试环境策略

| 环境 | 用途 | 数据 | 隔离级别 |
|------|------|------|---------|
| dev | 开发调试 | Mock数据 | 完全隔离 |
| staging | 集成测试 | 脱敏生产数据 | 模拟隔离 |
| prod | 最终验收 | 真实数据 | 完全隔离 |

### 1.4 关键测试场景

**P0 - 必须测试**
- 需求解析完整性
- 任务拆分DAG正确性
- Git提交规范合规性
- 自动修复成功率
- 消息通知可达性

**P1 - 重要测试**
- 多代理并行调度
- 上下文注入准确性
- 可视化状态同步
- 错误边界处理

**P2 - 建议测试**
- 性能基线
- 长时间运行稳定性

---

## 2. 测试用例模板

### 2.1 单元测试模板

```typescript
/**
 * 测试用例: [模块名]_[功能名]_[场景描述]
 * 编号: UT-[模块]-[序号]
 * 前置条件: [测试前需要满足的条件]
 * 测试步骤: 
 *   1. [步骤1]
 *   2. [步骤2]
 * 预期结果: [期望的输出或行为]
 */

describe('[测试模块]', () => {
  const [fixture] = setupFixtures();

  beforeEach(() => {
    // 每个用例前准备
  });

  it('UT-[模块]-[序号] should [期望行为]', async () => {
    // Arrange: 准备测试数据
    const input = { ... };
    
    // Act: 执行待测函数
    const result = await moduleUnderTest.method(input);
    
    // Assert: 验证结果
    expect(result).toMatchObject({ 
      status: 'success',
      data: expectedData 
    });
  });

  it('UT-[模块]-[序号] should handle [异常场景]', async () => {
    // 异常场景测试
    await expect(
      moduleUnderTest.method(invalidInput)
    ).rejects.toThrow(ExpectedError);
  });
});
```

### 2.2 集成测试模板

```typescript
/**
 * 测试用例: IT-[组件A]-[组件B]-[场景]
 * 编号: IT-[序号]
 * 测试目的: 验证 [组件A] 与 [组件B] 间的交互
 * 依赖服务: [依赖的服务列表]
 */

describe('IT-[组件交互] 集成测试', () => {
  let mockComponentA: MockComponentA;
  let componentB: ComponentB;
  
  beforeAll(async () => {
    // 启动测试依赖服务
    await TestDatabase.start();
    await TestRedis.start();
  });

  afterAll(async () => {
    await TestDatabase.stop();
    await TestRedis.stop();
  });

  it('IT-[序号] should [端到端场景]', async () => {
    // 完整流程测试
    const request = { 
      type: 'requirement',
      content: '实现用户登录功能'
    };
    
    // 执行完整流程
    const result = await pipeline.execute(request);
    
    // 验证各阶段输出
    expect(result.analysis).toBeDefined();
    expect(result.tasks).toHaveLength(expectedTaskCount);
    expect(result.gitCommits).toHaveLength(expectedCommitCount);
  });
});
```

### 2.3 E2E测试模板

```typescript
/**
 * 测试用例: E2E-[功能模块]-[场景]
 * 编号: E2E-[序号]
 * 测试用户故事: 作为[角色],我希望[功能],以便[价值]
 * 前置条件: [环境/数据要求]
 */

describe('E2E-[功能模块] 端到端测试', () => {
  const testUser = { ... };
  
  beforeAll(() => {
    // 环境准备
    setupTestEnvironment();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  it('E2E-[序号] complete workflow from requirement to git commit', async () => {
    // 场景: 完整流程测试
    
    // Step 1: 输入需求
    const requirement = {
      title: '用户管理系统',
      description: '实现CRUD功能'
    };
    const analysisResult = await aidos.analyze(requirement);
    
    // Step 2: 验证需求分析
    expect(analysisResult.prd).toBeValidPRD();
    expect(analysisResult.risks).toHaveLength(0); // 无高风险
    
    // Step 3: 执行开发流程
    const execution = await aidos.execute(analysisResult.tasks);
    
    // Step 4: 验证结果
    expect(execution.status).toBe('completed');
    expect(execution.gitLog).toContain('[task-1]');
    expect(execution.testResults.passed).toBe(true);
  });
});
```

### 2.4 测试数据管理

```typescript
// fixtures/test-data.ts

export const requirementFixtures = {
  validSimple: {
    title: '计算器应用',
    description: '实现加减乘除功能'
  },
  validComplex: {
    title: '电商系统',
    description: '包含用户、商品、订单模块...',
    constraints: { language: 'TypeScript', framework: 'React' }
  },
  invalid: {
    title: '',  // 空标题
    description: '太短'  // 不符合最小长度
  }
};

export const gitCommitFixtures = {
  validCommit: {
    message: '[task-001] 登录功能 - 实现JWT认证',
    branch: 'feature/user-login'
  }
};
```

---

## 3. 自动化测试框架选型

### 3.1 技术栈对比

| 层级 | 推荐方案 | 备选方案 | 选型理由 |
|------|---------|---------|---------|
| 单元测试 | **Jest** | Vitest, Mocha | 内置Mock/覆盖率/TypeScript原生支持 |
| 集成测试 | **Supertest** + Jest | PactumJS | HTTP接口测试，与单元测试统一 |
| E2E测试 | **Playwright** | Cypress, Puppeteer | 多浏览器/自动等待/平行执行 |
| 性能测试 | **k6** | Locust, Artillery | 脚本友好/云原生/低资源 |
| Mock服务 | **MSW** | Nock, MirageJS | 浏览器+Node双环境 |
| 覆盖率 | **Jest Built-in** | NYC | 零配置集成 |

### 3.2 框架安装配置

```bash
# 核心依赖
npm install --save-dev jest ts-jest @types/jest
npm install --save-dev supertest @types/supertest
npm install --save-dev playwright @playwright/test
npm install --save-dev msw --save
npm install --save-dev k6

# Jest 配置 - jest.config.ts
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### 3.3 测试目录结构

```
tests/
├── unit/                    # 单元测试
│   ├── analyzer/
│   │   ├── requirement-parser.test.ts
│   │   └── risk-detector.test.ts
│   ├── scheduler/
│   │   └── task-dag.test.ts
│   └── gitops/
│       └── commit-validator.test.ts
├── integration/             # 集成测试
│   ├── api/
│   │   └── requirement-api.test.ts
│   └── components/
│       └── analyzer-scheduler.test.ts
├── e2e/                     # 端到端测试
│   ├── workflows/
│   │   └── complete-flow.test.ts
│   └── scenarios/
│       └── auto-fix.test.ts
├── fixtures/                # 测试数据
│   ├── test-data.ts
│   └── mocks/
├── utils/                  # 测试工具
│   ├── setup.ts
│   ├── teardown.ts
│   └── helpers.ts
└── config/                  # 测试配置
    ├── jest.global.ts
    └── playwright.config.ts
```

### 3.4 测试辅助工具

```typescript
// tests/utils/setup.ts

import { GlobalSetup } from './global-setup';

export async function setupTestEnv() {
  // 初始化测试数据库
  await TestDatabase.initialize({
    type: 'sqlite',
    inMemory: true
  });
  
  // 启动Mock服务
  global.mockServer = await MockServer.start(3001);
  
  // 设置环境变量
  process.env.NODE_ENV = 'test';
  process.env.AIDOS_CONFIG = 'test';
}

export async function teardownTestEnv() {
  await TestDatabase.cleanup();
  await MockServer.stop();
}
```

---

## 4. CI 流程设计

### 4.1 GitHub Actions 工作流

```yaml
# .github/workflows/test.yml

name: AIDOS Test Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  # 阶段1: 单元测试 + 覆盖率
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Unit Tests
        run: npm run test:unit -- --coverage
      
      - name: Upload Coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unit_tests
      
      - name: Check Coverage Threshold
        run: |
          npx jest-coverage-threshold --config jest.coverage.json

  # 阶段2: 集成测试
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: unit-tests
    
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
      
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Integration Tests
        run: npm run test:integration
        env:
          REDIS_URL: redis://localhost:6379
          DATABASE_URL: postgres://postgres:test@localhost:5432/aidos_test

  # 阶段3: E2E测试
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: integration-tests
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E Tests
        run: npm run test:e2e
        env:
          E2E_BASE_URL: http://localhost:3000

  # 阶段4: 安全扫描
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run npm audit
        run: npm audit --audit-level=high
      
      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  # 阶段5: 性能基准测试 (可选)
  performance-benchmarks:
    name: Performance Benchmarks
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Run k6 Performance Tests
        run: |
          docker run -i grafana/k6 run - < tests/performance/basic-flow.js
        env:
          K6_OUT_DIR: results

  # 阶段6: 质量门禁汇总
  quality-gate:
    name: Quality Gate
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests, e2e-tests, security-scan]
    if: always()
    
    steps:
      - name: Check Pipeline Status
        run: |
          echo "Unit Tests: ${{ needs.unit-tests.result }}"
          echo "Integration Tests: ${{ needs.integration-tests.result }}"
          echo "E2E Tests: ${{ needs.e2e-tests.result }}"
          echo "Security Scan: ${{ needs.security-scan.result }}"
          
          # 如果任何关键阶段失败，则标记CI失败
          if [[ "${{ needs.unit-tests.result }}" == "failure" ]] || \
             [[ "${{ needs.integration-tests.result }}" == "failure" ]] || \
             [[ "${{ needs.e2e-tests.result }}" == "failure" ]]; then
            exit 1
          fi

  # 阶段7: 测试报告
  test-report:
    name: Generate Test Report
    runs-on: ubuntu-latest
    needs: [quality-gate]
    if: always()
    
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
      
      - name: Merge coverage reports
        run: npx istanbul-merge --out coverage.json coverage/*.json
      
      - name: Generate HTML Report
        run: npx html-coverage-report --input coverage.json --output test-report
      
      - name: Upload Test Report
        uses: actions/upload-artifact@v4
        with:
          name: test-report
          path: test-report/
```

### 4.2 本地开发命令

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:debug": "node --inspect-brk node_modules/.bin/jest",
    "test:ci": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

### 4.3 CI 质量门禁规则

| 检查项 | 阈值 | 阻塞级别 |
|--------|------|---------|
| 单元测试通过率 | 100% | P0 |
| 测试覆盖率 | ≥80% | P0 |
| 集成测试通过率 | 100% | P0 |
| E2E测试通过率 | ≥95% | P1 |
| 安全漏洞 | 0 高危 | P0 |
| 代码风格 | ESLint通过 | P1 |
| 构建时间 | <10分钟 | P2 |

### 4.4 触发规则

| 事件 | 触发测试 | 备注 |
|------|---------|------|
| PR创建/更新 | 单元+集成+E2E | 完整测试 |
| Main分支推送 | 全部测试+安全扫描 | 完整CI |
| 定时(每日) | 全部+性能基准 | 含性能回归 |
| 手动触发 | 可选 | 支持选择测试集 |

---

## 5. 测试矩阵

### 5.1 功能覆盖矩阵

| 功能模块 | 单元测试 | 集成测试 | E2E测试 | 自动化 |
|---------|---------|---------|--------|-------|
| 需求分析器 | ✅ | ✅ | ✅ | ✅ |
| 任务调度器 | ✅ | ✅ | ✅ | ✅ |
| Git管理器 | ✅ | ✅ | ✅ | ✅ |
| 自动修复 | ✅ | ✅ | ✅ | ⚠️ 部分 |
| 上下文管理 | ✅ | ✅ | ⚠️ | ✅ |
| 技能加载器 | ✅ | ✅ | ⚠️ | ✅ |
| 可视化引擎 | ⚠️ | ✅ | ✅ | ⚠️ |
| 消息通知 | ✅ | ✅ | ✅ | ✅ |

---

## 6. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| AI生成代码测试困难 | 中 | 添加回归测试，重点测试边界情况 |
| 并发测试不稳定 | 高 | 使用独立数据库实例，增加重试机制 |
| 外部API Mock不完整 | 中 | 使用实际API的沙箱环境进行E2E测试 |
| 覆盖率过度追求 | 低 | 聚焦关键路径，避免无效测试 |

---

**文档版本**: v1.0  
**创建日期**: 2026-02-13  
**维护人**: QA Engineer
