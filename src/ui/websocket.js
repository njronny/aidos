/**
 * WebSocket Module
 * Handles WebSocket connection and message handling for real-time task updates
 */

// 更新连接状态显示
function updateConnectionStatus(connected) {
  const statusEl = document.getElementById('connectionStatus');
  if (!statusEl) return;
  
  const dot = statusEl.querySelector('.status-dot');
  const text = statusEl.querySelector('.status-text');
  
  if (connected) {
    statusEl.className = 'connection-status connected';
    if (dot) dot.className = 'status-dot connected';
    if (text) text.textContent = 'Connected';
  } else {
    statusEl.className = 'connection-status disconnected';
    if (dot) dot.className = 'status-dot disconnected';
    if (text) text.textContent = 'Disconnected - Reconnecting...';
  }
}

// Get WebSocket URL based on current host
function getWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
}

const WebSocketClient = (function() {
  let ws = null;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  let messageHandlers = {};
  let connectionListeners = [];
  let isConnecting = false;

  /**
   * Initialize WebSocket connection
   */
  function connect(url) {
    return new Promise((resolve, reject) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        resolve(true);
        return;
      }

      if (isConnecting) {
        console.log('WebSocket connection in progress...');
        return;
      }

      isConnecting = true;
      const wsUrl = url || getWebSocketUrl();
      console.log(`[WebSocket] Connecting to ${wsUrl}...`);

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = function() {
          console.log('[WebSocket] Connected successfully');
          isConnecting = false;
          reconnectAttempts = 0;
          
          // 更新连接状态UI
          updateConnectionStatus(true);
          
          // Notify connection listeners
          connectionListeners.forEach(listener => listener(true));
          resolve(true);
        };

        ws.onmessage = function(event) {
          try {
            const message = JSON.parse(event.data);
            console.log('[WebSocket] Received:', message.type, message.payload || message);
            handleMessage(message);
          } catch (e) {
            console.error('[WebSocket] Failed to parse message:', e);
          }
        };

        ws.onclose = function(event) {
          console.log('[WebSocket] Disconnected:', event.code, event.reason);
          isConnecting = false;
          
          // Notify disconnection listeners
          connectionListeners.forEach(listener => listener(false));
          
          // Attempt reconnection
          handleDisconnect();
        };

        ws.onerror = function(error) {
          console.error('[WebSocket] Error:', error);
          isConnecting = false;
          reject(error);
        };
      } catch (e) {
        isConnecting = false;
        reject(e);
      }
    });
  }

  /**
   * Handle incoming message
   */
  function handleMessage(message) {
    const type = message.type;
    const payload = message.payload;
    
    console.log('[WebSocket] Handling message type:', type);
    
    // Handle task updates - call both specific and generic handlers
    if (type === 'task_update' && payload) {
      // Call task_update handler
      if (messageHandlers['task_update']) {
        messageHandlers['task_update'](payload);
      }
      
      // Also notify wildcard handlers with full message
      if (messageHandlers['*']) {
        messageHandlers['*'](message);
      }
      
      // Trigger custom event for task updates
      if (payload.taskId && payload.status) {
        const event = new CustomEvent('taskUpdate', { 
          detail: payload 
        });
        window.dispatchEvent(event);
        console.log('[WebSocket] Dispatched taskUpdate event:', payload);
      }
      return;
    }
    
    // Handle flow updates
    if (type === 'flow_update' && payload) {
      if (messageHandlers['flow_update']) {
        messageHandlers['flow_update'](payload);
      }
      if (messageHandlers['*']) {
        messageHandlers['*'](message);
      }
      return;
    }
    
    // Handle agent updates
    if (type === 'agent_update' && payload) {
      if (messageHandlers['agent_update']) {
        messageHandlers['agent_update'](payload);
      }
      if (messageHandlers['*']) {
        messageHandlers['*'](message);
      }
      return;
    }
    
    // Handle notifications
    if (type === 'notification') {
      if (messageHandlers['notification']) {
        messageHandlers['notification'](payload);
      }
      if (messageHandlers['*']) {
        messageHandlers['*'](message);
      }
      return;
    }
    
    // Call wildcard handlers for any other message type
    if (messageHandlers['*']) {
      messageHandlers['*'](message);
    }
  }

  /**
   * Handle disconnect with reconnection logic
   */
  function handleDisconnect() {
    // Notify handlers
    if (messageHandlers['disconnect']) {
      messageHandlers['disconnect']();
    }

    // Auto-reconnect with exponential backoff
    if (reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
      
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        reconnectAttempts++;
        connect().catch(err => {
          console.error('[WebSocket] Reconnection failed:', err);
        });
      }, delay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
    }
  }

  /**
   * Register message handler
   */
  function on(type, handler) {
    messageHandlers[type] = handler;
    console.log(`[WebSocket] Registered handler for: ${type}`);
  }

  /**
   * Unregister message handler
   */
  function off(type) {
    delete messageHandlers[type];
  }

  /**
   * Register connection state listener
   */
  function onConnectionChange(handler) {
    connectionListeners.push(handler);
  }

  /**
   * Send message to server
   */
  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Not connected, cannot send message');
    }
  }

  /**
   * Close connection
   */
  function close() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
  }

  /**
   * Check if connected
   */
  function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
  }

  return {
    connect,
    on,
    off,
    onConnectionChange,
    send,
    close,
    isConnected,
  };
})();

// Auto-connect on page load if not already connected
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // Auto-connect after a short delay
      setTimeout(() => {
        if (!WebSocketClient.isConnected()) {
          WebSocketClient.connect().catch(err => {
            console.warn('[WebSocket] Auto-connect failed, will retry on demand');
          });
        }
      }, 1000);
    });
  } else {
    // DOM already loaded, connect after a short delay
    setTimeout(() => {
      if (!WebSocketClient.isConnected()) {
        WebSocketClient.connect().catch(err => {
          console.warn('[WebSocket] Auto-connect failed, will retry on demand');
        });
      }
    }, 1000);
  }
}

// Export for use in other modules
window.WebSocketClient = WebSocketClient;
