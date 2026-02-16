/**
 * Webhook 管理
 */

import { FastifyInstance } from 'fastify';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  createdAt: string;
}

// 内存存储
const webhooks: Map<string, Webhook> = new Map();

// 触发 webhook
export async function triggerWebhook(event: string, data: any) {
  for (const webhook of webhooks.values()) {
    if (!webhook.enabled) continue;
    if (!webhook.events.includes(event) && !webhook.events.includes('*')) continue;
    
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Secret': webhook.secret,
        },
        body: JSON.stringify(data),
      });
      
      console.log(`Webhook ${webhook.id} triggered: ${response.status}`);
    } catch (error) {
      console.error(`Webhook ${webhook.id} failed:`, error);
    }
  }
}

export async function webhookRoutes(fastify: FastifyInstance) {
  
  // 获取 webhook 列表
  fastify.get('/webhooks', async (request, reply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    return reply.send({
      success: true,
      data: Array.from(webhooks.values())
    });
  });

  // 创建 webhook
  fastify.post('/webhooks', async (request, reply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    const { url, events, secret } = request.body as any;
    
    if (!url || !events || !Array.isArray(events)) {
      return reply.status(400).send({ success: false, error: 'URL和事件类型必填' });
    }
    
    const id = crypto.randomUUID();
    const webhook: Webhook = {
      id,
      url,
      events,
      secret: secret || crypto.randomUUID(),
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    
    webhooks.set(id, webhook);
    
    return reply.status(201).send({ success: true, data: webhook });
  });

  // 删除 webhook
  fastify.delete('/webhooks/:id', async (request, reply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    const { id } = request.params as { id: string };
    
    if (!webhooks.has(id)) {
      return reply.status(404).send({ success: false, error: 'Webhook不存在' });
    }
    
    webhooks.delete(id);
    
    return reply.send({ success: true, message: 'Webhook已删除' });
  });

  // 触发测试 webhook
  fastify.post('/webhooks/:id/test', async (request, reply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    const { id } = request.params as { id: string };
    const webhook = webhooks.get(id);
    
    if (!webhook) {
      return reply.status(404).send({ success: false, error: 'Webhook不存在' });
    }
    
    await triggerWebhook('test', { message: 'Test webhook' });
    
    return reply.send({ success: true, message: '测试事件已触发' });
  });
}
