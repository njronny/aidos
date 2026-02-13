// TaskList Module - Simplified
(function() {
  var API_URL = '';
  var tasks = [];
  var currentFilter = 'all';
  
  function render() {
    var container = document.getElementById('taskList');
    if (!container) return;
    
    // 过滤
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
      var s = t.status || 'pending';
      var icon = s === 'completed' ? '✓' : s === 'in_progress' ? '◐' : s === 'failed' ? '✗' : '○';
      var text = s === 'completed' ? '已完成' : s === 'in_progress' ? '进行中' : s === 'failed' ? '失败' : '待处理';
      
      html += '<div class="task-item">';
      html += '<span class="task-status">' + icon + '</span>';
      html += '<span class="task-title">' + (t.title || 'Untitled') + '</span>';
      html += '<span class="task-status-badge">' + text + '</span>';
      if (s === 'pending') {
        html += '<button onclick="TaskList.execute(\'' + t.id + '\')">执行</button>';
      }
      html += '</div>';
    });
    container.innerHTML = html;
  }
  
  window.filterTasks = function(f) {
    currentFilter = f;
    render();
    // 更新按钮状态
    document.querySelectorAll('.filter-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.filter === f);
    });
  };
  
  window.TaskList = {
    refresh: function() {
      fetch(API_URL + '/api/tasks').then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.success && d.data) {
          tasks = d.data;
          render();
        }
      });
    },
    
    execute: function(id) {
      fetch(API_URL + '/api/tasks/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' })
      }).then(function(r) { return r.json(); })
      .then(function(d) {
        alert(d.success ? '已开始执行！' : '执行失败');
        window.TaskList.refresh();
      });
    }
  };
})();
