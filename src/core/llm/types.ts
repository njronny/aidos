/**
 * LLM Service Types
 */

export type LLMProvider = 'openai' | 'anthropic' | 'azure' | 'local' | 'minimax';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  stream?: boolean;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
}

export interface ProviderPricing {
  input: number;  // per 1M tokens
  output: number; // per 1M tokens
}

export interface StreamChunk {
  delta: string;
  usage?: TokenUsage;
  done: boolean;
}
