// Dashboard Module
const Dashboard = {
  refresh: function() {
    // 获取项目数据
    fetch('/api/projects')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.data) {
          document.getElementById('totalProjects').textContent = data.data.length || 0;
        }
      })
      .catch(function(e) { console.log('Dashboard error:', e); });
    
    // 获取任务数据
    fetch('/api/tasks')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.data) {
          var tasks = data.data;
          document.getElementById('totalTasks').textContent = tasks.length || 0;
          var completed = tasks.filter(function(t) { return t.status === 'completed'; }).length;
          var running = tasks.filter(function(t) { return t.status === 'running'; }).length;
          var failed = tasks.filter(function(t) { return t.status === 'failed'; }).length;
          var pending = tasks.filter(function(t) { return t.status === 'pending'; }).length;
          document.getElementById('completedTasks').textContent = completed;
          document.getElementById('runningTasks').textContent = running;
          document.getElementById('failedTasks').textContent = failed;
          document.getElementById('pendingTasks').textContent = pending;
          
          var percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
          document.getElementById('progressFill').style.width = percent + '%';
          document.getElementById('progressPercent').textContent = percent + '%';
        }
      })
      .catch(function(e) { console.log('Tasks error:', e); });
  }
};
