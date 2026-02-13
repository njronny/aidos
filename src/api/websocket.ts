import { FastifyInstance, FastifyRequest } from 'fastify';
import websocket from '@fastify/websocket';
import { WsMessage, TaskUpdatePayload, FlowUpdatePayload } from './types';

interface Client {
  socket: any;
  id: string;
}

class WebSocketManager {
  private clients: Map<string, Client> = new Map();

  init(fastify: FastifyInstance) {
    fastify.register(websocket);

    fastify.get('/ws', { websocket: true }, (socket, req: FastifyRequest) => {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const client: Client = { socket, id: clientId };
      this.clients.set(clientId, client);

      console.log(`WebSocket client connected: ${clientId}`);

      socket.on('close', () => {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
      });

      socket.on('error', (error: Error) => {
        console.error(`WebSocket error for ${clientId}:`, error);
      });

      // Send welcome message
      socket.send(JSON.stringify({
        type: 'notification',
        payload: { message: 'Connected to Aidos WebSocket' },
        timestamp: new Date().toISOString(),
      }));
    });
  }

  broadcast(message: WsMessage) {
    const msgStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.socket.readyState === 1) { // WebSocket.OPEN = 1
        client.socket.send(msgStr);
      }
    });
  }

  sendToClient(clientId: string, message: WsMessage) {
    const client = this.clients.get(clientId);
    if (client && client.socket.readyState === 1) {
      client.socket.send(JSON.stringify(message));
    }
  }

  // Task status change real-time push
  pushTaskUpdate(taskId: string, status: string, result?: string) {
    const payload: TaskUpdatePayload = { taskId, status: status as any, result };
    this.broadcast({
      type: 'task_update',
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  // Flow chart data real-time update
  pushFlowUpdate(projectId: string, flowData: any) {
    const payload: FlowUpdatePayload = { projectId, flowData };
    this.broadcast({
      type: 'flow_update',
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  // Agent status change push
  pushAgentUpdate(agentId: string, agentStatus: string) {
    this.broadcast({
      type: 'agent_update',
      payload: { agentId, status: agentStatus },
      timestamp: new Date().toISOString(),
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
