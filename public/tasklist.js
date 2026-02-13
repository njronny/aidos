// TaskList Module with Filters and Actions
(function() {
  var API_URL = '';
  var tasks = [];
  var currentFilter = 'all';
  
  function render() {
    var container = document.getElementById('taskList');
    if (!container) return;
    
    // 过滤任务
    var filtered = tasks;
    if (currentFilter !== 'all') {
      filtered = tasks.filter(function(t) { return t.status === currentFilter; });
    }
    
    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state">No tasks</div>';
      return;
    }
    
    var html = '';
    filtered.forEach(function(t) {
      var statusIcon = t.status === 'completed' ? '✓' : t.status === 'running' ? '◐' : '○';
      html += '<div class="task-item" data-id="' + t.id + '">';
      html += '<span class="task-status">' + statusIcon + '</span>';
      html += '<div class="task-content">';
      html += '<span class="task-title">' + (t.title || 'Untitled') + '</span>';
      html += '<span class="task-desc">' + (t.description || '') + '</span>';
      html += '</div>';
      html += '<span class="task-status-badge">' + (t.status || 'pending') + '</span>';
      html += '<button class="task-action" onclick="TaskList.execute(\'' + t.id + '\')">执行</button>';
      html += '</div>';
    });
    
    container.innerHTML = html;
    
    // 更新按钮状态
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      btn.classList.remove('active');
      if (btn.dataset.filter === currentFilter) {
        btn.classList.add('active');
      }
    });
  }
  
  // 页签过滤
  window.filterTasks = function(filter) {
    currentFilter = filter;
    render();
  };
  
  window.TaskList = {
    refresh: function() {
      fetch(API_URL + '/api/tasks')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.success && data.data) {
            tasks = data.data;
            render();
          }
        })
        .catch(function(e) { console.error('TaskList error:', e); });
    },
    
    // 执行任务 - 调用工作流
    execute: function(taskId) {
      // 找到任务对应的需求，然后触发工作流
      var task = tasks.find(function(t) { return t.id === taskId; });
      if (!task || !task.requirementId) {
        alert('无法执行：找不到关联的需求');
        return;
      }
      
      fetch(API_URL + '/api/workflows/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementId: task.requirementId })
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
  
  // 初始化页签点击事件
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        filterTasks(this.dataset.filter);
      });
    });
  });
})();
