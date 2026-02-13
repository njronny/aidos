/**
 * Log Module
 * Displays execution logs
 */

const Log = (function() {
  const maxLogs = 100;
  let logs = [];

  /**
   * Get log level class
   */
  function getLevelClass(level) {
    switch (level) {
      case 'info':
        return 'log-info';
      case 'success':
      case 'completed':
        return 'log-success';
      case 'warning':
      case 'warn':
        return 'log-warning';
      case 'error':
      case 'failed':
        return 'log-error';
      default:
        return 'log-info';
    }
  }

  /**
   * Add a log entry
   */
  function add(entry) {
    const logEntry = {
      id: Date.now() + Math.random(),
      time: entry.time || new Date().toLocaleTimeString(),
      level: entry.level || 'info',
      message: entry.message,
      timestamp: new Date(),
    };

    logs.unshift(logEntry);

    // Limit logs
    if (logs.length > maxLogs) {
      logs = logs.slice(0, maxLogs);
    }

    render();
  }

  /**
   * Render logs to DOM
   */
  function render() {
    const container = document.getElementById('logContainer');
    if (!container) return;

    container.innerHTML = logs.map(log => `
      <div class="log-entry ${getLevelClass(log.level)}">
        <span class="log-time">[${log.time}]</span>
        <span class="log-message">${escapeHtml(log.message)}</span>
      </div>
    `).join('');
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear all logs
   */
  function clear() {
    logs = [];
    render();
    
    // Add a system message
    add({
      time: new Date().toLocaleTimeString(),
      level: 'info',
      message: 'Logs cleared'
    });
  }

  /**
   * Get all logs
   */
  function getLogs() {
    return [...logs];
  }

  /**
   * Filter logs by level
   */
  function filterByLevel(level) {
    if (level === 'all') {
      render();
      return;
    }
    
    const container = document.getElementById('logContainer');
    if (!container) return;

    const filtered = logs.filter(log => 
      log.level.toLowerCase() === level.toLowerCase()
    );

    container.innerHTML = filtered.map(log => `
      <div class="log-entry ${getLevelClass(log.level)}">
        <span class="log-time">[${log.time}]</span>
        <span class="log-message">${escapeHtml(log.message)}</span>
      </div>
    `).join('');
  }

  /**
   * Add info log
   */
  function info(message) {
    add({ level: 'info', message });
  }

  /**
   * Add success log
   */
  function success(message) {
    add({ level: 'success', message });
  }

  /**
   * Add warning log
   */
  function warning(message) {
    add({ level: 'warning', message });
  }

  /**
   * Add error log
   */
  function error(message) {
    add({ level: 'error', message });
  }

  return {
    add,
    clear,
    getLogs,
    filterByLevel,
    info,
    success,
    warning,
    error,
    render,
  };
})();

// Export for use in other modules
window.Log = Log;
