// Dashboard - Fixed progress calculation
(function() {
  var API_URL = '';
  
  window.Dashboard = {
    refresh: function() {
      // 获取系统状态
      fetch(API_URL + '/api/status').then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.success && d.data) {
          var s = d.data;
          
          // 更新任务统计
          var el;
          el = document.getElementById('totalTasks'); if(el) el.textContent = s.tasks.total;
          el = document.getElementById('completedTasks'); if(el) el.textContent = s.tasks.completed;
          el = document.getElementById('runningTasks'); if(el) el.textContent = s.tasks.in_progress;
          el = document.getElementById('failedTasks'); if(el) el.textContent = s.tasks.failed;
          el = document.getElementById('pendingTasks'); if(el) el.textContent = s.tasks.pending;
          
          // 进度
          var pct = s.tasks.total > 0 ? Math.round(s.tasks.completed / s.tasks.total * 100) : 0;
          var fill = document.getElementById('progressFill');
          var pctx = document.getElementById('progressPercent');
          if(fill) fill.style.width = pct + '%';
          if(pctx) pctx.textContent = pct + '%';
          
          // 更新代理状态
          var agentStatusEl = document.getElementById('agentStatus');
          if (agentStatusEl) {
            var idle = s.agents.filter(function(a) { return a.status === 'idle'; }).length;
            var busy = s.agents.filter(function(a) { return a.status === 'busy'; }).length;
            agentStatusEl.innerHTML = '<span style="color:#22c55e">● ' + idle + ' 空闲</span> &nbsp; <span style="color:#f59e0b">● ' + busy + ' 忙碌</span>';
          }
          
          // 更新成功率
          var successRateEl = document.getElementById('successRate');
          if (successRateEl) {
            successRateEl.textContent = s.successRate + '%';
          }
          
          // 更新内存
          var memEl = document.getElementById('memoryUsage');
          if (memEl && s.memory) {
            var usedMB = Math.round(s.memory.heapUsed / 1024 / 1024);
            memEl.textContent = usedMB + ' MB';
          }
        }
      });
      
      fetch(API_URL + '/api/projects').then(function(r) { return r.json(); })
      .then(function(d) {
        var el = document.getElementById('totalProjects');
        if (el && d.success) el.textContent = d.data ? d.data.length : 0;
      });
    }
  };
})();
