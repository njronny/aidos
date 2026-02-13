/**
 * Complete CRUD End-to-End Tests
 * 
 * Tests all Create, Read, Update, Delete operations:
 * 1. Project CRUD
 * 2. Requirement CRUD  
 * 3. Task CRUD
 * 4. Agent operations
 */

import { test, expect } from '@playwright/test';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Requirement {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
  requirementId: string;
  title: string;
  description?: string;
  status: string;
  result?: string;
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
}

test.describe('Complete CRUD Operations', () => {
  // ==================== PROJECT CRUD ====================
  
  test.describe('Project CRUD', () => {
    let projectId: string;

    test('should create a project', async ({ request }) => {
      const response = await request.post('/api/projects', {
        data: {
          name: 'CRUD Test Project',
          description: 'Testing CRUD operations',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json() as { success: boolean; data: Project };
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.name).toBe('CRUD Test Project');
      expect(data.data.description).toBe('Testing CRUD operations');
      expect(data.data.status).toBe('pending');
      projectId = data.data.id;

      console.log(`✅ Project created: ${projectId}`);
    });

    test('should read a project', async ({ request }) => {
      // Create first
      const createResponse = await request.post('/api/projects', {
        data: { name: 'Read Test Project' },
      });
      const createData = await createResponse.json() as { success: boolean; data: Project };
      const id = createData.data.id;

      // Read
      const readResponse = await request.get(`/api/projects/${id}`);
      expect(readResponse.ok()).toBeTruthy();
      const readData = await readResponse.json() as { success: boolean; data: Project };
      expect(readData.data.id).toBe(id);
      expect(readData.data.name).toBe('Read Test Project');

      console.log(`✅ Project read: ${id}`);
    });

    test('should update a project', async ({ request }) => {
      // Create first
      const createResponse = await request.post('/api/projects', {
        data: { name: 'Update Test Project' },
      });
      const createData = await createResponse.json() as { success: boolean; data: Project };
      const id = createData.data.id;

      // Update
      const updateResponse = await request.put(`/api/projects/${id}`, {
        data: {
          name: 'Updated Project Name',
          description: 'Updated description',
          status: 'in_progress',
        },
      });
      expect(updateResponse.ok()).toBeTruthy();
      const updateData = await updateResponse.json() as { success: boolean; data: Project };
      expect(updateData.data.name).toBe('Updated Project Name');
      expect(updateData.data.description).toBe('Updated description');
      expect(updateData.data.status).toBe('in_progress');

      console.log(`✅ Project updated: ${id}`);
    });

    test('should delete a project', async ({ request }) => {
      // Create first
      const createResponse = await request.post('/api/projects', {
        data: { name: 'Delete Test Project' },
      });
      const createData = await createResponse.json() as { success: boolean; data: Project };
      const id = createData.data.id;

      // Delete
      const deleteResponse = await request.delete(`/api/projects/${id}`);
      expect(deleteResponse.ok()).toBeTruthy();

      // Verify deletion
      const verifyResponse = await request.get(`/api/projects/${id}`);
      expect(verifyResponse.status()).toBe(404);

      console.log(`✅ Project deleted: ${id}`);
    });

    test('should list all projects', async ({ request }) => {
      const response = await request.get('/api/projects');
      expect(response.ok()).toBeTruthy();
      const data = await response.json() as { success: boolean; data: Project[] };
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);

      console.log(`✅ Listed ${data.data.length} projects`);
    });

    test('should search projects', async ({ request }) => {
      // Create project with unique name
      await request.post('/api/projects', {
        data: { name: 'SearchUniqueProject123' },
      });

      const response = await request.get('/api/projects?search=SearchUnique');
      expect(response.ok()).toBeTruthy();
      const data = await response.json() as { success: boolean; data: Project[] };
      expect(data.data.some(p => p.name.includes('SearchUnique'))).toBe(true);

      console.log('✅ Project search successful');
    });
  });

  // ==================== REQUIREMENT CRUD ====================

  test.describe('Requirement CRUD', () => {
    let projectId: string;
    let requirementId: string;

    test.beforeAll(async ({ request }) => {
      // Create a project for requirements
      const projectResponse = await request.post('/api/projects', {
        data: { name: 'Requirement Test Project' },
      });
      const projectData = await projectResponse.json() as { success: boolean; data: Project };
      projectId = projectData.data.id;
    });

    test('should create a requirement', async ({ request }) => {
      const response = await request.post('/api/requirements', {
        data: {
          projectId,
          title: 'Test Requirement',
          description: 'Testing requirement creation',
          priority: 'high',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json() as { success: boolean; data: Requirement };
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.title).toBe('Test Requirement');
      expect(data.data.priority).toBe('high');
      expect(data.data.projectId).toBe(projectId);
      requirementId = data.data.id;

      console.log(`✅ Requirement created: ${requirementId}`);
    });

    test('should read a requirement', async ({ request }) => {
      // Create first
      const createResponse = await request.post('/api/requirements', {
        data: {
          projectId,
          title: 'Read Test Requirement',
          priority: 'medium',
        },
      });
      const createData = await createResponse.json() as { success: boolean; data: Requirement };
      const id = createData.data.id;

      // Read
      const readResponse = await request.get(`/api/requirements/${id}`);
      expect(readResponse.ok()).toBeTruthy();
      const readData = await readResponse.json() as { success: boolean; data: Requirement };
      expect(readData.data.id).toBe(id);
      expect(readData.data.title).toBe('Read Test Requirement');

      console.log(`✅ Requirement read: ${id}`);
    });

    test('should update a requirement', async ({ request }) => {
      // Create first
      const createResponse = await request.post('/api/requirements', {
        data: {
          projectId,
          title: 'Update Test Requirement',
          priority: 'low',
        },
      });
      const createData = await createResponse.json() as { success: boolean; data: Requirement };
      const id = createData.data.id;

      // Update
      const updateResponse = await request.put(`/api/requirements/${id}`, {
        data: {
          title: 'Updated Requirement Title',
          priority: 'high',
          status: 'completed',
        },
      });
      expect(updateResponse.ok()).toBeTruthy();
      const updateData = await updateResponse.json() as { success: boolean; data: Requirement };
      expect(updateData.data.title).toBe('Updated Requirement Title');
      expect(updateData.data.priority).toBe('high');
      expect(updateData.data.status).toBe('completed');

      console.log(`✅ Requirement updated: ${id}`);
    });

    test('should delete a requirement', async ({ request }) => {
      // Create first
      const createResponse = await request.post('/api/requirements', {
        data: {
          projectId,
          title: 'Delete Test Requirement',
          priority: 'medium',
        },
      });
      const createData = await createResponse.json() as { success: boolean; data: Requirement };
      const id = createData.data.id;

      // Delete
      const deleteResponse = await request.delete(`/api/requirements/${id}`);
      expect(deleteResponse.ok()).toBeTruthy();

      // Verify deletion
      const verifyResponse = await request.get(`/api/requirements/${id}`);
      expect(verifyResponse.status()).toBe(404);

      console.log(`✅ Requirement deleted: ${id}`);
    });

    test('should list requirements by project', async ({ request }) => {
      const response = await request.get(`/api/requirements?projectId=${projectId}`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json() as { success: boolean; data: Requirement[] };
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      console.log(`✅ Listed ${data.data.length} requirements for project ${projectId}`);
    });

    test('should filter requirements by priority', async ({ request }) => {
      // Create requirements with different priorities
      await request.post('/api/requirements', {
        data: { projectId, title: 'High Priority', priority: 'high' },
      });
      await request.post('/api/requirements', {
        data: { projectId, title: 'Low Priority', priority: 'low' },
      });

      const response = await request.get(`/api/requirements?projectId=${projectId}&priority=high`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json() as { success: boolean; data: Requirement[] };
      expect(data.data.every(r => r.priority === 'high')).toBe(true);

      console.log('✅ Requirements filtered by priority');
    });
  });

  // ==================== TASK CRUD ====================

  test.describe('Task CRUD', () => {
    let projectId: string;
    let requirementId: string;
    let taskId: string;

    test.beforeAll(async ({ request }) => {
      // Create project and requirement for tasks
      const projectResponse = await request.post('/api/projects', {
        data: { name: 'Task Test Project' },
      });
      const projectData = await projectResponse.json() as { success: boolean; data: Project };
      projectId = projectData.data.id;

      const reqResponse = await request.post('/api/requirements', {
        data: {
          projectId,
          title: 'Task Test Requirement',
          priority: 'high',
        },
      });
      const reqData = await reqResponse.json() as { success: boolean; data: Requirement };
      requirementId = reqData.data.id;
    });

    test('should create a task', async ({ request }) => {
      const response = await request.post('/api/tasks', {
        data: {
          requirementId,
          title: 'Test Task',
          description: 'Testing task creation',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json() as { success: boolean; data: Task };
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.title).toBe('Test Task');
      expect(data.data.requirementId).toBe(requirementId);
      expect(data.data.status).toBe('pending');
      taskId = data.data.id;

      console.log(`✅ Task created: ${taskId}`);
    });

    test('should read a task', async ({ request }) => {
      // Create first
      const createResponse = await request.post('/api/tasks', {
        data: {
          requirementId,
          title: 'Read Test Task',
        },
      });
      const createData = await createResponse.json() as { success: boolean; data: Task };
      const id = createData.data.id;

      // Read
      const readResponse = await request.get(`/api/tasks/${id}`);
      expect(readResponse.ok()).toBeTruthy();
      const readData = await readResponse.json() as { success: boolean; data: Task };
      expect(readData.data.id).toBe(id);
      expect(readData.data.title).toBe('Read Test Task');

      console.log(`✅ Task read: ${id}`);
    });

    test('should update a task', async ({ request }) => {
      // Create first
      const createResponse = await request.post('/api/tasks', {
        data: {
          requirementId,
          title: 'Update Test Task',
        },
      });
      const createData = await createResponse.json() as { success: boolean; data: Task };
      const id = createData.data.id;

      // Update
      const updateResponse = await request.put(`/api/tasks/${id}`, {
        data: {
          title: 'Updated Task Title',
          status: 'in_progress',
          result: 'Task result',
        },
      });
      expect(updateResponse.ok()).toBeTruthy();
      const updateData = await updateResponse.json() as { success: boolean; data: Task };
      expect(updateData.data.title).toBe('Updated Task Title');
      expect(updateData.data.status).toBe('in_progress');
      expect(updateData.data.result).toBe('Task result');

      console.log(`✅ Task updated: ${id}`);
    });

    test('should delete a task', async ({ request }) => {
      // Create first
      const createResponse = await request.post('/api/tasks', {
        data: {
          requirementId,
          title: 'Delete Test Task',
        },
      });
      const createData = await createResponse.json() as { success: boolean; data: Task };
      const id = createData.data.id;

      // Delete
      const deleteResponse = await request.delete(`/api/tasks/${id}`);
      expect(deleteResponse.ok()).toBeTruthy();

      // Verify deletion
      const verifyResponse = await request.get(`/api/tasks/${id}`);
      expect(verifyResponse.status()).toBe(404);

      console.log(`✅ Task deleted: ${id}`);
    });

    test('should list tasks by requirement', async ({ request }) => {
      const response = await request.get(`/api/tasks?requirementId=${requirementId}`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json() as { success: boolean; data: Task[] };
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      console.log(`✅ Listed ${data.data.length} tasks for requirement ${requirementId}`);
    });

    test('should filter tasks by status', async ({ request }) => {
      // Create tasks with different statuses
      const task1 = await request.post('/api/tasks', {
        data: { requirementId, title: 'Pending Task', status: 'pending' },
      });
      const task1Data = await task1.json() as { success: boolean; data: Task };
      
      await request.put(`/api/tasks/${task1Data.data.id}`, {
        data: { status: 'completed' },
      });

      const response = await request.get(`/api/tasks?requirementId=${requirementId}&status=completed`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json() as { success: boolean; data: Task[] };
      expect(data.data.every(t => t.status === 'completed')).toBe(true);

      console.log('✅ Tasks filtered by status');
    });

    test('should update task status through lifecycle', async ({ request }) => {
      // Create task
      const createResponse = await request.post('/api/tasks', {
        data: {
          requirementId,
          title: 'Lifecycle Test Task',
        },
      });
      const createData = await createResponse.json() as { success: boolean; data: Task };
      const id = createData.data.id;

      // Verify initial status
      let taskResponse = await request.get(`/api/tasks/${id}`);
      let taskData = await taskResponse.json() as { success: boolean; data: Task };
      expect(taskData.data.status).toBe('pending');

      // Update to in_progress
      await request.put(`/api/tasks/${id}`, { data: { status: 'in_progress' } });
      taskResponse = await request.get(`/api/tasks/${id}`);
      taskData = await taskResponse.json() as { success: boolean; data: Task };
      expect(taskData.data.status).toBe('in_progress');

      // Update to completed
      await request.put(`/api/tasks/${id}`, { 
        data: { 
          status: 'completed',
          result: 'Task completed successfully',
        },
      });
      taskResponse = await request.get(`/api/tasks/${id}`);
      taskData = await taskResponse.json() as { success: boolean; data: Task };
      expect(taskData.data.status).toBe('completed');
      expect(taskData.data.result).toBe('Task completed successfully');

      console.log(`✅ Task lifecycle completed: ${id}`);
    });
  });

  // ==================== AGENT OPERATIONS ====================

  test.describe('Agent Operations', () => {
    test('should list all agents', async ({ request }) => {
      const response = await request.get('/api/agents');
      expect(response.ok()).toBeTruthy();
      const data = await response.json() as { success: boolean; data: Agent[] };
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);

      console.log(`✅ Listed ${data.data.length} agents`);
    });

    test('should get agent by id', async ({ request }) => {
      // First get all agents
      const listResponse = await request.get('/api/agents');
      const listData = await listResponse.json() as { success: boolean; data: Agent[] };
      const agentId = listData.data[0].id;

      // Get specific agent
      const response = await request.get(`/api/agents/${agentId}`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json() as { success: boolean; data: Agent };
      expect(data.data.id).toBe(agentId);

      console.log(`✅ Got agent: ${agentId}`);
    });
  });

  // ==================== EDGE CASES ====================

  test.describe('CRUD Edge Cases', () => {
    test('should handle invalid project id', async ({ request }) => {
      const response = await request.get('/api/projects/invalid-id');
      expect(response.status()).toBe(404);
    });

    test('should handle invalid requirement id', async ({ request }) => {
      const response = await request.get('/api/requirements/invalid-id');
      expect(response.status()).toBe(404);
    });

    test('should handle invalid task id', async ({ request }) => {
      const response = await request.get('/api/tasks/invalid-id');
      expect(response.status()).toBe(404);
    });

    test('should handle updating non-existent project', async ({ request }) => {
      const response = await request.put('/api/projects/non-existent', {
        data: { name: 'Test' },
      });
      expect(response.status()).toBe(404);
    });

    test('should handle deleting non-existent project', async ({ request }) => {
      const response = await request.delete('/api/projects/non-existent');
      expect(response.status()).toBe(404);
    });

    test('should validate required fields', async ({ request }) => {
      // Missing project name
      let response = await request.post('/api/projects', {
        data: { description: 'No name' },
      });
      expect(response.status()).toBe(400);

      // Missing requirement projectId
      response = await request.post('/api/requirements', {
        data: { title: 'No projectId' },
      });
      expect(response.status()).toBe(400);

      // Missing task requirementId
      response = await request.post('/api/tasks', {
        data: { title: 'No requirementId' },
      });
      expect(response.status()).toBe(400);

      console.log('✅ Input validation working correctly');
    });
  });
});
