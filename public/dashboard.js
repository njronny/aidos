// Dashboard Module - Enhanced
(function() {
  var API_URL = '';
  
  window.Dashboard = {
    refresh: function() {
      console.log('Dashboard refresh...');
      
      // 获取项目数据
      fetch(API_URL + '/api/projects')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.success && data.data) {
            var el = document.getElementById('totalProjects');
            if (el) el.textContent = data.data.length || 0;
          }
        })
        .catch(function(e) { console.log('Dashboard error:', e); });
      
      // 获取任务数据
      fetch(API_URL + '/api/tasks')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.success && data.data) {
            var tasks = data.data;
            var el;
            el = document.getElementById('totalTasks');
            if (el) el.textContent = tasks.length || 0;
            
            var completed = tasks.filter(function(t) { return t.status === 'completed'; }).length;
            var running = tasks.filter(function(t) { return t.status === 'in_progress'; }).length;
            var failed = tasks.filter(function(t) { return t.status === 'failed'; }).length;
            var pending = tasks.filter(function(t) { return !t.status || t.status === 'pending'; }).length;
            
            el = document.getElementById('completedTasks');
            if (el) el.textContent = completed;
            el = document.getElementById('runningTasks');
            if (el) el.textContent = running;
            el = document.getElementById('failedTasks');
            if (el) el.textContent = failed;
            el = document.getElementById('pendingTasks');
            if (el) el.textContent = pending;
            
            var percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
            var fill = document.getElementById('progressFill');
            var pct = document.getElementById('progressPercent');
            if (fill) fill.style.width = percent + '%';
            if (pct) pct.textContent = percent + '%';
          }
        })
        .catch(function(e) { console.log('Tasks error:', e); });
    }
  };
})();
