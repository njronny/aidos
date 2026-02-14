/**
 * CodeGenerator Tests - TDD
 * 
 * 测试代码生成能力
 */

import { CodeGenerator, CodeTemplate, GeneratedCode } from '../CodeGenerator';
import { LLMService } from '../../llm';
import { LLMConfig } from '../../llm/types';

const mockLLMConfig: LLMConfig = {
  provider: 'openai',
  apiKey: 'test-key',
  model: 'gpt-4',
};

describe('CodeGenerator', () => {
  let generator: CodeGenerator;
  let llmService: LLMService;

  beforeEach(() => {
    llmService = new LLMService(mockLLMConfig);
    generator = new CodeGenerator(llmService);
  });

  describe('constructor', () => {
    it('should create code generator with LLM service', () => {
      expect(generator).toBeDefined();
    });

    it('should throw if no LLM service', () => {
      expect(() => {
        new CodeGenerator(undefined as any);
      }).toThrow('LLM service is required');
    });
  });

  describe('generateFromDescription', () => {
    it('should generate code from description', async () => {
      const description = '创建一个用户登录函数，输入用户名和密码，返回是否登录成功';
      
      const code = await generator.generateFromDescription(description);
      
      expect(code).toHaveProperty('files');
      expect(code).toHaveProperty('language');
      expect(code).toHaveProperty('framework');
      expect(Array.isArray(code.files)).toBe(true);
    });

    it('should generate TypeScript by default', async () => {
      const description = 'hello world 函数';
      
      const code = await generator.generateFromDescription(description);
      
      expect(code.language).toBe('typescript');
    });

    it('should generate Python when specified', async () => {
      const description = 'hello world 函数';
      
      const code = await generator.generateFromDescription(description, 'python');
      
      expect(code.language).toBe('python');
    });
  });

  describe('generateAPI', () => {
    it('should generate REST API code', async () => {
      const apiSpec: { path: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; description: string } = {
        path: '/api/users',
        method: 'GET',
        description: '获取用户列表',
      };
      
      const code = await generator.generateAPI(apiSpec);
      
      expect(code.files.length).toBeGreaterThan(0);
      expect(code.files[0].content).toContain('users');
    });

    it('should include route handler', async () => {
      const apiSpec: { path: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; description: string } = {
        path: '/api/posts',
        method: 'POST',
        description: '创建文章',
      };
      
      const code = await generator.generateAPI(apiSpec);
      
      // Should have route handler or controller
      const hasHandler = code.files.some(f => 
        f.content.toLowerCase().includes('handler') || f.content.toLowerCase().includes('controller')
      );
      expect(hasHandler).toBe(true);
    });
  });

  describe('generateComponent', () => {
    it('should generate UI component', async () => {
      const componentSpec = {
        name: 'UserCard',
        props: ['name', 'email', 'avatar'],
        description: '用户信息卡片组件',
      };
      
      const code = await generator.generateComponent(componentSpec);
      
      expect(code.files.length).toBeGreaterThan(0);
    });

    it('should generate React component by default', async () => {
      const componentSpec = {
        name: 'Button',
        props: ['label', 'onClick'],
        description: '按钮组件',
      };
      
      const code = await generator.generateComponent(componentSpec);
      
      expect(code.framework).toBe('react');
    });
  });

  describe('generateDatabaseSchema', () => {
    it('should generate database schema', async () => {
      const schemaSpec = {
        entities: [
          { name: 'User', fields: ['id', 'name', 'email'] },
        ],
      };
      
      const code = await generator.generateDatabaseSchema(schemaSpec);
      
      expect(code.files.length).toBeGreaterThan(0);
      // Check for either uppercase or lowercase table name
      expect(code.files[0].content.toLowerCase()).toContain('user');
    });

    it('should generate SQL by default', async () => {
      const schemaSpec = {
        entities: [
          { name: 'Product', fields: ['id', 'name', 'price'] },
        ],
      };
      
      const code = await generator.generateDatabaseSchema(schemaSpec);
      
      expect(code.language).toBe('sql');
    });
  });

  describe('generateTest', () => {
    it('should generate unit tests', async () => {
      const codeToTest = `
export function add(a: number, b: number): number {
  return a + b;
}
`;
      
      const tests = await generator.generateTest(codeToTest, 'unit');
      
      expect(tests).toHaveProperty('files');
      expect(tests.files[0].content).toContain('add');
    });

    it('should generate Jest tests for TypeScript', async () => {
      const codeToTest = `
export function multiply(a: number, b: number): number {
  return a * b;
}
`;
      
      const tests = await generator.generateTest(codeToTest, 'unit');
      
      expect(tests.files[0].content).toContain('describe');
      expect(tests.files[0].content).toContain('it');
    });
  });

  describe('refactorCode', () => {
    it('should refactor code with improvements', async () => {
      const code = `
function add(a,b) {
  return a+b;
}
`;
      
      const refactored = await generator.refactorCode(code, 'typescript');
      
      expect(refactored).toBeDefined();
      expect(refactored.length).toBeGreaterThan(0);
    });
  });
});

describe('CodeTemplate', () => {
  it('should create valid code template', () => {
    const template: CodeTemplate = {
      name: 'rest-api',
      language: 'typescript',
      files: [
        { path: 'index.ts', content: '// TODO' },
      ],
    };
    
    expect(template.name).toBe('rest-api');
    expect(template.files.length).toBe(1);
  });
});
