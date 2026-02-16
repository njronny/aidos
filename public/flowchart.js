// Flowchart Module - With Project Selection
(function() {
  var API_URL = '';
  var currentTasks = [];
  var currentProjectId = null;
  var projects = [];
  var requirements = [];
  
  function generateMermaid(tasks) {
    if (!tasks || tasks.length === 0) {
      return 'flowchart TD\n    empty[No tasks in this project]';
    }

    var lines = ['flowchart TD'];
    
    // 状态颜色映射
    var statusColors = {
      pending: '#64748b',
      in_progress: '#3b82f6', 
      completed: '#10b981',
      failed: '#ef4444',
      blocked: '#f59e0b'
    };
    
    // 添加样式定义
    lines.push('    %% 样式定义');
    lines.push('    classDef pending fill:#64748b,stroke:#334155,color:#fff');
    lines.push('    classDef in_progress fill:#3b82f6,stroke:#2563eb,color:#fff');
    lines.push('    classDef completed fill:#10b981,stroke:#059669,color:#fff');
    lines.push('    classDef failed fill:#ef4444,stroke:#dc2626,color:#fff');
    lines.push('    classDef blocked fill:#f59e0b,stroke:#d97706,color:#fff');
    
    // Add nodes with status styling
    tasks.forEach(function(task) {
      var label = (task.title || task.name || 'Untitled').substring(0, 25);
      var status = task.status || 'pending';
      var nodeId = 't' + task.id.substring(0,6);
      lines.push('    ' + nodeId + '["' + label + '"]');
      lines.push('    class ' + nodeId + ' ' + status);
    });
    
    // 尝试从任务依赖关系创建边
    // 如果有依赖关系数据，使用它；否则按顺序连接
    var hasDeps = tasks.some(function(t) { return t.dependencies && t.dependencies.length > 0; });
    
    if (hasDeps) {
      tasks.forEach(function(task) {
        if (task.dependencies && task.dependencies.length > 0) {
          var targetId = 't' + task.id.substring(0,6);
          task.dependencies.forEach(function(depId) {
            var sourceId = 't' + depId.substring(0,6);
            lines.push('    ' + sourceId + ' --> ' + targetId);
          });
        }
      });
    } else {
      // 默认按顺序连接
      for (var i = 0; i < tasks.length - 1; i++) {
        lines.push('    t' + tasks[i].id.substring(0,6) + ' --> t' + tasks[i+1].id.substring(0,6));
      }
    }
    
    return lines.join('\n');
  }
  
  function render(tasks) {
    currentTasks = tasks || [];
    var container = document.getElementById('flowchart');
    if (!container) return;
    
    if (currentTasks.length === 0) {
      container.innerHTML = '<div class="empty-state">No tasks in this project</div>';
      return;
    }
    
    var mermaidCode = generateMermaid(currentTasks);
    container.innerHTML = mermaidCode;
    
    if (typeof mermaid !== 'undefined') {
      mermaid.run({ nodes: [container] }).catch(function(e) {
        container.innerHTML = '<pre>' + mermaidCode + '</pre>';
      });
    } else {
      container.innerHTML = '<pre>' + mermaidCode + '</pre>';
    }
  }
  
  function loadTasksForProject(projectId) {
    currentProjectId = projectId;
    
    // 获取该项目的需求
    fetch(API_URL + '/api/requirements?projectId=' + projectId)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.data) {
          requirements = data.data;
          
          // 获取所有任务，然后过滤
          fetch(API_URL + '/api/tasks')
            .then(function(res) { return res.json(); })
            .then(function(taskData) {
              if (taskData.success && taskData.data) {
                // 过滤出属于该项目需求的任务
                var reqIds = requirements.map(function(r) { return r.id; });
                var filteredTasks = taskData.data.filter(function(t) {
                  return reqIds.indexOf(t.requirementId) !== -1;
                });
                render(filteredTasks);
              }
            });
        }
      });
  }
  
  function renderProjectSelector() {
    var container = document.getElementById('flowchartProjectSelector');
    if (!container) return;
    
    fetch(API_URL + '/api/projects')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.data) {
          projects = data.data;
          
          var html = '<select id="projectSelect" onchange="Flowchart.changeProject(this.value)">';
          html += '<option value="">-- Select Project --</option>';
          projects.forEach(function(p) {
            html += '<option value="' + p.id + '">' + (p.name || 'Untitled') + '</option>';
          });
          html += '</select>';
          container.innerHTML = html;
          
          // 默认选择第一个项目
          if (projects.length > 0) {
            loadTasksForProject(projects[0].id);
            document.getElementById('projectSelect').value = projects[0].id;
          }
        }
      });
  }
  
  window.Flowchart = {
    refresh: function() {
      renderProjectSelector();
    },
    
    changeProject: function(projectId) {
      if (projectId) {
        loadTasksForProject(projectId);
      } else {
        render([]);
      }
    }
  };
})();
