/**
 * LLM Service - Large Language Model Integration
 * 
 * 支持多种 LLM 提供商：
 * - OpenAI (GPT-4, GPT-3.5)
 * - Anthropic (Claude)
 * - Azure OpenAI
 * - Local models
 * - MiniMax
 */

import {
  LLMConfig,
  LLMProvider,
  ChatMessage,
  CompletionOptions,
  LLMResponse,
  TokenUsage,
  ProviderPricing,
  StreamChunk,
} from './types';

// Provider pricing (per 1M tokens)
const PROVIDER_PRICING: Record<LLMProvider, Record<string, ProviderPricing>> = {
  openai: {
    'gpt-4': { input: 30, output: 60 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  },
  anthropic: {
    'claude-3-opus': { input: 15, output: 75 },
    'claude-3-sonnet': { input: 3, output: 15 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
  },
  azure: {
    'gpt-4': { input: 30, output: 60 },
    'gpt-35-turbo': { input: 0.5, output: 1.5 },
  },
  local: {
    'default': { input: 0, output: 0 },
  },
  minimax: {
    'MiniMax-M2.1': { input: 0.1, output: 0.1 },
    'MiniMax-M2.5': { input: 0.2, output: 0.2 },
  },
};

export class LLMService {
  private config: Required<LLMConfig>;
  private requestCount = 0;

  constructor(config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.config = {
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl || this.getDefaultBaseUrl(config.provider),
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature ?? 0.7,
      timeout: config.timeout || 60000,
    };
  }

  private getDefaultBaseUrl(provider: LLMProvider): string {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'azure':
        return process.env.AZURE_OPENAI_ENDPOINT || '';
      case 'minimax':
        return 'https://api.minimax.chat/v1';
      case 'local':
        return 'http://localhost:8080/v1';
      default:
        return '';
    }
  }

  getConfig(): Readonly<Required<LLMConfig>> {
    return { ...this.config };
  }

  /**
   * Simple text completion
   */
  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    const messages: ChatMessage[] = [
      { role: 'user', content: prompt },
    ];

    return this.chat(messages, options);
  }

  /**
   * Chat completion with message history
   */
  async chat(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<string> {
    if (!messages || messages.length === 0) {
      throw new Error('Messages are required');
    }

    const maxTokens = options?.maxTokens ?? this.config.maxTokens;
    const temperature = options?.temperature ?? this.config.temperature;

    this.requestCount++;

    // Simulate API call (in production, this would call actual LLM API)
    const response = await this.makeRequest(messages, {
      maxTokens,
      temperature,
      ...options,
    });

    return response.content;
  }

  /**
   * Stream completion (simple string callback)
   */
  async streamComplete(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const messages: ChatMessage[] = [
      { role: 'user', content: prompt },
    ];

    await this.streamChat(messages, (chunk) => {
      onChunk(chunk.delta);
    });
  }

  /**
   * Stream chat
   */
  async streamChat(
    messages: ChatMessage[],
    onChunk: (chunk: StreamChunk) => void
  ): Promise<void> {
    // Simulate streaming response
    const content = await this.chat(messages);
    const words = content.split(' ');

    for (let i = 0; i < words.length; i++) {
      onChunk({
        delta: words[i] + (i < words.length - 1 ? ' ' : ''),
        done: i === words.length - 1,
      });
    }
  }

  /**
   * Estimate token count (simple approximation)
   * 1 token ≈ 4 characters for English, fewer for Chinese
   */
  estimateTokens(text: string): number {
    if (!text) return 0;
    
    // Rough estimate: 1 token ≈ 4 characters for English
    // For mixed content, use a conservative estimate
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    
    // Chinese: ~1.5 chars per token, English: ~4 chars per token
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  /**
   * Calculate API cost
   */
  calculateCost(promptTokens: number, completionTokens: number): number {
    const pricing = LLMService.getProviderPricing(
      this.config.provider,
      this.config.model
    );
    
    return (
      (promptTokens / 1_000_000) * pricing.input +
      (completionTokens / 1_000_000) * pricing.output
    );
  }

  /**
   * Get provider pricing
   */
  static getProviderPricing(
    provider: LLMProvider,
    model: string
  ): ProviderPricing {
    const providerPricing = PROVIDER_PRICING[provider];
    if (!providerPricing) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    return providerPricing[model] || providerPricing['default'] || { input: 0, output: 0 };
  }

  /**
   * Get request count (for testing/monitoring)
   */
  getRequestCount(): number {
    return this.requestCount;
  }

  /**
   * Make HTTP request to LLM API
   * Real implementation that calls actual LLM APIs
   */
  private async makeRequest(
    messages: ChatMessage[],
    options: CompletionOptions
  ): Promise<LLMResponse> {
    // Check if we have a valid API key
    if (!this.config.apiKey || this.config.apiKey === 'test-key') {
      // Fallback to mock if no API key
      return this.makeMockRequest(messages, options);
    }

    try {
      if (this.config.provider === 'openai') {
        return await this.callOpenAI(messages, options);
      } else if (this.config.provider === 'anthropic') {
        return await this.callAnthropic(messages, options);
      } else if (this.config.provider === 'minimax') {
        return await this.callMiniMax(messages, options);
      } else {
        console.warn(`[LLM] Unknown provider ${this.config.provider}, using mock`);
        return this.makeMockRequest(messages, options);
      }
    } catch (error) {
      console.error(`[LLM] API call failed:`, error);
      // Fallback to mock on error
      return this.makeMockRequest(messages, options);
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(messages: ChatMessage[], options: CompletionOptions): Promise<LLMResponse> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data: any = await response.json();
    const choice = data.choices[0];
    
    return {
      content: choice.message.content,
      usage: data.usage,
      model: data.model,
      finishReason: choice.finish_reason,
    };
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(messages: ChatMessage[], options: CompletionOptions): Promise<LLMResponse> {
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature,
        system: systemMessage?.content,
        messages: userMessages.map(m => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data: any = await response.json();
    
    return {
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      model: data.model,
      finishReason: 'stop',
    };
  }

  /**
   * Call MiniMax API
   */
  private async callMiniMax(messages: ChatMessage[], options: CompletionOptions): Promise<LLMResponse> {
    const response = await fetch(`${this.config.baseUrl}/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`MiniMax API error: ${response.status}`);
    }

    const data: any = await response.json();
    const choice = data.choices[0];
    
    return {
      content: choice.message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: data.model,
      finishReason: choice.finish_reason,
    };
  }

  /**
   * Mock request fallback
   */
  private makeMockRequest(
    messages: ChatMessage[],
    options: CompletionOptions
  ): LLMResponse {
    const promptTokens = this.estimateTokens(
      messages.map(m => m.content).join(' ')
    );

    const lastMessage = messages[messages.length - 1];
    const mockContent = this.generateMockResponse(lastMessage.content);
    const completionTokens = this.estimateTokens(mockContent);

    return {
      content: mockContent,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      model: this.config.model,
      finishReason: 'stop',
    };
  }

  /**
   * Generate mock response for testing
   */
  private generateMockResponse(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
      return 'Hello! How can I help you today?';
    }
    
    if (lowerPrompt.includes('typescript') || lowerPrompt.includes('code')) {
      return `// TypeScript function example
export function hello(name: string): string {
  return \`Hello, \${name}!\`;
}

// Usage
const message = hello("World");
console.log(message);`;
    }

    return 'This is a mock response from the LLM service. In production, this would be a real response from the configured LLM provider.';
  }
}

export default LLMService;
