/**
 * k6 Authentication Performance Test
 * 
 * Tests authentication flow performance:
 * 1. Login throughput
 * 2. Token refresh performance
 * 3. Concurrent authentication
 * 4. Session persistence
 * 
 * Run with: k6 run performance/auth-performance.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const loginErrors = new Rate('login_errors');
const refreshErrors = new Rate('refresh_errors');
const loginDuration = new Trend('login_duration');
const refreshDuration = new Trend('refresh_duration');
const verifyDuration = new Trend('verify_duration');
const loginAttempts = new Counter('login_attempts');
const refreshAttempts = new Counter('refresh_attempts');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Warm up
    { duration: '1m', target: 20 },   // Normal load
    { duration: '30s', target: 50 }, // Peak
    { duration: '30s', target: 0 },  // Cool down
  ],
  thresholds: {
    login_duration: ['p(95)<300', 'p(99)<500'],
    refresh_duration: ['p(95)<200', 'p(99)<300'],
    verify_duration: ['p(95)<100', 'p(99)<200'],
    login_errors: ['rate<0.05'],
    refresh_errors: ['rate<0.05'],
  },
};

function login() {
  const url = `${API_BASE}/auth/login`;
  const payload = JSON.stringify({
    username: 'admin',
    password: 'aidos123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const startTime = new Date();
  const response = http.post(url, payload, params);
  const duration = new Date().getTime() - startTime;

  loginDuration.add(duration);
  loginAttempts.add(1);

  if (response.status !== 200) {
    loginErrors.add(1);
    return { success: false, accessToken: '', refreshToken: '' };
  }

  const data = JSON.parse(response.body);
  return {
    success: true,
    accessToken: data.data?.accessToken || '',
    refreshToken: data.data?.refreshToken || '',
  };
}

function refreshToken(refreshTokenValue) {
  const url = `${API_BASE}/auth/refresh`;
  const payload = JSON.stringify({
    refreshToken: refreshTokenValue,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const startTime = new Date();
  const response = http.post(url, payload, params);
  const duration = new Date().getTime() - startTime;

  refreshDuration.add(duration);
  refreshAttempts.add(1);

  if (response.status !== 200) {
    refreshErrors.add(1);
    return { success: false, accessToken: '' };
  }

  const data = JSON.parse(response.body);
  return {
    success: true,
    accessToken: data.data?.accessToken || '',
  };
}

function verifyToken(accessToken) {
  const url = `${API_BASE}/auth/verify`;
  
  const params = {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  };

  const startTime = new Date();
  const response = http.get(url, params);
  const duration = new Date().getTime() - startTime;

  verifyDuration.add(duration);

  return response.status === 200;
}

export default function() {
  // Test 1: Fresh login
  const loginResult = login();
  
  check(loginResult, {
    'login successful': (r) => r.success === true,
    'login returns token': (r) => r.accessToken !== '',
  });

  if (!loginResult.success) {
    sleep(1);
    return;
  }

  // Test 2: Token verification
  const isValid = verifyToken(loginResult.accessToken);
  
  check(isValid, {
    'token is valid': (r) => r === true,
  });

  // Test 3: Multiple verifications (session persistence)
  for (let i = 0; i < 3; i++) {
    verifyToken(loginResult.accessToken);
  }

  // Test 4: Token refresh (every 10th iteration to save resources)
  if (__ITER % 10 === 0 && loginResult.refreshToken) {
    const refreshResult = refreshToken(loginResult.refreshToken);
    
    check(refreshResult, {
      'refresh successful': (r) => r.success === true,
    });

    // Verify new token works
    if (refreshResult.success) {
      verifyToken(refreshResult.accessToken);
    }
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'performance/auth-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  let output = '\n' + indent + '=== Authentication Performance Summary ===\n\n';
  
  if (data.metrics.login_duration) {
    output += indent + 'Login Duration:\n';
    output += indent + `  p95: ${data.metrics.login_duration['p(95)']?.toFixed(2)}ms\n`;
    output += indent + `  p99: ${data.metrics.login_duration['p(99)']?.toFixed(2)}ms\n`;
    output += indent + `  avg: ${data.metrics.login_duration.avg?.toFixed(2)}ms\n\n`;
  }
  
  if (data.metrics.refresh_duration) {
    output += indent + 'Refresh Duration:\n';
    output += indent + `  p95: ${data.metrics.refresh_duration['p(95)']?.toFixed(2)}ms\n`;
    output += indent + `  p99: ${data.metrics.refresh_duration['p(99)']?.toFixed(2)}ms\n`;
    output += indent + `  avg: ${data.metrics.refresh_duration.avg?.toFixed(2)}ms\n\n`;
  }
  
  if (data.metrics.verify_duration) {
    output += indent + 'Verify Duration:\n';
    output += indent + `  p95: ${data.metrics.verify_duration['p(95)']?.toFixed(2)}ms\n`;
    output += indent + `  p99: ${data.metrics.verify_duration['p(99)']?.toFixed(2)}ms\n`;
    output += indent + `  avg: ${data.metrics.verify_duration.avg?.toFixed(2)}ms\n\n`;
  }
  
  if (data.metrics.login_errors) {
    output += indent + `Login Error Rate: ${(data.metrics.login_errors.rate * 100).toFixed(2)}%\n`;
  }
  
  if (data.metrics.refresh_errors) {
    output += indent + `Refresh Error Rate: ${(data.metrics.refresh_errors.rate * 100).toFixed(2)}%\n`;
  }
  
  return output;
}
