/**
 * Code Generator - 代码生成器
 */

export class CodeGenerator {
  async generate(prompt: string): Promise<string> {
    return `// Generated code for: ${prompt}\nconsole.log('Hello World');`;
  }
}

export default CodeGenerator;
