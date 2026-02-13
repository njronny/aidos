// Projects management UI

async function loadProjects() {
  try {
    const res = await fetch(`${API_URL_FOR_ALL}/api/projects`);
    const data = await res.json();
    
    const container = document.getElementById('projectsList');
    
    if (!data.success || !data.data || data.data.length === 0) {
      container.innerHTML = '<div class="empty-state">No projects yet. Click "New Requirement" to start!</div>';
      return;
    }
    
    let html = '';
    for (const project of data.data) {
      // Get requirements for this project
      const reqRes = await fetch(`${API_URL_FOR_ALL}/api/requirements?projectId=${project.id}`);
      const reqData = await reqRes.json();
      const requirements = reqData.success ? reqData.data || [] : [];
      
      html += `
        <div class="project-card">
          <div class="project-header">
            <h3>${escapeHtml(project.name)}</h3>
            <span class="project-status ${project.status}">${project.status}</span>
          </div>
          <p class="project-desc">${escapeHtml(project.description || 'No description')}</p>
          <div class="project-meta">
            <span>Created: ${formatDate(project.createdAt)}</span>
            <span>Requirements: ${requirements.length}</span>
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
      '<div class="empty-state">Failed to load projects. Make sure API is running.</div>';
  }
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
    const res = await fetch(`${API_URL_FOR_ALL}/api/projects`);
    const data = await res.json();
    const totalProjects = data.success ? data.data?.length || 0 : 0;
    document.getElementById('totalProjects').textContent = totalProjects;
  } catch (e) {
    document.getElementById('totalProjects').textContent = '-';
  }
};
