// Dashboard - Fixed
(function() {
  var API_URL = '';
  
  window.Dashboard = {
    refresh: function() {
      fetch(API_URL + '/api/tasks').then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.success && d.data) {
          var t = d.data;
          var total = t.length;
          // 同时处理running和in_progress
          var completed = t.filter(function(x) { return x.status === 'completed'; }).length;
          var in_progress = t.filter(function(x) { return x.status === 'in_progress' || x.status === 'running'; }).length;
          var failed = t.filter(function(x) { return x.status === 'failed'; }).length;
          var pending = t.filter(function(x) { return !x.status || x.status === 'pending'; }).length;
          
          var el;
          el = document.getElementById('totalTasks'); if(el) el.textContent = total;
          el = document.getElementById('completedTasks'); if(el) el.textContent = completed;
          el = document.getElementById('runningTasks'); if(el) el.textContent = in_progress;
          el = document.getElementById('failedTasks'); if(el) el.textContent = failed;
          el = document.getElementById('pendingTasks'); if(el) el.textContent = pending;
          
          // 进度 = 已完成 / (总数 - 进行中)
          var progressBase = total - in_progress;
          var pct = progressBase > 0 ? Math.round(completed / progressBase * 100) : 0;
          var fill = document.getElementById('progressFill');
          var pctx = document.getElementById('progressPercent');
          if(fill) fill.style.width = pct + '%';
          if(pctx) pctx.textContent = pct + '%';
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
