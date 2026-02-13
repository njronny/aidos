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
    
    // Add nodes
    tasks.forEach(function(task) {
      var label = (task.title || task.name || 'Untitled').substring(0, 20);
      var status = task.status || 'pending';
      var nodeId = task.id.substring(0,8);
      lines.push('    ' + nodeId + '["' + label + ' (' + status + ')"]');
    });
    
    // Add simple sequence edges
    for (var i = 0; i < tasks.length - 1; i++) {
      lines.push('    ' + tasks[i].id.substring(0,8) + ' --> ' + tasks[i+1].id.substring(0,8));
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
