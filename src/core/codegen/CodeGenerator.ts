/**
 * CodeGenerator - AI-powered Code Generation
 * 
 * 基于 LLM 的代码生成器
 */

import { LLMService } from '../llm';
import { ChatMessage } from '../llm/types';

export interface CodeFile {
  path: string;
  content: string;
}

export interface GeneratedCode {
  files: CodeFile[];
  language: string;
  framework?: string;
}

export interface CodeTemplate {
  name: string;
  language: string;
  files: CodeFile[];
}

export interface APISpec {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  requestBody?: Record<string, any>;
  response?: Record<string, any>;
}

export interface ComponentSpec {
  name: string;
  props: string[];
  description: string;
  framework?: 'react' | 'vue' | 'angular';
}

export interface EntitySpec {
  name: string;
  fields: string[];
}

export interface SchemaSpec {
  entities: EntitySpec[];
  database?: 'postgresql' | 'mysql' | 'sqlite';
}

export class CodeGenerator {
  private llm: LLMService;

  constructor(llm: LLMService) {
    if (!llm) {
      throw new Error('LLM service is required');
    }
    this.llm = llm;
  }

  /**
   * 从描述生成代码
   */
  async generateFromDescription(
    description: string,
    language: string = 'typescript'
  ): Promise<GeneratedCode> {
    const prompt = `
生成 ${language} 代码：

需求描述: ${description}

请生成完整的代码文件，以 JSON 格式返回：
{
  "files": [{"path": "文件名", "content": "代码内容"}],
  "language": "${language}"
}
`;

    const messages: ChatMessage[] = [
      { role: 'system', content: `你是一个专业的 ${language} 开发者，擅长生成高质量代码。` },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.llm.chat(messages);
      const parsed = this.parseCodeResponse(response);
      
      return {
        files: parsed.files || [{ path: 'main.ts', content: response }],
        language: parsed.language || language,
        framework: parsed.framework,
      };
    } catch (error) {
      return this.generateDefaultCode(description, language);
    }
  }

  /**
   * 生成 REST API
   */
  async generateAPI(spec: APISpec): Promise<GeneratedCode> {
    const prompt = `
生成 REST API 代码：

- 路径: ${spec.path}
- 方法: ${spec.method}
- 描述: ${spec.description}
${spec.requestBody ? `- 请求体: ${JSON.stringify(spec.requestBody)}` : ''}

请生成 TypeScript/Node.js 代码，以 JSON 格式返回：
{
  "files": [
    {"path": "routes.ts", "content": "路由代码"},
    {"path": "controller.ts", "content": "控制器代码"},
    {"path": "types.ts", "content": "类型定义"}
  ],
  "language": "typescript",
  "framework": "express"
}
`;

    const messages: ChatMessage[] = [
      { role: 'system', content: '你是一个后端开发专家，擅长生成 REST API 代码。' },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.llm.chat(messages);
      const parsed = this.parseCodeResponse(response);
      
      return {
        files: parsed.files || this.generateDefaultAPI(spec),
        language: 'typescript',
        framework: 'express',
      };
    } catch (error) {
      return {
        files: this.generateDefaultAPI(spec),
        language: 'typescript',
        framework: 'express',
      };
    }
  }

  /**
   * 生成 UI 组件
   */
  async generateComponent(spec: ComponentSpec): Promise<GeneratedCode> {
    const framework = spec.framework || 'react';
    
    const prompt = `
生成 ${framework} 组件：

- 组件名: ${spec.name}
- Props: ${spec.props.join(', ')}
- 描述: ${spec.description}

请生成代码，以 JSON 格式返回：
{
  "files": [{"path": "${spec.name}.tsx", "content": "组件代码"}],
  "language": "typescript",
  "framework": "${framework}"
}
`;

    const messages: ChatMessage[] = [
      { role: 'system', content: `你是一个 ${framework} 开发专家，擅长生成组件代码。` },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.llm.chat(messages);
      const parsed = this.parseCodeResponse(response);
      
      return {
        files: parsed.files || this.generateDefaultComponent(spec),
        language: 'typescript',
        framework,
      };
    } catch (error) {
      return {
        files: this.generateDefaultComponent(spec),
        language: 'typescript',
        framework,
      };
    }
  }

  /**
   * 生成数据库 Schema
   */
  async generateDatabaseSchema(spec: SchemaSpec): Promise<GeneratedCode> {
    const db = spec.database || 'postgresql';
    
    const prompt = `
生成 ${db} 数据库 Schema：

实体:
${spec.entities.map(e => `- ${e.name}: ${e.fields.join(', ')}`).join('\n')}

请生成 SQL 代码，以 JSON 格式返回：
{
  "files": [{"path": "schema.sql", "content": "SQL代码"}],
  "language": "sql"
}
`;

    const messages: ChatMessage[] = [
      { role: 'system', content: '你是一个数据库专家，擅长设计数据库表结构。' },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.llm.chat(messages);
      const parsed = this.parseCodeResponse(response);
      
      return {
        files: parsed.files || this.generateDefaultSchema(spec),
        language: 'sql',
      };
    } catch (error) {
      return {
        files: this.generateDefaultSchema(spec),
        language: 'sql',
      };
    }
  }

