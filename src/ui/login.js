// Login functionality
const API_URL = 'http://127.0.0.1:3000';
const Login = {
  tokenKey: 'aidos_auth_token',
  userKey: 'aidos_user',

  // Check if user is logged in
  isLoggedIn() {
    const token = localStorage.getItem(this.tokenKey);
    return !!token;
  },

  // Get stored token
  getToken() {
    return localStorage.getItem(this.tokenKey);
  },

  // Get stored user
  getUser() {
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  },

  // Login function
  async login(username, password) {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token and user info
        localStorage.setItem(this.tokenKey, data.data.token);
        localStorage.setItem(this.userKey, JSON.stringify({
          username: data.data.username,
        }));
        return { success: true };
      } else {
        // Fallback: 允许使用默认账户登录（演示模式）
        if (username === 'admin' && password === 'aidos123') {
          localStorage.setItem(this.tokenKey, 'demo_token_' + Date.now());
          localStorage.setItem(this.userKey, JSON.stringify({ username: 'admin' }));
          return { success: true };
        }
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      // Fallback: 离线模式允许登录（演示用）
      if (username === 'admin' && password === 'aidos123') {
        localStorage.setItem(this.tokenKey, 'demo_token_' + Date.now());
        localStorage.setItem(this.userKey, JSON.stringify({ username: 'admin' }));
        return { success: true, demo: true };
      }
      return { success: false, error: '登录失败，请检查服务器是否运行' };
    }
  },

  // Logout function
  async logout() {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Clear stored data
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  },

  // Verify token
  async verifyToken() {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  },

  // Show login page
  showLoginPage() {
    document.querySelector('.login-page').classList.remove('hidden');
    document.querySelector('.app-container').classList.add('hidden');
  },

  // Show main app
  showMainApp() {
    document.querySelector('.login-page').classList.add('hidden');
    document.querySelector('.app-container').classList.remove('hidden');
  },

  // Update header with user info
  updateHeader() {
    const user = this.getUser();
    const headerRight = document.querySelector('.header-right');
    
    // Remove existing user info and logout button
    const existingUserInfo = headerRight.querySelector('.header-user-info');
    const existingLogout = headerRight.querySelector('.header-logout');
    
    if (existingUserInfo) existingUserInfo.remove();
    if (existingLogout) existingLogout.remove();

    // Add user info and logout button
    if (user) {
      const userInfo = document.createElement('div');
      userInfo.className = 'header-user-info';
      userInfo.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
        </svg>
        ${user.username}
      `;

      const logoutBtn = document.createElement('button');
      logoutBtn.className = 'header-logout';
      logoutBtn.textContent = 'Logout';
      logoutBtn.onclick = () => Login.logout().then(() => Login.showLoginPage());

      headerRight.insertBefore(logoutBtn, headerRight.firstChild);
      headerRight.insertBefore(userInfo, headerRight.firstChild);
    }
  },

  // Add auth header to fetch requests
  async authenticatedFetch(url, options = {}) {
    const token = this.getToken();
    if (!token) {
      this.showLoginPage();
      throw new Error('Not authenticated');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(url, { ...options, headers });

    // If unauthorized, redirect to login
    if (response.status === 401) {
      this.showLoginPage();
      throw new Error('Unauthorized');
    }

    return response;
  }
};

// Login page event handlers
document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');

  // Check if already logged in
  if (Login.isLoggedIn()) {
    const isValid = await Login.verifyToken();
    if (isValid) {
      Login.showMainApp();
      Login.updateHeader();
      return;
    } else {
      // Token invalid, clear and show login
      localStorage.removeItem(Login.tokenKey);
      localStorage.removeItem(Login.userKey);
    }
  }

  // Show login page
  Login.showLoginPage();

  // Handle login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();

      if (!username || !password) {
        loginError.textContent = '请输入用户名和密码';
        loginError.classList.remove('hidden');
        return;
      }

      // Show loading state
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span class="spinner"></span>登录中...';
      loginError.classList.add('hidden');

      const result = await Login.login(username, password);

      if (result.success) {
        Login.showMainApp();
        Login.updateHeader();
        // Initialize the app
        Log.add('info', 'AIDOS UI initialized');
        WebSocket.connect();
        Dashboard.refresh();
        loadProjects();
        TaskList.refresh();
      } else {
        loginError.textContent = result.error;
        loginError.classList.remove('hidden');
      }

      // Reset button state
      loginBtn.disabled = false;
      loginBtn.textContent = '登录';
    });
  }
});

// TODO: 暂时禁用 fetch 覆盖用于调试
// const originalFetch = window.fetch;
// window.fetch = async function(url, options = {}) {
//   if (typeof url === 'string' && url.startsWith(API_URL) && !url.includes('/auth/')) {
//     const token = Login.getToken();
//     if (token) {
//       options.headers = {
//         ...options.headers,
//         'Authorization': `Bearer ${token}`,
//       };
//     }
//   }
//   return originalFetch(url, options);
// };
