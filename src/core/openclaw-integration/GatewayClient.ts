/**
 * OpenClaw Gateway 客户端
 * 
 * 通过 HTTP API 调用 OpenClaw 工具
 */

export interface GatewayConfig {
  host: string;
  port: number;
  token: string;
}

export interface SpawnOptions {
  task: string;
  agentId?: string;
  model?: string;
  timeoutSeconds?: number;
  label?: string;
}

export interface SpawnResult {
  status: 'accepted' | 'error';
  runId?: string;
  sessionKey?: string;
  error?: string;
}

export class OpenClawGatewayClient {
  private baseUrl: string;
  private token: string;

  constructor(config: GatewayConfig) {
    this.baseUrl = `http://${config.host}:${config.port}`;
    this.token = config.token;
  }

  /**
   * 调用 /tools/invoke 执行工具
   */
  async invoke(tool: string, args: Record<string, any>): Promise<any> {
    const response = await fetch(`${this.baseUrl}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool,
        args,
      }),
    });

    if (!response.ok) {
      throw new Error(`Gateway error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 启动子代理任务
   */
  async spawnSubAgent(options: SpawnOptions): Promise<SpawnResult> {
    try {
      // 注意：不能传 agentId，当前不允许
      const response = await this.invoke('sessions_spawn', {
        task: options.task,
        // agentId: options.agentId || 'main',  // 不支持
        model: options.model,
        timeoutSeconds: options.timeoutSeconds || 120,
        label: options.label,
      });
      
      // Gateway 返回格式: { ok: true, result: { content: [{type:"text", text:"..."}], details: {...} } }
      // content 是对象数组，需要从 .text 中提取 JSON 字符串
      const contentObj = response.result?.content?.[0];
      const content = typeof contentObj === 'string' ? contentObj : contentObj?.text;
      let details = response.result?.details || {};
      
      // 解析 content 中的 JSON
      if (content) {
        try {
          const parsed = JSON.parse(content);
          details = { ...details, ...parsed };
        } catch (e) {
          // 解析失败
        }
      }
      
      return {
        status: details.status || 'accepted',
        runId: details.runId,
        sessionKey: details.childSessionKey || details.sessionKey,
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * 获取子代理任务状态
   */
  async getTaskStatus(sessionKey: string): Promise<any> {
    return this.invoke('sessions_history', {
      sessionKey,
      limit: 1,
    });
  }

  /**
   * 等待 Agent 任务完成
   */
  async waitForTaskComplete(sessionKey: string, maxWaitMs: number = 120000, intervalMs: number = 3000): Promise<{ completed: boolean; result?: string }> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      try {
        const history = await this.getTaskStatus(sessionKey);
        
        // 解析响应格式
        const contentObj = history.result?.content?.[0];
        const content = typeof contentObj === 'string' ? contentObj : contentObj?.text;
        let parsed: any = {};
        
        if (content) {
          try {
            parsed = JSON.parse(content);
          } catch (e) {}
        }
        
        // 从 details 中获取消息
        const messages = parsed.messages || history.result?.details?.messages || [];
        
        if (messages.length > 0) {
          const lastMsg = messages[0];
          const msgContent = lastMsg.message?.content;
          
          // 检查是否完成 (stopReason 存在表示完成)
          if (lastMsg.stopReason || lastMsg.message?.role === 'assistant') {
            // 提取文本内容
            let resultText = '';
            if (Array.isArray(msgContent)) {
              for (const c of msgContent) {
                if (c.type === 'text') {
                  resultText += c.text;
                }
              }
            }
            return { completed: true, result: resultText };
          }
        }
      } catch (e) {
        console.log('[GatewayClient] Poll error:', e);
      }
      
      // 等待下次轮询
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    return { completed: false };
  }

  /**
   * 发送消息到子代理
   */
  async sendToAgent(sessionKey: string, message: string): Promise<any> {
    return this.invoke('sessions_send', {
      sessionKey,
      message,
    });
  }

  /**
   * 列出所有代理
   */
  async listAgents(): Promise<string[]> {
    const result = await this.invoke('agents_list', {});
    return result.agentIds || [];
  }
}

// 默认客户端实例
let defaultClient: OpenClawGatewayClient | null = null;

export function getGatewayClient(config?: Partial<GatewayConfig>): OpenClawGatewayClient {
  if (!defaultClient) {
    defaultClient = new OpenClawGatewayClient({
      host: config?.host || 'localhost',
      port: config?.port || 18789,
      token: config?.token || process.env.OPENCLAW_GATEWAY_TOKEN || '',
    });
  }
  return defaultClient;
}

export default OpenClawGatewayClient;
