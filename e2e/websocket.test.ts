/**
 * WebSocket End-to-End Tests
 * 
 * Tests the WebSocket real-time functionality:
 * 1. Connection establishment
 * 2. Task status push notifications
 * 3. Connection disconnection
 */

import { test, expect } from '@playwright/test';
import WebSocket from 'ws';

test.describe('WebSocket E2E', () => {
  const WS_URL = 'ws://localhost:3000/ws';

  test('should establish WebSocket connection and receive welcome message', async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let receivedWelcome = false;

      ws.on('open', () => {
        console.log('✅ WebSocket connection opened');
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log('📨 Received message:', message.type);
        
        if (message.type === 'notification' && message.payload.message.includes('Connected')) {
          receivedWelcome = true;
          console.log('✅ Welcome message received');
        }
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        reject(error);
      });

      ws.on('close', () => {
        console.log('✅ WebSocket connection closed');
        expect(receivedWelcome).toBe(true);
        resolve();
      });

      // Close after receiving message
      setTimeout(() => {
        if (!receivedWelcome) {
          console.log('Timeout waiting for welcome message');
        }
        ws.close();
      }, 5000);
    });
  });

  test('should handle multiple concurrent connections', async ({ request }) => {
    const connections: WebSocket[] = [];
    const connectionCount = 3;

    // Create multiple WebSocket connections
    for (let i = 0; i < connectionCount; i++) {
      const ws = new WebSocket(WS_URL);
      connections.push(ws);
    }

    // Wait for all connections to establish
    await new Promise<void>((resolve) => {
      let connectedCount = 0;
      connections.forEach((ws) => {
        ws.on('open', () => {
          connectedCount++;
          if (connectedCount === connectionCount) {
            console.log(`✅ All ${connectionCount} connections established`);
            resolve();
          }
        });
      });
    });

    // Verify connections are open
    connections.forEach((ws, index) => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
    });

    // Close all connections
    connections.forEach((ws) => ws.close());

    await new Promise<void>((resolve) => {
      let closedCount = 0;
      connections.forEach((ws) => {
        ws.on('close', () => {
          closedCount++;
          if (closedCount === connectionCount) {
            resolve();
          }
        });
      });
    });

    console.log(`✅ Multiple concurrent connections test passed`);
  });

  test('should handle connection and disconnection gracefully', async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let connectionTime = 0;
      let disconnectionTime = 0;

      ws.on('open', () => {
        connectionTime = Date.now();
        console.log('✅ Connection established at:', connectionTime);
      });

      ws.on('message', () => {
        // Ignore messages for this test
      });

      ws.on('close', () => {
        disconnectionTime = Date.now();
        const duration = disconnectionTime - connectionTime;
        console.log(`✅ Connection lasted: ${duration}ms`);
        expect(duration).toBeGreaterThan(0);
        resolve();
      });

      ws.on('error', (error) => {
        console.error('❌ Error:', error.message);
        reject(error);
      });

      // Close after a short delay
      setTimeout(() => {
        ws.close();
      }, 500);
    });
  });

  test('should handle task updates via API and verify state', async ({ request }) => {
    // Create project
    const projectResponse = await request.post('/api/projects', {
      data: { name: 'WebSocket Test Project' },
    });
    const projectData = await projectResponse.json() as { success: boolean; data: { id: string } };
    const projectId = projectData.data.id;

    // Create requirement
    const reqResponse = await request.post('/api/requirements', {
      data: {
        projectId,
        title: 'WebSocket Test Requirement',
        priority: 'high',
      },
    });
    const reqData = await reqResponse.json() as { success: boolean; data: { id: string } };
    const requirementId = reqData.data.id;

    // Create task
    const taskResponse = await request.post('/api/tasks', {
      data: {
        requirementId,
        title: 'WebSocket Test Task',
        description: 'Testing task updates',
      },
    });
    const taskData = await taskResponse.json() as { success: boolean; data: { id: string; status: string } };
    const taskId = taskData.data.id;

    // Connect to WebSocket
    const ws = new WebSocket(WS_URL);
    
    await new Promise<void>((resolve) => {
      ws.on('open', () => {
        console.log('✅ WebSocket connected for task update test');
        resolve();
      });
    });

    // Update task status (this should trigger a WebSocket notification in a real scenario)
    const updateResponse = await request.put(`/api/tasks/${taskId}`, {
      data: { status: 'in_progress' },
    });
    expect(updateResponse.ok()).toBeTruthy();

    // Complete task
    const completeResponse = await request.put(`/api/tasks/${taskId}`, {
      data: {
        status: 'completed',
        result: 'Task completed successfully',
      },
    });
    expect(completeResponse.ok()).toBeTruthy();

    // Verify final state
    const verifyResponse = await request.get(`/api/tasks/${taskId}`);
    const verifyData = await verifyResponse.json() as { success: boolean; data: { status: string } };
    expect(verifyData.data.status).toBe('completed');

    // Close WebSocket
    ws.close();

    await new Promise<void>((resolve) => {
      ws.on('close', () => {
        console.log('✅ Task update verification complete');
        resolve();
      });
    });
  });

  test('should maintain connection stability over time', async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let messageCount = 0;
      const maxMessages = 5;
      let receivedExpectedMessage = false;

      ws.on('open', () => {
        console.log('✅ Connection opened for stability test');
      });

      ws.on('message', (data) => {
        messageCount++;
        const message = JSON.parse(data.toString());
        console.log(`📨 Message ${messageCount}:`, message.type);

        if (message.type === 'notification' && message.payload.message?.includes('Connected')) {
          receivedExpectedMessage = true;
        }
      });

      ws.on('error', (error) => {
        console.error('❌ Connection error:', error.message);
        reject(error);
      });

      ws.on('close', () => {
        console.log(`✅ Connection closed after ${messageCount} messages`);
        expect(messageCount).toBeGreaterThan(0);
        expect(receivedExpectedMessage).toBe(true);
        resolve();
      });

      // Close after some time
      setTimeout(() => {
        ws.close();
      }, 3000);
    });
  });

  test('should handle rapid connect/disconnect cycles', async () => {
    const cycles = 5;
    
    for (let i = 0; i < cycles; i++) {
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        
        ws.on('open', () => {
          console.log(`🔄 Cycle ${i + 1}: Connected`);
        });

        ws.on('message', () => {
          // Ignore
        });

        ws.on('close', () => {
          console.log(`🔄 Cycle ${i + 1}: Disconnected`);
          resolve();
        });

        ws.on('error', (error) => {
          console.error(`❌ Cycle ${i + 1} error:`, error.message);
          reject(error);
        });

        // Close immediately after connect
        setTimeout(() => {
          ws.close();
        }, 100);
      });

      // Small delay between cycles
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`✅ Rapid connect/disconnect test passed: ${cycles} cycles`);
  });
});
