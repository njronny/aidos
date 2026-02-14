/**
 * LLM Service Tests - 测试驱动开发
 * 
 * 第一阶段：LLM 集成
 * - 需求理解增强
 * - 代码生成
 * - 测试用例生成
 */

import { LLMService } from '../LLMService';
import { LLMConfig, LLMProvider } from '../types';

// Mock config for testing
const mockConfig: LLMConfig = {
  provider: 'openai',
  apiKey: 'test-key',
  model: 'gpt-4',
  baseUrl: 'https://api.openai.com/v1',
  maxTokens: 4000,
  temperature: 0.7,
};

describe('LLMService', () => {
  let llmService: LLMService;

  beforeEach(() => {
    llmService = new LLMService(mockConfig);
  });

  describe('constructor', () => {
    it('should create LLM service with config', () => {
      expect(llmService).toBeDefined();
      const config = llmService.getConfig();
      expect(config.provider).toBe(mockConfig.provider);
      expect(config.model).toBe(mockConfig.model);
      expect(config.maxTokens).toBe(mockConfig.maxTokens);
      expect(config.temperature).toBe(mockConfig.temperature);
    });

    it('should throw error if no API key', () => {
      expect(() => {
        new LLMService({ provider: 'openai', apiKey: '', model: 'gpt-4' });
      }).toThrow('API key is required');
    });

    it('should support different providers', () => {
      const providers: LLMProvider[] = ['openai', 'anthropic', 'azure', 'local'];
      providers.forEach(provider => {
        const service = new LLMService({
          provider,
          apiKey: 'test-key',
          model: 'test-model',
        });
        expect(service).toBeDefined();
      });
    });
  });

  describe('complete', () => {
    it('should generate completion for given prompt', async () => {
      const prompt = 'Write a hello world function in TypeScript';
      const response = await llmService.complete(prompt);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should handle empty prompt', async () => {
      await expect(llmService.complete('')).rejects.toThrow('Prompt is required');
    });

    it('should respect maxTokens config', async () => {
      const service = new LLMService({ ...mockConfig, maxTokens: 100 });
      // Should use configured maxTokens
      expect(service.getConfig().maxTokens).toBe(100);
    });

    it('should use temperature from config', async () => {
      const service = new LLMService({ ...mockConfig, temperature: 0.5 });
      expect(service.getConfig().temperature).toBe(0.5);
    });
  });

  describe('chat', () => {
    it('should generate chat completion', async () => {
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' },
      ];
      
      const response = await llmService.chat(messages);
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should handle message format correctly', async () => {
      const messages = [
        { role: 'user', content: 'Test message' } as const,
      ];
      
      await expect(llmService.chat(messages)).resolves.toBeDefined();
    });
  });

  describe('streamComplete', () => {
    it('should stream response chunks', async () => {
      const prompt = 'Count from 1 to 5';
      const chunks: string[] = [];
      
      await llmService.streamComplete(prompt, (chunk) => {
        chunks.push(chunk);
      });
      
      // Should receive multiple chunks
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toBeDefined();
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens for text', () => {
      const text = 'Hello world';
      const tokens = llmService.estimateTokens(text);
      
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('should return 0 for empty string', () => {
      expect(llmService.estimateTokens('')).toBe(0);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost based on tokens and model', () => {
      const cost = llmService.calculateCost(1000, 1000);
      
      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('should return 0 for 0 tokens', () => {
      expect(llmService.calculateCost(0, 0)).toBe(0);
    });
  });
});

describe('LLMProvider pricing', () => {
  it('should have correct pricing for OpenAI GPT-4', () => {
    const pricing = LLMService.getProviderPricing('openai', 'gpt-4');
    expect(pricing.input).toBeGreaterThan(0);
    expect(pricing.output).toBeGreaterThan(0);
  });

  it('should have correct pricing for Anthropic Claude', () => {
    const pricing = LLMService.getProviderPricing('anthropic', 'claude-3-sonnet');
    expect(pricing.input).toBeGreaterThan(0);
    expect(pricing.output).toBeGreaterThan(0);
  });

  it('should throw for unknown provider', () => {
    expect(() => {
      LLMService.getProviderPricing('unknown' as LLMProvider, 'model');
    }).toThrow('Unknown provider');
  });
});
