import { Agent, AgentType, AgentCapabilities, AgentExecutionResult, AgentStatus } from './Agent';

/**
 * Full Stack Developer - 全栈开发工程师代理
 * 负责前后端开发、API实现、功能开发
 */
export class FullStackDeveloper extends Agent {
  constructor() {
    super(
      'Full Stack Developer',
      AgentType.FULL_STACK_DEVELOPER,
      {
        canDesign: false,
        canDevelop: true,
        canTest: true,
        canAnalyze: false,
        canManage: false,
        canDesignDatabase: false,
        canReview: true,
        supportedLanguages: ['TypeScript', 'JavaScript', 'Python', 'Go'],
        supportedFrameworks: ['React', 'Vue', 'NestJS', 'Express', 'Next.js'],
      }
    );
    this.metadata.role = '全栈开发工程师';
    this.metadata.responsibilities = [
      '前端界面开发',
      '后端API开发',
      '数据库操作',
      '功能实现',
      '代码审查',
      'Bug修复',
    ];
  }

  async execute(input: Record<string, unknown>): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    this.status = AgentStatus.BUSY;

    try {
      const action = input.action as string || 'develop';
      let output = '';

      switch (action) {
        case 'develop':
        case 'implement':
          output = await this.developFeature(input);
          break;
        case 'api':
          output = await this.createAPI(input);
          break;
        case 'frontend':
          output = await this.developFrontend(input);
          break;
        case 'backend':
          output = await this.developBackend(input);
          break;
        case 'refactor':
          output = await this.refactorCode(input);
          break;
        default:
          output = await this.developFeature(input);
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

  private async developFeature(input: Record<string, unknown>): Promise<string> {
    const featureName = input.featureName as string || '新功能';
    const description = input.description as string || '';
    
    const result = `
# 功能开发: ${featureName}

## 需求描述
${description}

## 开发计划

### 1. 前端开发
- [ ] 创建组件 \`${this.toComponentName(featureName)}\`
- [ ] 实现页面布局
- [ ] 添加状态管理
- [ ] 实现交互逻辑

### 2. 后端开发
- [ ] 设计API接口
- [ ] 实现业务逻辑
- [ ] 数据库操作
- [ ] 错误处理

### 3. 接口设计
\`\`\`typescript
// API: POST /api/${this.toKebabCase(featureName)}
interface ${this.toPascalCase(featureName)}Request {
  // 请求参数
}

interface ${this.toPascalCase(featureName)}Response {
  // 响应数据
}
\`\`\`

### 4. 数据库设计（如需要）
\`\`\`sql
-- 表名: ${this.toSnakeCase(featureName)}
CREATE TABLE ${this.toSnakeCase(featureName)} (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

## 代码示例
\`\`\`typescript
// ${featureName}服务
export class ${this.toPascalCase(featureName)}Service {
  async create(data: ${this.toPascalCase(featureName)}Request): Promise<${this.toPascalCase(featureName)}Response> {
    // 实现逻辑
    return { success: true, data };
  }
}
\`\`\`

## 完成标准
- [ ] 代码编写完成
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 代码审查通过
    `.trim();

    this.metadata.lastFeature = featureName;
    return result;
  }

  private async createAPI(input: Record<string, unknown>): Promise<string> {
    const endpoint = input.endpoint as string || '/api/resource';
    const method = input.method as string || 'POST';
    const params = input.params as Record<string, string> || {};
    
    const apiDoc = `
# API创建: ${method} ${endpoint}

## 接口定义

### 请求
\`\`\`http
${method} ${endpoint}
Content-Type: application/json

${JSON.stringify(params, null, 2)}
\`\`\`

### 响应
\`\`\`json
{
  "success": true,
  "data": {
    "id": "xxx",
    "message": "操作成功"
  },
  "error": null
}
\`\`\`

## 错误码
| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未授权 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

## 后端实现
\`\`\`typescript
// ${endpoint} 处理器
router.${method.toLowerCase()}('${endpoint}', async (req, res) => {
  try {
    const result = await ${this.toCamelCase(endpoint.split('/').pop() || 'handler')}(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
\`\`\`
    `.trim();

    this.metadata.lastAPI = endpoint;
    return apiDoc;
  }

  private async developFrontend(input: Record<string, unknown>): Promise<string> {
    const componentName = input.componentName as string || 'Component';
    const framework = input.framework as string || 'React';
    
    const code = `
# 前端开发: ${componentName}

## 技术栈
- 框架: ${framework}
- 样式: CSS Modules / Tailwind
- 状态: Zustand / Context

## 组件代码
\`\`\`${framework === 'Vue' ? 'vue' : 'tsx'}
import React, { useState, useEffect } from 'react';
import styles from './${componentName}.module.css';

interface ${componentName}Props {
  // Props定义
}

export const ${componentName}: React.FC<${componentName}Props> = ({}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/${this.toKebabCase(componentName)}');
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2>${componentName}</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {data.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
\`\`\`

## 样式
\`\`\`css
.container {
  padding: 16px;
  background: #fff;
  border-radius: 8px;
}
\`\`\`

## 测试
\`\`\`typescript
import { render, screen } from '@testing-library/react';
import { ${componentName} } from './${componentName}';

test('renders ${componentName}', () => {
  render(<${componentName} />);
  expect(screen.getByText('${componentName}')).toBeInTheDocument();
});
\`\`\`
    `.trim();

    return code;
  }

  private async developBackend(input: Record<string, unknown>): Promise<string> {
    const moduleName = input.moduleName as string || 'Module';
    const language = input.language as string || 'TypeScript';
    
    const code = `
# 后端开发: ${moduleName}

## 技术栈
- 语言: ${language}
- 框架: NestJS / Express
- ORM: Prisma
- 验证: Zod / Joi

## 模块结构
\`\`\`
src/
├── ${this.toKebabCase(moduleName)}/
│   ├── ${this.toKebabCase(moduleName)}.controller.ts
│   ├── ${this.toKebabCase(moduleName)}.service.ts
│   ├── ${this.toKebabCase(moduleName)}.module.ts
│   ├── dto/
│   │   ├── create-${this.toKebabCase(moduleName)}.dto.ts
│   │   └── update-${this.toKebabCase(moduleName)}.dto.ts
│   └── entities/
│       └── ${this.toKebabCase(moduleName)}.entity.ts
\`\`\`

## Controller
\`\`\`typescript
@Controller('${this.toKebabCase(moduleName)}')
export class ${moduleName}Controller {
  constructor(private readonly ${this.toCamelCase(moduleName)}Service: ${moduleName}Service) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() createDto: Create${moduleName}Dto) {
    return this.${this.toCamelCase(moduleName)}Service.create(createDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Query() query: PaginationQuery) {
    return this.${this.toCamelCase(moduleName)}Service.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.${this.toCamelCase(moduleName)}Service.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: Update${moduleName}Dto) {
    return this.${this.toCamelCase(moduleName)}Service.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.${this.toCamelCase(moduleName)}Service.remove(id);
  }
}
\`\`\`

## Service
\`\`\`typescript
@Injectable()
export class ${moduleName}Service {
  constructor(private prisma: PrismaService) {}

  async create(data: Create${moduleName}Dto) {
    return this.prisma.${this.toCamelCase(moduleName)}.create({ data });
  }

  async findAll(query: PaginationQuery) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.prisma.${this.toCamelCase(moduleName)}.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.${this.toCamelCase(moduleName)}.count(),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    return this.prisma.${this.toCamelCase(moduleName)}.findUnique({ where: { id } });
  }

  async update(id: string, data: Update${moduleName}Dto) {
    return this.prisma.${this.toCamelCase(moduleName)}.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.${this.toCamelCase(moduleName)}.delete({ where: { id } });
  }
}
\`\`\`
    `.trim();

    return code;
  }

  private async refactorCode(input: Record<string, unknown>): Promise<string> {
    const target = input.target as string || '代码';
    
    return `
# 代码重构: ${target}

## 重构目标
- 提高代码可读性
- 消除代码异味
- 改善性能
- 便于维护

## 重构策略

### 1. 提取重复代码
将重复的业务逻辑提取到独立函数

### 2. 简化条件表达式
使用早返回、策略模式等简化复杂条件

### 3. 重构大函数
将大函数拆分为多个小函数，每个函数只做一件事

### 4. 优化类结构
- 遵循单一职责原则
- 减少类之间的耦合
- 使用依赖注入

## 示例
\`\`\`typescript
// Before
function calculate(a, b, type) {
  if (type === 'add') return a + b;
  if (type === 'sub') return a - b;
  if (type === 'mul') return a * b;
  if (type === 'div') return a / b;
  return 0;
}

// After
const operations = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => b !== 0 ? a / b : 0,
};

function calculate(a, b, type) {
  return operations[type]?.(a, b) ?? 0;
}
\`\`\`

## 验证
- [ ] 所有测试通过
- [ ] 功能行为保持一致
- [ ] 代码审查通过
    `.trim();
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

  private toSnakeCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/\s+/g, '_').toLowerCase();
  }

  private toComponentName(str: string): string {
    return this.toPascalCase(str);
  }
}

export default FullStackDeveloper;
