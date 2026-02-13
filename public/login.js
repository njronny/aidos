(function() {
  var API_URL = '';
  window.Login = {
    tokenKey: 'aidos_auth_token',
    
    isLoggedIn: function() {
      return !!localStorage.getItem(this.tokenKey);
    },
    
    login: function(username, password) {
      if (username === 'admin' && password === 'aidos123') {
        localStorage.setItem(this.tokenKey, 'demo_token_123');
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({ success: false, error: 'Invalid credentials' });
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
