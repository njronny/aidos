/**
 * API End-to-End Tests
 * 
 * Tests the complete flow:
 * 1. Project Creation
 * 2. Requirement Addition
 * 3. Task Creation
 * 4. Task Execution
 * 5. Status Verification
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

test.describe('API E2E Flow', () => {
  let projectId: string;
  let requirementId: string;
  let taskId: string;

  test('should complete full flow: project → requirement → task → execution → verification', async ({ request }) => {
    // Step 1: Create Project
    const createProjectResponse = await request.post('/api/projects', {
      data: {
        name: 'E2E Test Project',
        description: 'Project created by E2E test',
      },
    });
    expect(createProjectResponse.ok()).toBeTruthy();
    const projectData = await createProjectResponse.json() as { success: boolean; data: Project };
    expect(projectData.success).toBe(true);
    expect(projectData.data).toHaveProperty('id');
    expect(projectData.data.name).toBe('E2E Test Project');
    projectId = projectData.data.id;
    console.log(`✅ Created project: ${projectId}`);

    // Verify project was created
    const getProjectResponse = await request.get(`/api/projects/${projectId}`);
    expect(getProjectResponse.ok()).toBeTruthy();
    const getProjectData = await getProjectResponse.json() as { success: boolean; data: Project };
    expect(getProjectData.data.name).toBe('E2E Test Project');

    // Step 2: Add Requirement to Project
    const createRequirementResponse = await request.post('/api/requirements', {
      data: {
        projectId: projectId,
        title: 'User Authentication Feature',
        description: 'Implement JWT-based authentication',
        priority: 'high',
      },
    });
    expect(createRequirementResponse.ok()).toBeTruthy();
    const requirementData = await createRequirementResponse.json() as { success: boolean; data: Requirement };
    expect(requirementData.success).toBe(true);
    expect(requirementData.data).toHaveProperty('id');
    expect(requirementData.data.title).toBe('User Authentication Feature');
    expect(requirementData.data.projectId).toBe(projectId);
    requirementId = requirementData.data.id;
    console.log(`✅ Created requirement: ${requirementId}`);

    // Verify requirement was created and linked to project
    const getRequirementResponse = await request.get(`/api/requirements/${requirementId}`);
    expect(getRequirementResponse.ok()).toBeTruthy();
    const getRequirementData = await getRequirementResponse.json() as { success: boolean; data: Requirement };
    expect(getRequirementData.data.projectId).toBe(projectId);

    // Step 3: Create Task for Requirement
    const createTaskResponse = await request.post('/api/tasks', {
      data: {
        requirementId: requirementId,
        title: 'Implement Login API',
        description: 'Create POST /api/auth/login endpoint',
      },
    });
    expect(createTaskResponse.ok()).toBeTruthy();
    const taskData = await createTaskResponse.json() as { success: boolean; data: Task };
    expect(taskData.success).toBe(true);
    expect(taskData.data).toHaveProperty('id');
    expect(taskData.data.title).toBe('Implement Login API');
    expect(taskData.data.requirementId).toBe(requirementId);
    expect(taskData.data.status).toBe('pending');
    taskId = taskData.data.id;
    console.log(`✅ Created task: ${taskId}`);

    // Step 4: Execute Task (Update Task Status)
    const executeTaskResponse = await request.put(`/api/tasks/${taskId}`, {
      data: {
        status: 'in_progress',
      },
    });
    expect(executeTaskResponse.ok()).toBeTruthy();
    const executeTaskData = await executeTaskResponse.json() as { success: boolean; data: Task };
    expect(executeTaskData.data.status).toBe('in_progress');
    console.log(`✅ Task execution started`);

    // Simulate task completion
    const completeTaskResponse = await request.put(`/api/tasks/${taskId}`, {
      data: {
        status: 'completed',
        result: 'Login API implemented successfully',
      },
    });
    expect(completeTaskResponse.ok()).toBeTruthy();
    const completeTaskData = await completeTaskResponse.json() as { success: boolean; data: Task };
    expect(completeTaskData.data.status).toBe('completed');
    console.log(`✅ Task execution completed`);

    // Step 5: Verify Complete Status Flow
    // Verify task status
    const verifyTaskResponse = await request.get(`/api/tasks/${taskId}`);
    const verifyTaskData = await verifyTaskResponse.json() as { success: boolean; data: Task };
    expect(verifyTaskData.data.status).toBe('completed');

    // Verify requirement status (should be updated if tasks are completed)
    const verifyRequirementResponse = await request.get(`/api/requirements/${requirementId}`);
    const verifyRequirementData = await verifyRequirementResponse.json() as { success: boolean; data: Requirement };
    expect(verifyRequirementData.data).toHaveProperty('status');

    // Verify project still exists
    const verifyProjectResponse = await request.get(`/api/projects/${projectId}`);
    const verifyProjectData = await verifyProjectResponse.json() as { success: boolean; data: Project };
    expect(verifyProjectData.data.id).toBe(projectId);

    console.log(`✅ Status verification complete`);
    console.log(`📊 Final State:`);
    console.log(`   - Project: ${projectId}`);
    console.log(`   - Requirement: ${requirementId}`);
    console.log(`   - Task: ${taskId} (completed)`);
  });

  test('should list and filter projects, requirements, and tasks', async ({ request }) => {
    // Create a project for filtering
    const projectResponse = await request.post('/api/projects', {
      data: {
        name: 'Filter Test Project',
        description: 'Testing list and filter',
      },
    });
    const projectResult = await projectResponse.json() as { success: boolean; data: Project };
    const testProjectId = projectResult.data.id;

    // List all projects
    const listProjectsResponse = await request.get('/api/projects');
    expect(listProjectsResponse.ok()).toBeTruthy();
    const listProjectsData = await listProjectsResponse.json() as { success: boolean; data: Project[] };
    expect(listProjectsData.success).toBe(true);
    expect(Array.isArray(listProjectsData.data)).toBe(true);
    expect(listProjectsData.data.length).toBeGreaterThan(0);

    // Filter projects by search
    const searchProjectsResponse = await request.get('/api/projects?search=Filter');
    const searchProjectsData = await searchProjectsResponse.json() as { success: boolean; data: Project[] };
    expect(searchProjectsData.data.some(p => p.name.includes('Filter'))).toBe(true);

    // List requirements by projectId
    const listRequirementsResponse = await request.get(`/api/requirements?projectId=${testProjectId}`);
    expect(listRequirementsResponse.ok()).toBeTruthy();

    console.log('✅ List and filter tests passed');
  });

  test('should handle CRUD operations correctly', async ({ request }) => {
    // Create
    const createResponse = await request.post('/api/projects', {
      data: {
        name: 'CRUD Test Project',
        description: 'Testing CRUD',
      },
    });
    const createResult = await createResponse.json() as { success: boolean; data: Project };
    const projectId = createResult.data.id;
    expect(createResult.success).toBe(true);

    // Read
    const readResponse = await request.get(`/api/projects/${projectId}`);
    const readResult = await readResponse.json() as { success: boolean; data: Project };
    expect(readResult.data.name).toBe('CRUD Test Project');

    // Update
    const updateResponse = await request.put(`/api/projects/${projectId}`, {
      data: {
        name: 'Updated CRUD Project',
        status: 'completed',
      },
    });
    const updateResult = await updateResponse.json() as { success: boolean; data: Project };
    expect(updateResult.data.name).toBe('Updated CRUD Project');
    expect(updateResult.data.status).toBe('completed');

    // Delete
    const deleteResponse = await request.delete(`/api/projects/${projectId}`);
    expect(deleteResponse.ok()).toBeTruthy();

    // Verify deletion
    const verifyResponse = await request.get(`/api/projects/${projectId}`);
    expect(verifyResponse.status()).toBe(404);

    console.log('✅ CRUD operations test passed');
  });

  test('should validate input correctly', async ({ request }) => {
    // Test missing required fields
    const missingNameResponse = await request.post('/api/projects', {
      data: {
        description: 'Missing name',
      },
    });
    expect(missingNameResponse.status()).toBe(400);

    // Test invalid requirement (missing projectId)
    const missingProjectIdResponse = await request.post('/api/requirements', {
      data: {
        title: 'Test Requirement',
      },
    });
    expect(missingProjectIdResponse.status()).toBe(400);

    // Test invalid task (missing requirementId)
    const missingRequirementIdResponse = await request.post('/api/tasks', {
      data: {
        title: 'Test Task',
      },
    });
    expect(missingRequirementIdResponse.status()).toBe(400);

    // Test non-existent resource
    const notFoundResponse = await request.get('/api/projects/non-existent-id');
    expect(notFoundResponse.status()).toBe(404);

    console.log('✅ Input validation test passed');
  });
});
