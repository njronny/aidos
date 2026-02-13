// TaskList Module with Project/Requirement relationship
(function() {
  var API_URL = '';
  var tasks = [];
  
  function render() {
    var container = document.getElementById('taskList');
    if (!container) {
      console.log('taskList container not found');
      return;
    }
    
    console.log('Rendering tasks:', tasks.length);
    
    if (tasks.length === 0) {
      container.innerHTML = '<div class="empty-state">No tasks</div>';
      return;
    }
    
    var html = '';
    tasks.forEach(function(t) {
      html += '<div class="task-item" data-id="' + t.id + '">';
      html += '<span class="task-status">' + (t.status === 'completed' ? '✓' : t.status === 'running' ? '◐' : '○') + '</span>';
      html += '<div class="task-content">';
      html += '<span class="task-title">' + (t.title || 'Untitled') + '</span>';
      html += '<span class="task-desc">' + (t.description || '') + '</span>';
      html += '</div>';
      html += '<span class="task-status-badge">' + (t.status || 'pending') + '</span>';
      html += '<button class="task-action" onclick="runTask(\'' + t.id + '\')">执行</button>';
      html += '</div>';
    });
    
    container.innerHTML = html;
  }
  
  window.TaskList = {
    refresh: function() {
      console.log('TaskList refresh...');
      fetch(API_URL + '/api/tasks')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.success && data.data) {
            tasks = data.data;
            console.log('Got tasks:', tasks.length);
            render();
          }
        })
        .catch(function(e) { console.error('TaskList error:', e); });
    },
    
    // 执行单个任务
    runTask: function(taskId) {
      fetch(API_URL + '/api/tasks/' + taskId + '/execute', {
        method: 'POST'
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          alert('任务已开始执行！');
          window.TaskList.refresh();
        } else {
          alert('执行失败: ' + (data.error || '未知错误'));
        }
      })
      .catch(function(e) {
        console.error(e);
        alert('执行失败');
      });
    }
  };
  
  // 全局函数供HTML调用
  window.runTask = window.TaskList.runTask;
})();
