/**
 * Dashboard Module
 * Displays project metrics and statistics with enhanced progress animation
 */

const Dashboard = (function() {
  let metrics = {
    total: 0,
    completed: 0,
    running: 0,
    failed: 0,
    pending: 0,
  };
  let lastProgress = 0;

  /**
   * Update dashboard metrics from tasks
   */
  function update() {
    const tasks = TaskList.getTasks();
    
    metrics.total = tasks.length;
    metrics.completed = tasks.filter(t => t.status === 'completed').length;
    metrics.running = tasks.filter(t => t.status === 'running').length;
    metrics.failed = tasks.filter(t => t.status === 'failed').length;
    metrics.pending = tasks.filter(t => t.status === 'pending').length;

    // Update DOM
    document.getElementById('totalTasks').textContent = metrics.total;
    document.getElementById('completedTasks').textContent = metrics.completed;
    document.getElementById('runningTasks').textContent = metrics.running;
    document.getElementById('failedTasks').textContent = metrics.failed;
    document.getElementById('pendingTasks').textContent = metrics.pending;

    // Calculate progress with animation
    const progress = metrics.total > 0 
      ? Math.round((metrics.completed / metrics.total) * 100) 
      : 0;
    
    // Animate progress bar if changed
    if (progress !== lastProgress) {
      UI.animateProgress(lastProgress, progress, 500);
      lastProgress = progress;
    }
    
    document.getElementById('progressPercent').textContent = `${progress}%`;
  }

  /**
   * Update metrics from WebSocket message
   */
  function updateMetrics(data) {
    if (data.total !== undefined) metrics.total = data.total;
    if (data.completed !== undefined) metrics.completed = data.completed;
    if (data.running !== undefined) metrics.running = data.running;
    if (data.failed !== undefined) metrics.failed = data.failed;
    if (data.pending !== undefined) metrics.pending = data.pending;

    update();
  }

  /**
   * Get current metrics
   */
  function getMetrics() {
    return { ...metrics };
  }

  /**
   * Animate metric card
   */
  function animateMetric(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.transform = 'scale(1.1)';
      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 150);
    }
  }

  /**
   * Refresh dashboard from API
   */
  async function refresh() {
    try {
      const res = await fetch(`${API_URL}/api/tasks`);
      const data = await res.json();
      if (data.success) {
        TaskList.setTasks(data.data || []);
        update();
      }
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
    }
  }

  return {
    update,
    updateMetrics,
    getMetrics,
    animateMetric,
    refresh,
  };
})();

// Export for use in other modules
window.Dashboard = Dashboard;
