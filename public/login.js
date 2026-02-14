(function() {
  var API_URL = '';
  window.Login = {
    tokenKey: 'aidos_auth_token',
    
    isLoggedIn: function() {
      return !!localStorage.getItem(this.tokenKey);
    },
    
    login: function(username, password) {
      // 调用后端 API 验证
      return fetch(API_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success && data.data && data.data.token) {
          localStorage.setItem(window.Login.tokenKey, data.data.token);
          return { success: true };
        }
        return { success: false, error: data.error || '登录失败' };
      })
      .catch(function(err) {
        return { success: false, error: err.message };
      });
    },
    
    showMainApp: function() {
      var loginPage = document.getElementById('loginPage');
      if (loginPage) {
        loginPage.style.display = 'none';
        loginPage.classList.add('hidden');
      }
      var app = document.querySelector('.app-container');
      if (app) {
        app.classList.remove('hidden');
        app.style.display = 'block';
      }
      // 加载所有数据
      if (window.Dashboard && window.Dashboard.refresh) {
        window.Dashboard.refresh();
      }
      if (window.loadProjects) {
        window.loadProjects();
      }
      if (window.TaskList && window.TaskList.refresh) {
        window.TaskList.refresh();
      }
    },
    
    checkLogin: function() {
      if (this.isLoggedIn()) {
        this.showMainApp();
      }
    }
  };
  
  document.addEventListener('DOMContentLoaded', function() {
    Login.checkLogin();
    
    var form = document.getElementById('loginForm');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var u = document.getElementById('username').value.trim();
        var p = document.getElementById('password').value.trim();
        if (!u || !p) {
          alert('请输入用户名和密码');
          return;
        }
        Login.login(u, p).then(function(r) {
          if (r.success) {
            Login.showMainApp();
          } else {
            alert('登录失败: ' + (r.error || '未知错误'));
          }
        });
      });
    }
  });
})();