  /**
   * 生成测试代码
   */
  async generateTest(
    code: string,
    type: 'unit' | 'integration' | 'e2e' = 'unit'
  ): Promise<GeneratedCode> {
    const testFramework = type === 'e2e' ? 'playwright' : 'jest';
    
    const prompt = `
生成 ${testFramework} ${type} 测试代码：

被测代码:
\`\`\`
${code}
\`\`\`

请生成测试代码，以 JSON 格式返回：
{
  "files": [{"path": "code.test.ts", "content": "测试代码"}],
  "language": "typescript"
}
`;

    const messages: ChatMessage[] = [
      { role: 'system', content: `你是一个 QA 专家，擅长编写 ${testFramework} 测试。` },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.llm.chat(messages);
      const parsed = this.parseCodeResponse(response);
      
      return {
        files: parsed.files || this.generateDefaultTest(code, type),
        language: 'typescript',
      };
    } catch (error) {
      return {
        files: this.generateDefaultTest(code, type),
        language: 'typescript',
      };
    }
  }

  /**
   * 重构代码
   */
  async refactorCode(code: string, language: string): Promise<string> {
    const prompt = `
重构以下 ${language} 代码，改善代码质量和可读性：

\`\`\`
${code}
\`\`\`

请只返回重构后的代码，不需要解释。
`;

    const messages: ChatMessage[] = [
      { role: 'system', content: `你是一个 ${language} 代码重构专家。` },
      { role: 'user', content: prompt },
    ];

    try {
      return await this.llm.chat(messages);
    } catch (error) {
      return code;
    }
  }

  /**
   * 解析代码响应
   */
  private parseCodeResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Ignore
    }
    return {};
  }

  /**
   * 生成默认代码
   */
  private generateDefaultCode(description: string, language: string): GeneratedCode {
    return {
      files: [{
        path: `generated.${language === 'typescript' ? 'ts' : language}`,
        content: `// Generated code for: ${description}\n// TODO: Implement`,
      }],
      language,
    };
  }

  /**
   * 生成默认 API
   */
  private generateDefaultAPI(spec: APISpec): CodeFile[] {
    const controllerName = spec.path.split('/').pop() || 'resource';
    const varName = controllerName.replace(/[^a-zA-Z]/g, '');
    
    return [
      {
        path: 'routes.ts',
        content: `import { Router } from 'express';
const router = Router();

router.${spec.method.toLowerCase()}('${spec.path}', ${varName}Controller.${spec.method.toLowerCase()});

export default router;`,
      },
      {
        path: 'controller.ts',
        content: `export const ${varName}Controller = {
  async ${spec.method.toLowerCase()}(req: any, res: any) {
    // TODO: Implement ${spec.description}
    res.json({ message: 'Not implemented' });
  }
};`,
      },
      {
        path: 'types.ts',
        content: `// Type definitions for ${spec.path}`,
      },
    ];
  }

  /**
   * 生成默认组件
   */
  private generateDefaultComponent(spec: ComponentSpec): CodeFile[] {
    const propsType = `${spec.name}Props`;
    
    return [
      {
        path: `${spec.name}.tsx`,
        content: `import React from 'react';

interface ${propsType} {
  ${spec.props.map(p => `${p}: string;`).join('\n  ')}
}

export const ${spec.name}: React.FC<${propsType}> = (props) => {
  return (
    <div className="${spec.name.toLowerCase()}">
      {/* ${spec.description} */}
    </div>
  );
};`,
      },
    ];
  }

  /**
   * 生成默认 Schema
   */
  private generateDefaultSchema(spec: SchemaSpec): CodeFile[] {
    const tables = spec.entities.map(entity => {
      const fields = entity.fields.map((field, i) => {
        const isPrimary = i === 0;
        return `  ${field} ${isPrimary ? 'SERIAL PRIMARY KEY' : 'VARCHAR(255)'}`;
      }).join(',\n');
      
      return `CREATE TABLE ${entity.name.toLowerCase()} (\n${fields}\n);`;
    }).join('\n\n');
    
    return [
      {
        path: 'schema.sql',
        content: tables,
      },
    ];
  }

  /**
   * 生成默认测试
   */
  private generateDefaultTest(code: string, type: string): CodeFile[] {
    const functionMatch = code.match(/function\s+(\w+)/) || code.match(/(\w+)\s*=/);
    const functionName = functionMatch ? functionMatch[1] : 'test';
    
    return [
      {
        path: `${functionName}.test.ts`,
        content: `import { ${functionName} } from './source';

describe('${functionName}', () => {
  it('should work', () => {
    // TODO: Write tests
    expect(true).toBe(true);
  });
});`,
      },
    ];
  }
}

export default CodeGenerator;
