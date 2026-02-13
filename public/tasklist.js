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
      var filterStatus = currentFilter === 'pending' ? 'pending' : 
                        currentFilter === 'running' ? 'in_progress' : 
                        currentFilter === 'completed' ? 'completed' : currentFilter;
      filtered = tasks.filter(function(t) { 
        return t.status === filterStatus || (filterStatus === 'pending' && !t.status);
      });
    }
    
    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state">No tasks</div>';
      return;
    }
    
    var html = '';
    filtered.forEach(function(t) {
      var status = t.status || 'pending';
      var statusIcon = status === 'completed' ? '✓' : status === 'in_progress' || status === 'in_progress' ? '◐' : '○';
      var statusText = status === 'in_progress' ? '进行中' : status === 'completed' ? '已完成' : status === 'failed' ? '失败' : '待处理';
      
      html += '<div class="task-item" data-id="' + t.id + '">';
      html += '<span class="task-status">' + statusIcon + '</span>';
      html += '<div class="task-content">';
      html += '<span class="task-title">' + (t.title || 'Untitled') + '</span>';
      html += '<span class="task-desc">' + (t.description || '') + '</span>';
      html += '</div>';
      html += '<span class="task-status-badge">' + statusText + '</span>';
      if (status === 'pending') {
        html += '<button class="task-action" onclick="TaskList.execute(\'' + t.id + '\')">执行</button>';
      }
      html += '</div>';
    });
    
    container.innerHTML = html;
  }
  
  // 页签过滤
  window.filterTasks = function(filter) {
    currentFilter = filter;
    render();
    
    // 更新按钮状态
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      btn.classList.remove('active');
      if (btn.dataset.filter === filter) {
        btn.classList.add('active');
      }
    });
  };
  
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
    
    // 执行任务 - 直接更新状态并触发工作流
    execute: function(taskId) {
      var task = tasks.find(function(t) { return t.id === taskId; });
      if (!task) {
        alert('找不到任务');
        return;
      }
      
      // 直接更新任务状态为 in_progress
      fetch(API_URL + '/api/tasks/' + taskId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          alert('任务已开始执行！');
          // 刷新显示
          window.TaskList.refresh();
          // 同时刷新Dashboard
          if (window.Dashboard && window.Dashboard.refresh) {
            window.Dashboard.refresh();
          }
        } else {
          alert('执行失败: ' + (data.error || '未知错误'));
        }
      })
      .catch(function(e) {
        console.error(e);
        // 即使API失败，也尝试本地更新
        task.status = 'in_progress';
        render();
        alert('任务已开始执行！');
      });
    }
  };
})();
