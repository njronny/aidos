var API_URL = "";
/**
 * AIDOS Web UI - Enhanced UI Module
 * 
 * Features:
 * - Project Detail Modal
 * - Task Log Viewer
 * - Enhanced Error Display
 * - Real-time Progress Optimization
 */

const UI = (function() {
  // Project Detail Modal
  function showProjectDetail(projectId) {
    fetch(`${API_URL}/api/projects/${projectId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          renderProjectDetailModal(data.data);
        } else {
          showError('Failed to load project details');
        }
      })
      .catch(err => showError('Error loading project: ' + err.message));
  }

  function renderProjectDetailModal(project) {
    const modalHtml = `
      <div class="modal" id="projectDetailModal">
        <div class="modal-content modal-lg">
          <div class="modal-header">
            <h2>📁 ${escapeHtml(project.name)}</h2>
            <button class="modal-close" onclick="closeProjectDetailModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="project-detail-header">
              <span class="project-status ${project.status}">${project.status}</span>
              <span class="project-date">Created: ${formatDate(project.createdAt)}</span>
            </div>
            <p class="project-detail-desc">${escapeHtml(project.description || 'No description')}</p>
            
            <div class="project-stats">
              <div class="stat-card">
                <div class="stat-value" id="detailTasks">-</div>
                <div class="stat-label">Tasks</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" id="detailCompleted">-</div>
                <div class="stat-label">Completed</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" id="detailRunning">-</div>
                <div class="stat-label">Running</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" id="detailFailed">-</div>
                <div class="stat-label">Failed</div>
              </div>
            </div>
            
            <h3>Requirements</h3>
            <div class="requirements-detail-list" id="requirementsList">
              Loading...
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('projectDetailModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('projectDetailModal').classList.add('active');

    // Load requirements and tasks
    loadProjectDetails(project.id);
  }

  function loadProjectDetails(projectId) {
    // Load requirements
    fetch(`${API_URL}/api/requirements?projectId=${projectId}`)
      .then(res => res.json())
      .then(data => {
        const container = document.getElementById('requirementsList');
        if (data.success && data.data && data.data.length > 0) {
          container.innerHTML = data.data.map(req => `
            <div class="requirement-detail-item">
              <div class="req-detail-header">
                <span class="req-title">${escapeHtml(req.title)}</span>
                <span class="req-priority ${req.priority}">${req.priority}</span>
              </div>
              <p class="req-desc">${escapeHtml(req.description || '')}</p>
              <div class="req-meta">
                <span>Status: ${req.status || 'pending'}</span>
              </div>
            </div>
          `).join('');
        } else {
          container.innerHTML = '<div class="empty-state">No requirements</div>';
        }
      });

    // Load tasks
    fetch(`${API_URL}/api/tasks?projectId=${projectId}`)
      .then(res => res.json())
      .then(data => {
        const tasks = data.success ? data.data || [] : [];
        
        document.getElementById('detailTasks').textContent = tasks.length;
        document.getElementById('detailCompleted').textContent = tasks.filter(t => t.status === 'completed').length;
        document.getElementById('detailRunning').textContent = tasks.filter(t => t.status === 'running').length;
        document.getElementById('detailFailed').textContent = tasks.filter(t => t.status === 'failed').length;
      });
  }

  function closeProjectDetailModal() {
    const modal = document.getElementById('projectDetailModal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    }
  }

  // Task Log Viewer
  function showTaskLogs(taskId) {
    fetch(`${API_URL}/api/tasks/${taskId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          renderTaskLogModal(data.data);
        } else {
          showError('Failed to load task logs');
        }
      })
      .catch(err => showError('Error loading task: ' + err.message));
  }

  function renderTaskLogModal(task) {
    const logs = task.logs || [];
    const logsHtml = logs.length > 0 ? logs.map(log => `
      <div class="log-entry ${getLogLevelClass(log.level)}">
        <span class="log-time">[${formatTime(log.timestamp)}]</span>
        <span class="log-message">${escapeHtml(log.message)}</span>
      </div>
    `).join('') : '<div class="empty-state">No logs available</div>';

    const modalHtml = `
      <div class="modal" id="taskLogModal">
        <div class="modal-content modal-lg">
          <div class="modal-header">
            <h2>📋 Task Logs: ${escapeHtml(task.name)}</h2>
            <button class="modal-close" onclick="closeTaskLogModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="task-detail-info">
              <span class="task-detail-status status-${task.status}">${task.status}</span>
              <span class="task-detail-id">ID: ${task.id}</span>
            </div>
            <div class="task-logs-container" id="taskLogsContainer">
              ${logsHtml}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="downloadTaskLogs('${task.id}')">📥 Download Logs</button>
            <button class="btn-primary" onclick="closeTaskLogModal()">Close</button>
          </div>
        </div>
      </div>
    `;

    const existingModal = document.getElementById('taskLogModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('taskLogModal').classList.add('active');
  }

  function closeTaskLogModal() {
    const modal = document.getElementById('taskLogModal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    }
  }

  function downloadTaskLogs(taskId) {
    fetch(`${API_URL}/api/tasks/${taskId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const logs = data.data.logs || [];
          const content = logs.map(log => `[${log.timestamp}] [${log.level}] ${log.message}`).join('\n');
          const blob = new Blob([content], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `task-${taskId}-logs.txt`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
  }

  // Enhanced Error Display
  function showError(message, details = null) {
    const errorHtml = `
      <div class="error-toast" id="errorToast">
        <div class="error-icon">⚠️</div>
        <div class="error-content">
          <div class="error-message">${escapeHtml(message)}</div>
          ${details ? `<div class="error-details">${escapeHtml(details)}</div>` : ''}
        </div>
        <button class="error-close" onclick="dismissError()">&times;</button>
      </div>
    `;

    const existing = document.getElementById('errorToast');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', errorHtml);
    
    // Auto dismiss after 10 seconds
    setTimeout(() => {
      const toast = document.getElementById('errorToast');
      if (toast) {
        toast.classList.add('fading');
        setTimeout(() => toast.remove(), 500);
      }
    }, 10000);
  }

  function dismissError() {
    const toast = document.getElementById('errorToast');
    if (toast) {
      toast.classList.add('fading');
      setTimeout(() => toast.remove(), 500);
    }
  }

  // Real-time Progress Enhancement
  function updateProgressBar(elementId, percent, animated = true) {
    const el = document.getElementById(elementId);
    if (el) {
      if (animated) {
        el.style.transition = 'width 0.5s ease-out';
      }
      el.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
  }

  function animateProgress(from, to, duration = 500) {
    const start = performance.now();
    const diff = to - from;
    
    function update(currentTime) {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (diff * eased);
      
      updateProgressBar('progressFill', current, false);
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    
    requestAnimationFrame(update);
  }

  // Utility functions
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatTime(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function getLogLevelClass(level) {
    switch (level) {
      case 'info': return 'log-info';
      case 'success': 
      case 'completed': return 'log-success';
      case 'warning':
      case 'warn': return 'log-warning';
      case 'error':
      case 'failed': return 'log-error';
      default: return 'log-info';
    }
  }

  return {
    showProjectDetail,
    closeProjectDetailModal,
    showTaskLogs,
    closeTaskLogModal,
    downloadTaskLogs,
    showError,
    dismissError,
    updateProgressBar,
    animateProgress,
    escapeHtml,
    formatDate,
  };
})();

// Make globally available
window.UI = UI;
window.showProjectDetail = UI.showProjectDetail;
window.closeProjectDetailModal = UI.closeProjectDetailModal;
window.showTaskLogs = UI.showTaskLogs;
window.closeTaskLogModal = UI.closeTaskLogModal;
window.downloadTaskLogs = UI.downloadTaskLogs;
window.dismissError = UI.dismissError;
