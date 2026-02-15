/**
 * LLM 模块 - 存根
 * 
 * 注意: 完整实现需要配置API密钥
 */

import { LLMConfig, LLMResponse, ChatMessage, ChatOptions } from './types';

export * from './types';

export class LLMService {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  // 支持字符串或消息数组
  async chat(prompt: string | ChatMessage[]): Promise<LLMResponse> {
    // Mock implementation
    const content = Array.isArray(prompt) 
      ? `Mock response for: ${prompt[prompt.length-1]?.content?.substring(0, 30)}...`
      : `Mock response for: ${prompt.substring(0, 50)}...`;
    return {
      content,
    };
  }

  async chatComplete(options: ChatOptions): Promise<LLMResponse> {
    return {
      content: 'Mock response',
    };
  }

  // 别名方法
  async generate(prompt: string): Promise<string> {
    const response = await this.chat(prompt);
    return response.content;
  }
}

export function createLLMConfigFromEnv(): LLMConfig | null {
  return null;
}

export default LLMService;
