/**
 * Workflow End-to-End Tests
 * 
 * Tests the complete workflow from requirement to delivery:
 * 1. Create project
 * 2. Add multiple requirements
 * 3. Create tasks for each requirement
 * 4. Execute tasks in sequence
 * 5. Verify workflow completion
 */

import { test, expect } from '@playwright/test';

interface Project {
  id: string;
  name: string;
  status: string;
}

interface Requirement {
  id: string;
  projectId: string;
  title: string;
  priority: string;
  status: string;
}

interface Task {
  id: string;
  requirementId: string;
  title: string;
  status: string;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
}

test.describe('Workflow E2E - Complete Requirement to Delivery', () => {
  let projectId: string;
  let requirementIds: string[] = [];
  let taskIds: string[] = [];
  let agentId: string;

  test('should complete full development workflow', async ({ request }) => {
    // Step 1: Create Project
    console.log('📝 Step 1: Creating project...');
    const projectResponse = await request.post('/api/projects', {
      data: {
        name: 'Workflow E2E Project',
        description: 'Complete workflow test project',
      },
    });
    expect(projectResponse.ok()).toBeTruthy();
    const projectData = await projectResponse.json() as { success: boolean; data: Project };
    projectId = projectData.data.id;
    console.log(`   ✅ Project created: ${projectId}`);

    // Step 2: Get available agents
    console.log('📝 Step 2: Fetching available agents...');
    const agentsResponse = await request.get('/api/agents');
    expect(agentsResponse.ok()).toBeTruthy();
    const agentsData = await agentsResponse.json() as { success: boolean; data: Agent[] };
    expect(agentsData.data.length).toBeGreaterThan(0);
    agentId = agentsData.data[0].id;
    console.log(`   ✅ Agent available: ${agentsData.data[0].name} (${agentId})`);

    // Step 3: Add multiple requirements
    console.log('📝 Step 3: Adding requirements...');
    const requirements = [
      { title: 'User Registration', description: 'Implement user signup flow', priority: 'high' as const },
      { title: 'User Login', description: 'Implement JWT authentication', priority: 'high' as const },
      { title: 'User Profile', description: 'User profile management', priority: 'medium' as const },
    ];

    for (const req of requirements) {
      const reqResponse = await request.post('/api/requirements', {
        data: {
          projectId,
          title: req.title,
          description: req.description,
          priority: req.priority,
        },
      });
      expect(reqResponse.ok()).toBeTruthy();
      const reqData = await reqResponse.json() as { success: boolean; data: Requirement };
      requirementIds.push(reqData.data.id);
      console.log(`   ✅ Requirement added: ${req.title}`);
    }

    // Step 4: Create tasks for each requirement
    console.log('📝 Step 4: Creating tasks...');
    const taskTemplates = [
      // Tasks for User Registration
      { title: 'Design registration API', description: 'POST /api/users/register' },
      { title: 'Implement input validation', description: 'Validate email, password strength' },
      { title: 'Create user database model', description: 'User table with unique email' },
      // Tasks for User Login
      { title: 'Design login API', description: 'POST /api/auth/login' },
      { title: 'Implement JWT token generation', description: 'Access and refresh tokens' },
      // Tasks for User Profile
      { title: 'Design profile API', description: 'GET/PUT /api/users/:id/profile' },
      { title: 'Implement avatar upload', description: 'Image upload to storage' },
    ];

    for (const template of taskTemplates) {
      // Find corresponding requirement
      let reqId: string;
      if (template.title.includes('Registration')) {
        reqId = requirementIds[0];
      } else if (template.title.includes('Login')) {
        reqId = requirementIds[1];
      } else {
        reqId = requirementIds[2];
      }

      const taskResponse = await request.post('/api/tasks', {
        data: {
          requirementId: reqId,
          title: template.title,
          description: template.description,
        },
      });
      expect(taskResponse.ok()).toBeTruthy();
      const taskData = await taskResponse.json() as { success: boolean; data: Task };
      taskIds.push(taskData.data.id);
      console.log(`   ✅ Task created: ${template.title}`);
    }

    // Step 5: Execute tasks
    console.log('📝 Step 5: Executing tasks...');
    let completedCount = 0;
    for (const taskId of taskIds) {
      // Start task
      const startResponse = await request.put(`/api/tasks/${taskId}`, {
        data: { status: 'in_progress' },
      });
      expect(startResponse.ok()).toBeTruthy();

      // Simulate work (small delay)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Complete task
      const completeResponse = await request.put(`/api/tasks/${taskId}`, {
        data: {
          status: 'completed',
          result: `Task ${taskId} completed successfully`,
        },
      });
      expect(completeResponse.ok()).toBeTruthy();
      completedCount++;
      console.log(`   ✅ Task ${completedCount}/${taskIds.length} completed`);
    }

    // Step 6: Update requirements status
    console.log('📝 Step 6: Updating requirement statuses...');
    for (let i = 0; i < requirementIds.length; i++) {
      const reqId = requirementIds[i];
      const reqUpdateResponse = await request.put(`/api/requirements/${reqId}`, {
        data: { status: 'completed' },
      });
      expect(reqUpdateResponse.ok()).toBeTruthy();
    }
    console.log('   ✅ All requirements completed');

    // Step 7: Update project status
    console.log('📝 Step 7: Finalizing project...');
    const projectUpdateResponse = await request.put(`/api/projects/${projectId}`, {
      data: { status: 'completed' },
    });
    expect(projectUpdateResponse.ok()).toBeTruthy();
    const projectUpdateData = await projectUpdateResponse.json() as { success: boolean; data: Project };
    expect(projectUpdateData.data.status).toBe('completed');
    console.log('   ✅ Project marked as completed');

    // Step 8: Verify final state
    console.log('📝 Step 8: Verifying final state...');

    // Verify all tasks are completed
    for (const taskId of taskIds) {
      const taskResponse = await request.get(`/api/tasks/${taskId}`);
      const taskData = await taskResponse.json() as { success: boolean; data: Task };
      expect(taskData.data.status).toBe('completed');
    }

    // Verify all requirements are completed
    for (const reqId of requirementIds) {
      const reqResponse = await request.get(`/api/requirements/${reqId}`);
      const reqData = await reqResponse.json() as { success: boolean; data: Requirement };
      expect(reqData.data.status).toBe('completed');
    }

    // Verify project is completed
    const finalProjectResponse = await request.get(`/api/projects/${projectId}`);
    const finalProjectData = await finalProjectResponse.json() as { success: boolean; data: Project };
    expect(finalProjectData.data.status).toBe('completed');

    console.log('   ✅ Final state verified');
    console.log('');
    console.log('🎉 Workflow completed successfully!');
    console.log(`   - Project: ${projectId}`);
    console.log(`   - Requirements: ${requirementIds.length}`);
    console.log(`   - Tasks: ${taskIds.length} (all completed)`);
  });

  test('should handle parallel task execution', async ({ request }) => {
    // Create project
    const projectResponse = await request.post('/api/projects', {
      data: { name: 'Parallel Test Project' },
    });
    const projectData = await projectResponse.json() as { success: boolean; data: Project };
    const projectId = projectData.data.id;

    // Create requirement
    const reqResponse = await request.post('/api/requirements', {
      data: {
        projectId,
        title: 'Parallel Tasks Requirement',
        priority: 'high',
      },
    });
    const reqData = await reqResponse.json() as { success: boolean; data: Requirement };
    const requirementId = reqData.data.id;

    // Create multiple tasks
    const taskCount = 5;
    const taskIds: string[] = [];
    for (let i = 0; i < taskCount; i++) {
      const taskResponse = await request.post('/api/tasks', {
        data: {
          requirementId,
          title: `Parallel Task ${i + 1}`,
          description: `Task ${i + 1} description`,
        },
      });
      const taskData = await taskResponse.json() as { success: boolean; data: Task };
      taskIds.push(taskData.data.id);
    }

    // Execute all tasks in parallel (simulated by sequential async calls)
    const executionPromises = taskIds.map(async (taskId) => {
      await request.put(`/api/tasks/${taskId}`, { data: { status: 'in_progress' } });
      await request.put(`/api/tasks/${taskId}`, { data: { status: 'completed', result: 'Done' } });
    });

    await Promise.all(executionPromises);

    // Verify all tasks completed
    for (const taskId of taskIds) {
      const taskResponse = await request.get(`/api/tasks/${taskId}`);
      const taskData = await taskResponse.json() as { success: boolean; data: Task };
      expect(taskData.data.status).toBe('completed');
    }

    console.log(`✅ Parallel execution test passed: ${taskCount} tasks completed`);
  });

  test('should maintain data integrity through workflow', async ({ request }) => {
    // Create project
    const projectResponse = await request.post('/api/projects', {
      data: { name: 'Integrity Test Project', description: 'Testing data integrity' },
    });
    const projectData = await projectResponse.json() as { success: boolean; data: Project };
    const projectId = projectData.data.id;

    // Create requirement
    const reqResponse = await request.post('/api/requirements', {
      data: {
        projectId,
        title: 'Integrity Test Requirement',
        description: 'Testing data relationships',
        priority: 'medium',
      },
    });
    const reqData = await reqResponse.json() as { success: boolean; data: Requirement };
    const requirementId = reqData.data.id;

    // Create task
    const taskResponse = await request.post('/api/tasks', {
      data: {
        requirementId,
        title: 'Integrity Test Task',
        description: 'Testing task-requirement relationship',
      },
    });
    const taskData = await taskResponse.json() as { success: boolean; data: Task };
    const taskId = taskData.data.id;

    // Verify relationships
    const taskVerifyResponse = await request.get(`/api/tasks/${taskId}`);
    const taskVerify = await taskVerifyResponse.json() as { success: boolean; data: Task };
    expect(taskVerify.data.requirementId).toBe(requirementId);

    const reqVerifyResponse = await request.get(`/api/requirements/${requirementId}`);
    const reqVerify = await reqVerifyResponse.json() as { success: boolean; data: Requirement };
    expect(reqVerify.data.projectId).toBe(projectId);

    // Get tasks by requirement
    const tasksByReqResponse = await request.get(`/api/tasks?requirementId=${requirementId}`);
    const tasksByReq = await tasksByReqResponse.json() as { success: boolean; data: Task[] };
    expect(tasksByReq.data.length).toBe(1);
    expect(tasksByReq.data[0].id).toBe(taskId);

    // Get requirements by project
    const reqsByProjectResponse = await request.get(`/api/requirements?projectId=${projectId}`);
    const reqsByProject = await reqsByProjectResponse.json() as { success: boolean; data: Requirement[] };
    expect(reqsByProject.data.length).toBe(1);
    expect(reqsByProject.data[0].id).toBe(requirementId);

    console.log('✅ Data integrity test passed');
  });
});
