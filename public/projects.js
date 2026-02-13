// Projects management UI with enhanced features
const API_URL = '';

async function loadProjects() {
  try {
    const res = await fetch(`${API_URL}/api/projects`);
    const data = await res.json();
    
    const container = document.getElementById('projectsList');
    
    if (!data.success || !data.data || data.data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📁</div>
          <div class="empty-state-text">No projects yet. Click "New Requirement" to start!</div>
        </div>
      `;
      return;
    }
    
    // Also populate existing project dropdown in modal
    populateExistingProjects(data.data);
    
    let html = '';
    for (const project of data.data) {
      // Get requirements for this project
      const reqRes = await fetch(`${API_URL}/api/requirements?projectId=${project.id}`);
      const reqData = await reqRes.json();
      const requirements = reqData.success ? reqData.data || [] : [];
      
      // Get task stats
      const taskRes = await fetch(`${API_URL}/api/tasks?projectId=${project.id}`);
      const taskData = await taskRes.json();
      const tasks = taskData.success ? taskData.data || [] : [];
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      
      html += `
        <div class="project-card project-card-clickable" onclick="showProjectDetail('${project.id}')" data-project-id="${project.id}">
          <div class="project-header">
            <h3>${escapeHtml(project.name)}</h3>
            <span class="project-status ${project.status}">${project.status}</span>
          </div>
          <p class="project-desc">${escapeHtml(project.description || 'No description')}</p>
          <div class="project-meta">
            <span>Created: ${formatDate(project.createdAt)}</span>
            <span>Requirements: ${requirements.length}</span>
            <span>Tasks: ${tasks.length}</span>
            ${tasks.length > 0 ? `<span>Progress: ${Math.round((completedTasks / tasks.length) * 100)}%</span>` : ''}
          </div>
          ${requirements.length > 0 ? `
            <div class="requirements-list">
              ${requirements.map(req => `
                <div class="requirement-item">
                  <span class="req-title">${escapeHtml(req.title)}</span>
                  <span class="req-priority ${req.priority}">${req.priority}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }
    
    container.innerHTML = html;
  } catch (error) {
    console.error('Error loading projects:', error);
    document.getElementById('projectsList').innerHTML = 
      `<div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-text">Failed to load projects. Make sure API is running.</div>
      </div>`;
  }
}

/**
 * Populate existing projects dropdown in modal
 */
async function populateExistingProjects(projects) {
  const select = document.getElementById('existingProjectId');
  if (!select) return;
  
  // Keep the first option
  let html = '<option value="">-- Select Existing Project --</option>';
  
  for (const project of projects) {
    html += `<option value="${project.id}">${escapeHtml(project.name)}</option>`;
  }
  
  select.innerHTML = html;
}

/**
 * Show project detail modal
 */
async function showProjectDetail(projectId) {
  try {
    const res = await fetch(`${API_URL}/api/projects/${projectId}`);
    const data = await res.json();
    
    if (data.success) {
      renderProjectDetailModal(data.data);
    } else {
      UI.showError('Failed to load project details', data.error);
    }
  } catch (err) {
    UI.showError('Error loading project', err.message);
  }
}

/**
 * Render project detail modal
 */
function renderProjectDetailModal(project) {
  // Get requirements
  fetch(`${API_URL}/api/requirements?projectId=${project.id}`)
    .then(res => res.json())
    .then(reqData => {
      const requirements = reqData.success ? reqData.data || [] : [];
      
      // Get tasks
      return fetch(`${API_URL}/api/tasks?projectId=${project.id}`);
    })
    .then(res => res.json())
    .then(taskData => {
      const tasks = taskData.success ? taskData.data || [] : [];
      
      // Build modal content
      const content = `
        <div class="project-detail-header">
          <span class="project-status ${project.status}">${project.status}</span>
          <span class="project-date">Created: ${formatDate(project.createdAt)}</span>
        </div>
        <p class="project-detail-desc">${escapeHtml(project.description || 'No description')}</p>
        
        <div class="project-stats">
          <div class="stat-card">
            <div class="stat-value">${tasks.length}</div>
            <div class="stat-label">Total Tasks</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${tasks.filter(t => t.status === 'completed').length}</div>
            <div class="stat-label">Completed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${tasks.filter(t => t.status === 'running').length}</div>
            <div class="stat-label">Running</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${tasks.filter(t => t.status === 'failed').length}</div>
            <div class="stat-label">Failed</div>
          </div>
        </div>
        
        <h3>Requirements</h3>
        <div class="requirements-detail-list" id="requirementsDetailList">
          ${requirements.length > 0 ? requirements.map(req => `
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
          `).join('') : '<div class="empty-state">No requirements</div>'}
        </div>
      `;
      
      // Update modal content
      const modalContent = document.getElementById('projectDetailContent');
      if (modalContent) {
        modalContent.innerHTML = content;
      }
    });
  
  // Show modal
  const modal = document.getElementById('projectDetailModal');
  if (modal) {
    modal.classList.add('active');
  }
}

/**
 * Close project detail modal
 */
function closeProjectDetailModal() {
  const modal = document.getElementById('projectDetailModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Show task logs
 */
async function showTaskLogs(taskId) {
  try {
    const res = await fetch(`${API_URL}/api/tasks/${taskId}`);
    const data = await res.json();
    
    if (data.success) {
      renderTaskLogModal(data.data);
    } else {
      UI.showError('Failed to load task logs', data.error);
    }
  } catch (err) {
    UI.showError('Error loading task', err.message);
  }
}

/**
 * Render task log modal
 */
function renderTaskLogModal(task) {
  const logs = task.logs || [];
  
  const logsHtml = logs.length > 0 ? logs.map(log => `
    <div class="log-entry ${getLogLevelClass(log.level)}">
      <span class="log-time">[${formatTime(log.timestamp)}]</span>
      <span class="log-message">${escapeHtml(log.message)}</span>
    </div>
  `).join('') : '<div class="empty-state">No logs available</div>';
  
  // Update modal content
  const logInfo = document.getElementById('taskLogInfo');
  const logContainer = document.getElementById('taskLogsContainer');
  
  if (logInfo) {
    logInfo.innerHTML = `
      <span class="task-detail-status status-${task.status}">${task.status}</span>
      <span class="task-detail-id">ID: ${task.id}</span>
    `;
  }
  
  if (logContainer) {
    logContainer.innerHTML = logsHtml;
  }
  
  // Update download button
  const downloadBtn = document.getElementById('downloadLogsBtn');
  if (downloadBtn) {
    downloadBtn.onclick = () => downloadTaskLogs(task.id);
  }
  
  // Show modal
  const modal = document.getElementById('taskLogModal');
  if (modal) {
    modal.classList.add('active');
  }
}

/**
 * Close task log modal
 */
function closeTaskLogModal() {
  const modal = document.getElementById('taskLogModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Download task logs
 */
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

/**
 * Get log level class
 */
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

/**
 * Format time
 */
function formatTime(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

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

// Update Dashboard to show projects count
const originalDashboardRefresh = Dashboard.refresh;
Dashboard.refresh = async function() {
  if (originalDashboardRefresh) {
    await originalDashboardRefresh();
  }
  
  try {
    const res = await fetch(`${API_URL}/api/projects`);
    const data = await res.json();
    const totalProjects = data.success ? data.data?.length || 0 : 0;
    document.getElementById('totalProjects').textContent = totalProjects;
  } catch (e) {
    document.getElementById('totalProjects').textContent = '-';
  }
};

// Make functions globally available
window.showProjectDetail = showProjectDetail;
window.closeProjectDetailModal = closeProjectDetailModal;
window.showTaskLogs = showTaskLogs;
window.closeTaskLogModal = closeTaskLogModal;
window.downloadTaskLogs = downloadTaskLogs;
