/**
 * WebSocket Module
 * Handles WebSocket connection and message handling
 */

const WebSocketClient = (function() {
  let ws = null;
  let reconnectTimer = null;
  let messageHandlers = {};

  /**
   * Initialize WebSocket connection
   */
  function connect(url) {
    return new Promise((resolve, reject) => {
      try {
        ws = new WebSocket(url);

        ws.onopen = function() {
          console.log('WebSocket connected');
          resolve(true);
        };

        ws.onmessage = function(event) {
          try {
            const message = JSON.parse(event.data);
            handleMessage(message);
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };

        ws.onclose = function() {
          console.log('WebSocket disconnected');
          handleDisconnect();
        };

        ws.onerror = function(error) {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Handle incoming message
   */
  function handleMessage(message) {
    const type = message.type;
    
    if (messageHandlers[type]) {
      messageHandlers[type](message.data);
    }
    
    // Also call wildcard handlers
    if (messageHandlers['*']) {
      messageHandlers['*'](message);
    }
  }

  /**
   * Handle disconnect
   */
  function handleDisconnect() {
    // Notify handlers
    if (messageHandlers['disconnect']) {
      messageHandlers['disconnect']();
    }
  }

  /**
   * Register message handler
   */
  function on(type, handler) {
    messageHandlers[type] = handler;
  }

  /**
   * Unregister message handler
   */
  function off(type) {
    delete messageHandlers[type];
  }

  /**
   * Send message to server
   */
  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  /**
   * Close connection
   */
  function close() {
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
    send,
    close,
    isConnected,
  };
})();

// Export for use in other modules
window.WebSocketClient = WebSocketClient;
