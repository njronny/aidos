/**
 * OpenClaw LLM Adapter
 * 
 * 复用 OpenClaw 的 LLM 配置
 * 从环境变量读取配置，与 OpenClaw 保持一致
 */

import { LLMService, LLMConfig, LLMProvider } from '../llm';

export interface OpenClawLLMConfig extends LLMConfig {
  // OpenClaw 兼容的环境变量
  apiKey?: string;
  baseUrl?: string;
}

/**
 * 从环境变量创建 LLM 配置
 */
export function createLLMConfigFromEnv(): OpenClawLLMConfig {
  // 优先级: 显式配置 > 环境变量 > 默认值
  
  const apiKey = process.env.OPENCLAW_LLM_API_KEY 
    || process.env.MINIMAX_API_KEY 
    || process.env.OPENAI_API_KEY
    || '';

  const baseUrl = process.env.OPENCLAW_LLM_BASE_URL
    || process.env.MINIMAX_BASE_URL
    || process.env.OPENAI_BASE_URL
    || '';

  const model = process.env.OPENCLAW_LLM_MODEL || 'MiniMax-M2.5';
  
  // 根据模型确定提供商
  let provider: LLMProvider = 'minimax';
  if (model.includes('gpt') || model.includes('openai')) {
    provider = 'openai';
  } else if (model.includes('claude') || model.includes('anthropic')) {
    provider = 'anthropic';
  }

  return {
    provider,
    apiKey,
    model,
    baseUrl: baseUrl || undefined,
    maxTokens: parseInt(process.env.OPENCLAW_LLM_MAX_TOKENS || '4000'),
    temperature: parseFloat(process.env.OPENCLAW_LLM_TEMPERATURE || '0.7'),
  };
}

/**
 * 创建 AIDOS 专用的 LLM Service
 */
export function createAIDOSLLM(): LLMService {
  const config = createLLMConfigFromEnv();
  
  if (!config.apiKey) {
    console.warn('[AIDOS] Warning: No LLM API key configured. Using mock mode.');
  }
  
  return new LLMService(config);
}

export default createAIDOSLLM;
