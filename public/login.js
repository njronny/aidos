const API_URL = '';
const Login = {
  tokenKey: 'aidos_auth_token',
  async login(username, password) {
    if (username === 'admin' && password === 'aidos123') {
      localStorage.setItem(this.tokenKey, 'demo_token');
      return { success: true };
    }
    return { success: false };
  },
  showMainApp() {
    document.querySelector('.login-page').style.display = 'none';
    document.querySelector('.app-container').style.display = 'block';
    // 初始化系统
    if (typeof loadProjects === 'function') loadProjects();
    if (typeof Dashboard !== 'undefined' && Dashboard.refresh) Dashboard.refresh();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = document.getElementById('username').value;
      const p = document.getElementById('password').value;
      const result = await Login.login(u, p);
      if (result.success) {
        Login.showMainApp();
      } else {
        alert('登录失败');
      }
    });
  }
});
