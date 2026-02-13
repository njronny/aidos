/**
 * TaskList Module
 * Displays and manages task list with enhanced UI
 */

const TaskList = (function() {
  let tasks = [];
  let currentFilter = 'all';

  /**
   * Get status icon
   */
  function getStatusIcon(status) {
    switch (status) {
      case 'pending':
        return '○';
      case 'running':
        return '◐';
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      case 'blocked':
        return '⊘';
      default:
        return '○';
    }
  }

  /**
   * Get status label
   */
  function getStatusLabel(status) {
    switch (status) {
      case 'pending': return 'Pending';
      case 'running': return 'Running';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'blocked': return 'Blocked';
      default: return 'Unknown';
    }
  }

  /**
   * Render tasks to DOM with enhanced UI
   */
  function render(filter = 'all') {
    const container = document.getElementById('taskList');
    if (!container) return;

    const filteredTasks = filter === 'all' 
      ? tasks 
      : tasks.filter(t => t.status === filter);

    if (filteredTasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">No tasks yet</div>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredTasks.map(task => {
      const deps = task.dependencies || [];
      const depNames = deps.map(depId => {
        const depTask = tasks.find(t => t.id === depId);
        return depTask ? depTask.name : depId;
      }).join(', ');

      const progress = task.progress || (task.status === 'completed' ? 100 : task.status === 'running' ? 50 : 0);

      return `
        <div class="task-item status-${task.status}" onclick="showTaskLogs('${task.id}')" data-task-id="${task.id}">
          <div class="task-status-icon status-${task.status}" title="${getStatusLabel(task.status)}">
            ${getStatusIcon(task.status)}
          </div>
          <div class="task-info">
            <div class="task-name">${escapeHtml(task.name)}</div>
            <div class="task-id">${task.id}</div>
            ${depNames ? `<div class="task-dependencies">Depends on: ${depNames}</div>` : ''}
            <div class="task-progress">
              <div class="task-progress-fill ${task.status}" style="width: ${progress}%"></div>
            </div>
          </div>
          <div class="task-actions" onclick="event.stopPropagation()">
            <button class="task-action-btn" onclick="showTaskLogs('${task.id}')" title="View Logs">📝</button>
            ${task.status === 'failed' ? `<button class="task-action-btn" onclick="retryTask('${task.id}')" title="Retry">🔄</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Update filter counts
    updateFilterCounts();
  }

  /**
   * Update filter button counts
   */
  function updateFilterCounts() {
    const counts = getCountByStatus();
    document.querySelectorAll('.filter-btn').forEach(btn => {
      const filter = btn.dataset.filter;
      let count = 0;
      switch (filter) {
        case 'all': count = counts.total; break;
        case 'pending': count = counts.pending; break;
        case 'running': count = counts.running; break;
        case 'completed': count = counts.completed; break;
        case 'failed': count = counts.failed; break;
      }
      const countSpan = btn.querySelector('.count');
      if (countSpan) {
        countSpan.textContent = count;
      } else if (count > 0) {
        btn.innerHTML = `${btn.textContent.replace(/[\d]+/, '')}<span class="count">${count}</span>`;
      }
    });
  }

  /**
   * Retry a failed task
   */
  async function retryTask(taskId) {
    try {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/retry`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        Log.add('success', `Task ${taskId} retry initiated`);
      } else {
        UI.showError('Failed to retry task', data.error);
      }
    } catch (err) {
      UI.showError('Error retrying task', err.message);
    }
  }

  /**
   * Set tasks and render
   */
  function setTasks(newTasks) {
    tasks = newTasks || [];
    render(currentFilter);
  }

  /**
   * Get all tasks
   */
  function getTasks() {
    return [...tasks];
  }

  /**
   * Get task by ID
   */
  function getTask(id) {
    return tasks.find(t => t.id === id);
  }

  /**
   * Update a single task
   */
  function updateTask(taskData) {
    const index = tasks.findIndex(t => t.id === taskData.id);
    if (index >= 0) {
      tasks[index] = { ...tasks[index], ...taskData };
    } else {
      tasks.push(taskData);
    }
    render(currentFilter);
  }

  /**
   * Filter tasks by status
   */
  function filter(status) {
    currentFilter = status;
    render(status);
  }

  /**
   * Add a new task
   */
  function addTask(task) {
    tasks.push(task);
    render(currentFilter);
    
    // Add animation class
    setTimeout(() => {
      const item = document.querySelector(`[data-task-id="${task.id}"]`);
      if (item) item.classList.add('new');
    }, 10);
  }

  /**
   * Remove a task
   */
  function removeTask(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    render(currentFilter);
  }

  /**
   * Clear all tasks
   */
  function clear() {
    tasks = [];
    render(currentFilter);
  }

  /**
   * Get task count by status
   */
  function getCountByStatus() {
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };
  }

  /**
   * Refresh tasks from API
   */
  async function refresh() {
    try {
      const res = await fetch(`${API_URL}/api/tasks`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data || []);
      }
    } catch (err) {
      console.error('Error refreshing tasks:', err);
    }
  }

  return {
    setTasks,
    getTasks,
    getTask,
    updateTask,
    filter,
    addTask,
    removeTask,
    clear,
    getCountByStatus,
    render,
    refresh,
    retryTask,
  };
})();

// Export for use in other modules
window.TaskList = TaskList;
window.retryTask = TaskList.retryTask;
