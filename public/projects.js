// Projects Module
function loadProjects() {
  fetch('/api/projects')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var list = document.getElementById('projectsList');
      if (!list) return;
      if (data.success && data.data && data.data.length > 0) {
        list.innerHTML = data.data.map(function(p) {
          return '<div class="project-card"><h3>' + (p.name || 'Untitled') + '</h3><p>' + (p.description || '') + '</p><span class="status-badge">' + (p.status || 'active') + '</span></div>';
        }).join('');
      } else {
        list.innerHTML = '<div class="empty-state">No projects yet. Click "New Requirement" to start!</div>';
      }
    })
    .catch(function(e) { 
      console.log('Load projects error:', e); 
      var list = document.getElementById('projectsList');
      if (list) list.innerHTML = '<div class="empty-state">No projects yet.</div>';
    });
}
