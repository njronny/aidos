/**
 * Dashboard Module
 * Displays project metrics and statistics
 */

const Dashboard = (function() {
  let metrics = {
    total: 0,
    completed: 0,
    running: 0,
    failed: 0,
    pending: 0,
  };

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

    // Calculate progress
    const progress = metrics.total > 0 
      ? Math.round((metrics.completed / metrics.total) * 100) 
      : 0;
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
    element.style.transform = 'scale(1.1)';
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 150);
  }

  return {
    update,
    updateMetrics,
    getMetrics,
    animateMetric,
  };
})();

// Export for use in other modules
window.Dashboard = Dashboard;
