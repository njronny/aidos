/**
 * k6 Performance Test Suite for AIDOS API
 * 
 * Tests include:
 * 1. Authentication performance (login, token refresh)
 * 2. CRUD operations performance
 * 3. Concurrent load testing
 * 4. Stress testing
 * 5. Smoke testing
 * 
 * Run with: k6 run performance/api-stress.js
 * Or: k6 run performance/api-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const requestDuration = new Trend('request_duration');
const projectsCreated = new Counter('projects_created');
const requirementsCreated = new Counter('requirements_created');
const tasksCreated = new Counter('tasks_created');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Authentication helper
let accessToken = '';
let refreshToken = '';

function login() {
  const loginUrl = `${API_BASE}/auth/login`;
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
  const response = http.post(loginUrl, payload, params);
  const endTime = new Date();

  loginDuration.add(endTime.getTime() - startTime.getTime());

  if (response.status === 200) {
    const data = JSON.parse(response.body);
    accessToken = data.data?.accessToken || '';
    refreshToken = data.data?.refreshToken || '';
    return true;
  }
  
  errorRate.add(1);
  return false;
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };
}

// ==================== SMOKE TEST ====================
export const smokeOptions = {
  vus: 1,
  duration: '30s',
};

export function smokeTest() {
  // Login
  const loginSuccess = login();
  check(loginSuccess, { 'login successful': () => loginSuccess === true });

  // Basic health check
  const healthResponse = http.get(`${BASE_URL}/health`);
  check(healthResponse, { 
    'health endpoint responds': (r) => r.status === 200,
  });

  // Get projects
  const projectsResponse = http.get(API_BASE + '/projects', { headers: getHeaders() });
  check(projectsResponse, {
    'projects list responds': (r) => r.status === 200,
  });

  sleep(1);
}

// ==================== LOAD TEST ====================
export const loadOptions = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.1'],
  },
};

export function loadTest() {
  // Login first
  login();

  // Test project creation
  const createProjectUrl = `${API_BASE}/projects`;
  const createProjectPayload = JSON.stringify({
    name: `Load Test Project ${Date.now()}`,
    description: 'Performance testing',
  });

  const createProjectStart = new Date();
  const createProjectResponse = http.post(createProjectUrl, createProjectPayload, {
    headers: getHeaders(),
  });
  requestDuration.add(new Date().getTime() - createProjectStart.getTime());

  check(createProjectResponse, {
    'project created': (r) => r.status === 201 || r.status === 200,
  });
  projectsCreated.add(1);
  errorRate.add(createProjectResponse.status !== 200 && createProjectResponse.status !== 201 ? 1 : 0);

  const projectId = createProjectResponse.status === 201 || createProjectResponse.status === 200 
    ? JSON.parse(createProjectResponse.body)?.data?.id 
    : null;

  if (projectId) {
    // Create requirement
    const createReqUrl = `${API_BASE}/requirements`;
    const createReqPayload = JSON.stringify({
      projectId,
      title: `Load Test Requirement ${Date.now()}`,
      priority: 'medium',
    });

    const createReqResponse = http.post(createReqUrl, createReqPayload, {
      headers: getHeaders(),
    });

    check(createReqResponse, {
      'requirement created': (r) => r.status === 201 || r.status === 200,
    });
    requirementsCreated.add(1);
    errorRate.add(createReqResponse.status !== 200 && createReqResponse.status !== 201 ? 1 : 0);

    const requirementId = createReqResponse.status === 201 || createReqResponse.status === 200
      ? JSON.parse(createReqResponse.body)?.data?.id
      : null;

    if (requirementId) {
      // Create task
      const createTaskUrl = `${API_BASE}/tasks`;
      const createTaskPayload = JSON.stringify({
        requirementId,
        title: `Load Test Task ${Date.now()}`,
      });

      const createTaskResponse = http.post(createTaskUrl, createTaskPayload, {
        headers: getHeaders(),
      });

      check(createTaskResponse, {
        'task created': (r) => r.status === 201 || r.status === 200,
      });
      tasksCreated.add(1);
      errorRate.add(createTaskResponse.status !== 200 && createTaskResponse.status !== 201 ? 1 : 0);
    }
  }

  // Read operations
  const readProjectsResponse = http.get(API_BASE + '/projects', { headers: getHeaders() });
  check(readProjectsResponse, {
    'projects list retrieved': (r) => r.status === 200,
  });

  // List agents
  const agentsResponse = http.get(API_BASE + '/agents', { headers: getHeaders() });
  check(agentsResponse, {
    'agents list retrieved': (r) => r.status === 200,
  });

  sleep(1);
}

// ==================== STRESS TEST ====================
export const stressOptions = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 50 },  // Stay at 50
    { duration: '1m', target: 100 }, // Spike to 100
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    errors: ['rate<0.2'],
  },
};

export function stressTest() {
  // Login
  login();

  // Concurrent read/write stress
  const batchSize = 5;
  
  for (let i = 0; i < batchSize; i++) {
    const projectUrl = `${API_BASE}/projects`;
    const payload = JSON.stringify({
      name: `Stress Test ${Date.now()}-${i}`,
    });

    http.post(projectUrl, payload, { headers: getHeaders() });
    http.get(API_BASE + '/projects', { headers: getHeaders() });
  }

  sleep(0.5);
}

// ==================== SPIKE TEST ====================
export const spikeOptions = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '30s', target: 100 },  // Spike
    { duration: '1m', target: 10 },    // Recovery
    { duration: '10s', target: 0 },
  ],
};

export function spikeTest() {
  login();

  // Quick burst of requests
  const burst = http.batch([
    ['GET', API_BASE + '/projects', null, getHeaders()],
    ['GET', API_BASE + '/agents', null, getHeaders()],
    ['GET', API_BASE + '/requirements', null, getHeaders()],
  ]);

  check(burst[0], { 'projects responded': (r) => r.status === 200 });
  check(burst[1], { 'agents responded': (r) => r.status === 200 });
  
  errorRate.add(burst[0].status !== 200 ? 1 : 0);
  errorRate.add(burst[1].status !== 200 ? 1 : 0);

  sleep(0.1);
}

// ==================== SOAK TEST ====================
export const soakOptions = {
  vus: 20,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.05'],
  },
};

export function soakTest() {
  login();

  // Repeated CRUD operations over time
  const projectPayload = JSON.stringify({
    name: `Soak Test ${Date.now()}`,
  });

  const createResponse = http.post(`${API_BASE}/projects`, projectPayload, {
    headers: getHeaders(),
  });

  if (createResponse.status === 200 || createResponse.status === 201) {
    const projectId = JSON.parse(createResponse.body)?.data?.id;
    
    if (projectId) {
      // Update
      http.put(`${API_BASE}/projects/${projectId}`, 
        JSON.stringify({ status: 'in_progress' }), 
        { headers: getHeaders() }
      );

      // Read
      http.get(`${API_BASE}/projects/${projectId}`, { headers: getHeaders() });

      // Delete
      http.delete(`${API_BASE}/projects/${projectId}`, { headers: getHeaders() });
    }
  }

  sleep(2);
}

// ==================== BREAKPOINT TEST ====================
export const breakpointOptions = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '1m', target: 200 },
    { duration: '1m', target: 300 },
    { duration: '1m', target: 0 },
  ],
};

export function breakpointTest() {
  login();

  // Attempt to overwhelm system
  http.get(API_BASE + '/projects', { headers: getHeaders() });
  http.get(API_BASE + '/agents', { headers: getHeaders() });

  sleep(0.5);
}

// Default export - runs load test
export default function() {
  loadTest();
}
