/**
 * Authentication End-to-End Tests
 * 
 * Tests the complete authentication flow:
 * 1. Login with valid credentials
 * 2. Login with invalid credentials
 * 3. Token refresh flow
 * 4. Token verification
 * 5. Logout
 * 6. Protected route access
 */

import { test, expect } from '@playwright/test';

interface AuthResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    username: string;
    expiresIn: string;
  };
  error?: string;
}

interface VerifyResponse {
  success: boolean;
  valid: boolean;
  username?: string;
}

test.describe('Authentication E2E', () => {
  const BASE_URL = 'http://localhost:3000';

  test('should login successfully with valid credentials', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        username: 'admin',
        password: 'aidos123',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json() as AuthResponse;
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('accessToken');
    expect(data.data).toHaveProperty('refreshToken');
    expect(data.data?.username).toBe('admin');
    expect(data.data?.expiresIn).toBe('24h');

    console.log('✅ Login successful with valid credentials');
  });

  test('should fail login with invalid username', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        username: 'wronguser',
        password: 'aidos123',
      },
    });

    expect(response.status()).toBe(401);
    const data = await response.json() as AuthResponse;
    expect(data.success).toBe(false);
    expect(data.error).toContain('错误');

    console.log('✅ Login failed with invalid username');
  });

  test('should fail login with invalid password', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        username: 'admin',
        password: 'wrongpassword',
      },
    });

    expect(response.status()).toBe(401);
    const data = await response.json() as AuthResponse;
    expect(data.success).toBe(false);
    expect(data.error).toContain('错误');

    console.log('✅ Login failed with invalid password');
  });

  test('should fail login with missing credentials', async ({ request }) => {
    // Missing both username and password
    const response1 = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {},
    });
    expect(response1.status()).toBe(400);
    let data = await response1.json() as AuthResponse;
    expect(data.success).toBe(false);

    // Missing password only
    const response2 = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { username: 'admin' },
    });
    expect(response2.status()).toBe(400);
    data = await response2.json() as AuthResponse;
    expect(data.success).toBe(false);

    // Missing username only
    const response3 = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { password: 'aidos123' },
    });
    expect(response3.status()).toBe(400);
    data = await response3.json() as AuthResponse;
    expect(data.success).toBe(false);

    console.log('✅ Login failed with missing credentials');
  });

  test('should verify token successfully', async ({ request }) => {
    // First login to get a valid token
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        username: 'admin',
        password: 'aidos123',
      },
    });
    const loginData = await loginResponse.json() as AuthResponse;
    const accessToken = loginData.data?.accessToken;

    // Verify the token
    const verifyResponse = await request.get(`${BASE_URL}/api/auth/verify`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(verifyResponse.ok()).toBeTruthy();
    const verifyData = await verifyResponse.json() as VerifyResponse;
    expect(verifyData.success).toBe(true);
    expect(verifyData.valid).toBe(true);
    expect(verifyData.username).toBe('admin');

    console.log('✅ Token verification successful');
  });

  test('should fail verification with invalid token', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/auth/verify`, {
      headers: {
        authorization: 'Bearer invalid-token-12345',
      },
    });

    expect(response.status()).toBe(401);
    const data = await response.json() as VerifyResponse;
    expect(data.valid).toBe(false);

    console.log('✅ Token verification failed with invalid token');
  });

  test('should fail verification without token', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/auth/verify`);

    expect(response.status()).toBe(401);
    const data = await response.json() as VerifyResponse;
    expect(data.valid).toBe(false);

    console.log('✅ Token verification failed without token');
  });

  test('should refresh token successfully', async ({ request }) => {
    // First login to get tokens
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        username: 'admin',
        password: 'aidos123',
      },
    });
    const loginData = await loginResponse.json() as AuthResponse;
    const refreshToken = loginData.data?.refreshToken;
    const oldAccessToken = loginData.data?.accessToken;

    // Refresh the token
    const refreshResponse = await request.post(`${BASE_URL}/api/auth/refresh`, {
      data: {
        refreshToken,
      },
    });

    expect(refreshResponse.ok()).toBeTruthy();
    const refreshData = await refreshResponse.json() as AuthResponse;
    expect(refreshData.success).toBe(true);
    expect(refreshData.data).toHaveProperty('accessToken');
    expect(refreshData.data?.username).toBe('admin');
    expect(refreshData.data?.accessToken).not.toBe(oldAccessToken);

    console.log('✅ Token refresh successful');
  });

  test('should fail refresh with invalid token', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/refresh`, {
      data: {
        refreshToken: 'invalid-refresh-token',
      },
    });

    expect(response.status()).toBe(401);
    const data = await response.json() as AuthResponse;
    expect(data.success).toBe(false);
    expect(data.error).toContain('无效');

    console.log('✅ Token refresh failed with invalid token');
  });

  test('should fail refresh with missing token', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/refresh`, {
      data: {},
    });

    expect(response.status()).toBe(400);
    const data = await response.json() as AuthResponse;
    expect(data.success).toBe(false);

    console.log('✅ Token refresh failed with missing token');
  });

  test('should logout successfully', async ({ request }) => {
    // First login
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        username: 'admin',
        password: 'aidos123',
      },
    });
    const loginData = await loginResponse.json() as AuthResponse;
    const accessToken = loginData.data?.accessToken;
    const refreshToken = loginData.data?.refreshToken;

    // Logout
    const logoutResponse = await request.post(`${BASE_URL}/api/auth/logout`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      data: {
        refreshToken,
      },
    });

    expect(logoutResponse.ok()).toBeTruthy();
    const logoutData = await logoutResponse.json() as AuthResponse;
    expect(logoutData.success).toBe(true);

    // Token should still be valid (JWT is stateless), but refresh token should be invalidated
    const verifyResponse = await request.get(`${BASE_URL}/api/auth/verify`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    const verifyData = await verifyResponse.json() as VerifyResponse;
    expect(verifyData.valid).toBe(true);

    console.log('✅ Logout successful');
  });

  test('should access protected route with valid token', async ({ request }) => {
    // First login
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        username: 'admin',
        password: 'aidos123',
      },
    });
    const loginData = await loginResponse.json() as AuthResponse;
    const accessToken = loginData.data?.accessToken;

    // Try to access protected route (projects list)
    const projectsResponse = await request.get(`${BASE_URL}/api/projects`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(projectsResponse.ok()).toBeTruthy();

    console.log('✅ Protected route accessed with valid token');
  });

  test('should deny access to protected route without token', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/projects`);

    expect(response.status()).toBe(401);

    console.log('✅ Protected route denied without token');
  });

  test('should deny access to protected route with invalid token', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/projects`, {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });

    expect(response.status()).toBe(401);

    console.log('✅ Protected route denied with invalid token');
  });

  test('should maintain session across multiple requests', async ({ request }) => {
    // Login
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        username: 'admin',
        password: 'aidos123',
      },
    });
    const loginData = await loginResponse.json() as AuthResponse;
    const accessToken = loginData.data?.accessToken;

    // Make multiple requests with the same token
    for (let i = 0; i < 3; i++) {
      const verifyResponse = await request.get(`${BASE_URL}/api/auth/verify`, {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const verifyData = await verifyResponse.json() as VerifyResponse;
      expect(verifyData.valid).toBe(true);
    }

    console.log('✅ Session maintained across multiple requests');
  });

  test('should handle complete auth flow', async ({ request }) => {
    console.log('🔐 Testing complete authentication flow...');

    // Step 1: Login
    console.log('   📝 Step 1: Login');
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        username: 'admin',
        password: 'aidos123',
      },
    });
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json() as AuthResponse;
    const accessToken = loginData.data?.accessToken;
    const refreshToken = loginData.data?.refreshToken;
    console.log('   ✅ Logged in');

    // Step 2: Verify token
    console.log('   📝 Step 2: Verify token');
    const verifyResponse = await request.get(`${BASE_URL}/api/auth/verify`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    expect(verifyResponse.ok()).toBeTruthy();
    console.log('   ✅ Token verified');

    // Step 3: Access protected route
    console.log('   📝 Step 3: Access protected route');
    const projectsResponse = await request.get(`${BASE_URL}/api/projects`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    expect(projectsResponse.ok()).toBeTruthy();
    console.log('   ✅ Protected route accessed');

    // Step 4: Refresh token
    console.log('   📝 Step 4: Refresh token');
    const refreshResponse = await request.post(`${BASE_URL}/api/auth/refresh`, {
      data: {
        refreshToken,
      },
    });
    expect(refreshResponse.ok()).toBeTruthy();
    const refreshData = await refreshResponse.json() as AuthResponse;
    const newAccessToken = refreshData.data?.accessToken;
    console.log('   ✅ Token refreshed');

    // Step 5: Use new token
    console.log('   📝 Step 5: Use new token');
    const newVerifyResponse = await request.get(`${BASE_URL}/api/auth/verify`, {
      headers: {
        authorization: `Bearer ${newAccessToken}`,
      },
    });
    expect(newVerifyResponse.ok()).toBeTruthy();
    console.log('   ✅ New token works');

    // Step 6: Logout
    console.log('   📝 Step 6: Logout');
    const logoutResponse = await request.post(`${BASE_URL}/api/auth/logout`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      data: {
        refreshToken,
      },
    });
    expect(logoutResponse.ok()).toBeTruthy();
    console.log('   ✅ Logged out');

    console.log('🎉 Complete authentication flow tested successfully!');
  });
});
