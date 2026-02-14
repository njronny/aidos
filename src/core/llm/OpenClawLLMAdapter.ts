/**
 * OpenClaw LLM Adapter
 * 
 * 直接复用 OpenClaw 的配置文件，无需额外配置
 */

import { LLMService, LLMConfig, LLMProvider } from '../llm';
import { createLLMConfigFromOpenClaw, getDefaultModelConfig, getAvailableModels } from './OpenClawConfigReader';

/**
 * 创建 AIDOS 专用的 LLM Service
 * 自动复用 OpenClaw 的配置
 */
export function createAIDOSLLM(): LLMService {
  // 优先从 OpenClaw 配置读取
  let config = createLLMConfigFromOpenClaw();
  
  // 如果 OpenClaw 配置读取失败，尝试环境变量
  if (!config) {
    console.log('[AIDOS] Falling back to environment variables');
    config = createLLMConfigFromEnv();
  }

  // 如果都没有配置，使用 mock
  if (!config?.apiKey) {
    console.warn('[AIDOS] Warning: No LLM API key found. Using mock mode.');
    config = {
      provider: 'minimax',
      apiKey: 'mock',
      model: 'MiniMax-M2.5',
      baseUrl: '',
      maxTokens: 4000,
      temperature: 0.7,
    };
  }

  console.log(`[AIDOS] Using LLM: ${config.model} (${config.provider})`);
  return new LLMService(config);
}

/**
 * 从环境变量创建 LLM 配置（备用方案）
 */
function createLLMConfigFromEnv(): LLMConfig | null {
  const apiKey = process.env.OPENCLAW_LLM_API_KEY 
    || process.env.MINIMAX_API_KEY 
    || process.env.OPENAI_API_KEY
    || '';

  if (!apiKey) return null;

  const baseUrl = process.env.OPENCLAW_LLM_BASE_URL
    || process.env.MINIMAX_BASE_URL
    || process.env.OPENAI_BASE_URL
    || '';

  const model = process.env.OPENCLAW_LLM_MODEL || 'MiniMax-M2.5';
  
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

// 导出工具函数
export { getDefaultModelConfig, getAvailableModels };

export default createAIDOSLLM;
