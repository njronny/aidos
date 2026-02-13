/**
 * TaskList Module
 * Displays and manages task list
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
   * Render tasks to DOM
   */
  function render(filter = 'all') {
    const container = document.getElementById('taskList');
    if (!container) return;

    const filteredTasks = filter === 'all' 
      ? tasks 
      : tasks.filter(t => t.status === filter);

    if (filteredTasks.length === 0) {
      container.innerHTML = '<div class="empty-state">No tasks yet</div>';
      return;
    }

    container.innerHTML = filteredTasks.map(task => {
      const deps = task.dependencies || [];
      const depNames = deps.map(depId => {
        const depTask = tasks.find(t => t.id === depId);
        return depTask ? depTask.name : depId;
      }).join(', ');

      return `
        <div class="task-item status-${task.status}">
          <div class="task-status-icon status-${task.status}">
            ${getStatusIcon(task.status)}
          </div>
          <div class="task-info">
            <div class="task-name">${task.name}</div>
            <div class="task-id">${task.id}</div>
            ${depNames ? `<div class="task-dependencies">Depends on: ${depNames}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
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
  };
})();

// Export for use in other modules
window.TaskList = TaskList;
