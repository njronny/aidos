/**
 * OpenClaw Config Reader
 * 
 * 直接读取 OpenClaw 的配置文件，复用其 LLM 配置
 */

import * as fs from 'fs';
import * as path from 'path';

export interface OpenClawModelConfig {
  id: string;
  name: string;
  baseUrl?: string;
  apiKey?: string;
}

export interface OpenClawConfig {
  meta: any;
  models: {
    providers: Record<string, {
      baseUrl: string;
      api: string;
      apiKey?: string;
      models: OpenClawModelConfig[];
    }>;
  };
  auth?: {
    profiles?: Record<string, {
      provider: string;
      mode: string;
    }>;
  };
}

const OPENCLAW_CONFIG_PATH = '/root/.openclaw/openclaw.json';

/**
 * 读取 OpenClaw 配置
 */
export function loadOpenClawConfig(): OpenClawConfig | null {
  try {
    if (fs.existsSync(OPENCLAW_CONFIG_PATH)) {
      const content = fs.readFileSync(OPENCLAW_CONFIG_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('[AIDOS] Failed to load OpenClaw config:', error);
  }
  return null;
}

/**
 * 获取可用的 LLM 模型列表
 */
export function getAvailableModels(): OpenClawModelConfig[] {
  const config = loadOpenClawConfig();
  if (!config?.models?.providers) {
    return [];
  }

  const models: OpenClawModelConfig[] = [];
  
  for (const [providerName, provider] of Object.entries(config.models.providers)) {
    for (const model of provider.models || []) {
      models.push({
        ...model,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
      });
    }
  }

  return models;
}

/**
 * 获取默认模型配置
 */
export function getDefaultModelConfig(): OpenClawModelConfig | null {
  const models = getAvailableModels();
  
  // 优先选择 MiniMax-M2.5
  const m25 = models.find(m => m.id === 'MiniMax-M2.5');
  if (m25) return m25;

  // 否则返回第一个可用的
  return models[0] || null;
}

/**
 * 创建 AIDOS LLM 配置（复用 OpenClaw）
 */
export function createLLMConfigFromOpenClaw() {
  const modelConfig = getDefaultModelConfig();
  const config = loadOpenClawConfig();

  if (!modelConfig) {
    console.warn('[AIDOS] No OpenClaw model config found');
    return null;
  }

  // 从 providers 中找到对应的 provider 配置
  let providerConfig: any = null;
  let providerName = '';
  
  if (config?.models?.providers) {
    for (const [name, provider] of Object.entries(config.models.providers)) {
      if (provider.models?.some(m => m.id === modelConfig.id)) {
        providerConfig = provider;
        providerName = name;
        break;
      }
    }
  }

  return {
    provider: providerName.includes('minimax') ? 'minimax' : 'openai',
    apiKey: providerConfig?.apiKey || '',
    baseUrl: modelConfig.baseUrl || providerConfig?.baseUrl || '',
    model: modelConfig.id,
    maxTokens: modelConfig.maxTokens || 8192,
    temperature: 0.7,
  };
}

export default {
  loadOpenClawConfig,
  getAvailableModels,
  getDefaultModelConfig,
  createLLMConfigFromOpenClaw,
};
