// Projects Module with Requirements and Tasks
(function() {
  var API_URL = '';
  
  window.loadProjects = function() {
    console.log('Loading projects...');
    
    // 显示加载骨架屏
    var list = document.getElementById('projectsList');
    if (list) {
      list.innerHTML = '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>';
    }
    
    fetch(API_URL + '/api/projects')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var list = document.getElementById('projectsList');
        if (!list) {
          console.log('projectsList not found');
          return;
        }
        
        if (data.success && data.data && data.data.length > 0) {
          // 为每个项目加载需求和任务
          var projectsHtml = '';
          
          data.data.forEach(function(project) {
            projectsHtml += '<div class="project-card" data-id="' + project.id + '">';
            projectsHtml += '<div class="project-header">';
            projectsHtml += '<h3>' + (project.name || 'Untitled') + '</h3>';
            projectsHtml += '<span class="status-badge">' + (project.status || 'active') + '</span>';
            projectsHtml += '</div>';
            projectsHtml += '<p>' + (project.description || '') + '</p>';
            projectsHtml += '<div class="project-actions">';
            projectsHtml += '<button onclick="loadProjectDetails(\'' + project.id + '\')">查看详情</button>';
            projectsHtml += '<button onclick="restartProject(\'' + project.id + '\')">重新开始</button>';
            projectsHtml += '</div>';
            projectsHtml += '<div class="project-details" id="details-' + project.id + '" style="display:none"></div>';
            projectsHtml += '</div>';
          });
          
          list.innerHTML = projectsHtml;
        } else {
          list.innerHTML = '<div class="empty-state">No projects yet. Click "New Requirement" to start!</div>';
        }
      })
      .catch(function(e) { 
        console.log('Load projects error:', e); 
      });
  };
  
  // 加载项目详情（需求和任务）
  window.loadProjectDetails = function(projectId) {
    var detailsDiv = document.getElementById('details-' + projectId);
    if (!detailsDiv) return;
    
    if (detailsDiv.style.display === 'none') {
      detailsDiv.style.display = 'block';
      
      // 加载需求
      fetch(API_URL + '/api/requirements?projectId=' + projectId)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          var html = '<div class="requirements-section">';
          html += '<h4>需求 (Requirements)</h4>';
          
          if (data.success && data.data && data.data.length > 0) {
            data.data.forEach(function(req) {
              html += '<div class="requirement-item">';
              html += '<span class="req-title">' + (req.title || '') + '</span>';
              html += '<span class="req-status">' + (req.status || 'pending') + '</span>';
              html += '</div>';
              
              // 加载该需求的任务
              fetch(API_URL + '/api/tasks?requirementId=' + req.id)
                .then(function(res) { return res.json(); })
                .then(function(taskData) {
                  if (taskData.success && taskData.data) {
                    var taskHtml = '<div class="tasks-section" style="margin-left:20px">';
                    taskData.data.forEach(function(task) {
                      taskHtml += '<div class="task-item">';
                      taskHtml += '<span class="task-status">' + (task.status === 'completed' ? '✓' : '○') + '</span>';
                      taskHtml += '<span>' + (task.title || '') + '</span>';
                      taskHtml += '<span class="task-status-badge">' + (task.status || 'pending') + '</span>';
                      taskHtml += '</div>';
                    });
                    taskHtml += '</div>';
                    // 这里需要改进显示
                  }
                });
            });
          } else {
            html += '<p>暂无需求</p>';
          }
          
          html += '</div>';
          detailsDiv.innerHTML = html;
        });
    } else {
      detailsDiv.style.display = 'none';
    }
  };
  
  // 重新开始项目
  window.restartProject = function(projectId) {
    if (!confirm('确定要重新开始这个项目吗？')) return;
    
    // 触发工作流
    fetch(API_URL + '/api/projects/' + projectId)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.data && data.data.requirements) {
          data.data.requirements.forEach(function(req) {
            fetch(API_URL + '/api/workflows/trigger', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ requirementId: req.id })
            });
          });
        }
        alert('项目已重新开始！');
        loadProjects();
      })
      .catch(function(e) {
        console.error('Restart error:', e);
        alert('重新开始失败');
      });
  };
})();
