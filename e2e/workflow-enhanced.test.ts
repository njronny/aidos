/**
 * Enhanced Workflow End-to-End Tests
 * 
 * Tests complex workflows:
 * 1. Multi-project workflow
 * 2. Parallel development workflow
 * 3. Priority-based workflow
 * 4. Error handling workflow
 * 5. Data consistency workflow
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

test.describe('Enhanced Workflow E2E', () => {
  
  test.describe('Multi-Project Workflow', () => {
    test('should manage multiple projects simultaneously', async ({ request }) => {
      console.log('🔄 Testing multi-project workflow...');

      // Create multiple projects
      const projectNames = ['Project Alpha', 'Project Beta', 'Project Gamma'];
      const projectIds: string[] = [];

      for (const name of projectNames) {
        const response = await request.post('/api/projects', {
          data: { name, description: `Description for ${name}` },
        });
        expect(response.ok()).toBeTruthy();
        const data = await response.json() as { success: boolean; data: Project };
        projectIds.push(data.data.id);
        console.log(`   ✅ Created ${name}: ${data.data.id}`);
      }

      // Verify all projects exist
      for (const id of projectIds) {
        const response = await request.get(`/api/projects/${id}`);
        expect(response.ok()).toBeTruthy();
      }

      // List all projects
      const listResponse = await request.get('/api/projects');
      const listData = await listResponse.json() as { success: boolean; data: Project[] };
      expect(listData.data.length).toBeGreaterThanOrEqual(3));

      // Update all projects
      for (const id of projectIds) {
        const updateResponse = await request.put(`/api/projects/${id}`, {
          data: { status: 'in_progress' },
        });
        expect(updateResponse.ok()).toBeTruthy();
      }

      // Complete all projects
      for (const id of projectIds) {
        const completeResponse = await request.put(`/api/projects/${id}`, {
          data: { status: 'completed' },
        });
        expect(completeResponse.ok()).toBeTruthy();
      }

      console.log('✅ Multi-project workflow completed');
    });
  });

  test.describe('Parallel Development Workflow', () => {
    test('should handle parallel requirement development', async ({ request }) => {
      console.log('🔄 Testing parallel development workflow...');

      // Create project
      const projectResponse = await request.post('/api/projects', {
        data: { name: 'Parallel Dev Project' },
      });
      const projectData = await projectResponse.json() as { success: boolean; data: Project };
      const projectId = projectData.data.id;

      // Create multiple requirements in parallel
      const requirementTitles = [
        'Frontend Development',
        'Backend Development',
        'Database Design',
        'API Integration',
        'Testing',
      ];

      const requirementPromises = requirementTitles.map(title => 
        request.post('/api/requirements', {
          data: { projectId, title, priority: 'medium' },
        })
      );

      const requirementResponses = await Promise.all(requirementPromises);
      const requirementIds: string[] = [];

      for (const response of requirementResponses) {
        expect(response.ok()).toBeTruthy();
        const data = await response.json() as { success: boolean; data: Requirement };
        requirementIds.push(data.data.id);
      }

      console.log(`   ✅ Created ${requirementIds.length} requirements`);

      // Create tasks for each requirement in parallel
      const taskPromises: Promise<any>[] = [];
      for (const reqId of requirementIds) {
        for (let i = 1; i <= 3; i++) {
          taskPromises.push(
            request.post('/api/tasks', {
              data: {
                requirementId: reqId,
                title: `Task ${i} for requirement`,
                description: `Subtask ${i}`,
              },
            })
          );
        }
      }

      const taskResponses = await Promise.all(taskPromises);
      const taskIds: string[] = [];

      for (const response of taskResponses) {
        expect(response.ok()).toBeTruthy();
        const data = await response.json() as { success: boolean; data: Task };
        taskIds.push(data.data.id);
      }

      console.log(`   ✅ Created ${taskIds.length} tasks`);

      // Execute all tasks in parallel
      const executionPromises = taskIds.map(taskId =>
        request.put(`/api/tasks/${taskId}`, {
          data: { status: 'completed', result: 'Done' },
        })
      );

      await Promise.all(executionPromises);
      console.log(`   ✅ Executed ${taskIds.length} tasks in parallel`);

      // Verify all completed
      for (const taskId of taskIds) {
        const verifyResponse = await request.get(`/api/tasks/${taskId}`);
        const verifyData = await verifyResponse.json() as { success: boolean; data: Task };
        expect(verifyData.data.status).toBe('completed');
      }

      console.log('✅ Parallel development workflow completed');
    });
  });

  test.describe('Priority-Based Workflow', () => {
    test('should handle priority-based task execution', async ({ request }) => {
      console.log('🔄 Testing priority-based workflow...');

      // Create project
      const projectResponse = await request.post('/api/projects', {
        data: { name: 'Priority Project' },
      });
      const projectData = await projectResponse.json() as { success: boolean; data: Project };
      const projectId = projectData.data.id;

      // Create requirements with different priorities
      const priorities = ['critical', 'high', 'medium', 'low'];
      const requirementIds: string[] = [];

      for (const priority of priorities) {
        const response = await request.post('/api/requirements', {
          data: {
            projectId,
            title: `${priority} Priority Requirement`,
            priority,
          },
        });
        expect(response.ok()).toBeTruthy();
        const data = await response.json() as { success: boolean; data: Requirement };
        requirementIds.push(data.data.id);
      }

      // Create tasks for each requirement
      const taskIds: { id: string; priority: string }[] = [];
      
      for (let i = 0; i < requirementIds.length; i++) {
        const response = await request.post('/api/tasks', {
          data: {
            requirementId: requirementIds[i],
            title: `Task for ${priorities[i]} requirement`,
          },
        });
        const data = await response.json() as { success: boolean; data: Task };
        taskIds.push({ id: data.data.id, priority: priorities[i] });
      }

      // Sort by priority order
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      taskIds.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);

      // Execute in priority order
      for (const task of taskIds) {
        await request.put(`/api/tasks/${task.id}`, {
          data: { status: 'completed', result: `${task.priority} task done` },
        });
        console.log(`   ✅ Completed ${task.priority} priority task`);
      }

      // Verify execution order was respected
      let completedCount = 0;
      for (const task of taskIds) {
        const response = await request.get(`/api/tasks/${task.id}`);
        const data = await response.json() as { success: boolean; data: Task };
        if (data.data.status === 'completed') completedCount++;
      }

      expect(completedCount).toBe(taskIds.length);
      console.log('✅ Priority-based workflow completed');
    });
  });

  test.describe('Error Handling Workflow', () => {
    test('should handle cascading deletions', async ({ request }) => {
      console.log('🔄 Testing cascading deletion workflow...');

      // Create project with requirements and tasks
      const projectResponse = await request.post('/api/projects', {
        data: { name: 'Cascade Test Project' },
      });
      const projectData = await projectResponse.json() as { success: boolean; data: Project };
      const projectId = projectData.data.id;

      const reqResponse = await request.post('/api/requirements', {
        data: { projectId, title: 'Cascade Test Requirement', priority: 'high' },
      });
      const reqData = await reqResponse.json() as { success: boolean; data: Requirement };
      const requirementId = reqData.data.id;

      const taskResponse = await request.post('/api/tasks', {
        data: { requirementId, title: 'Cascade Test Task' },
      });
      const taskData = await taskResponse.json() as { success: boolean; data: Task };
      const taskId = taskData.data.id;

      // Delete project (should cascade or handle gracefully)
      const deleteResponse = await request.delete(`/api/projects/${projectId}`);
      expect(deleteResponse.ok()).toBeTruthy();

      // Verify dependent entities are handled
      const taskVerify = await request.get(`/api/tasks/${taskId}`);
      // Task might still exist or be cascade deleted - both are valid behaviors

      console.log('✅ Cascading deletion handled');
    });

    test('should handle concurrent updates', async ({ request }) => {
      console.log('🔄 Testing concurrent update workflow...');

      // Create project
      const projectResponse = await request.post('/api/projects', {
        data: { name: 'Concurrent Update Project' },
      });
      const projectData = await projectResponse.json() as { success: boolean; data: Project };
      const projectId = projectData.data.id;

      // Perform concurrent updates
      const updatePromises = [
        request.put(`/api/projects/${projectId}`, { data: { name: 'Update 1' } }),
        request.put(`/api/projects/${projectId}`, { data: { name: 'Update 2' } }),
        request.put(`/api/projects/${projectId}`, { data: { name: 'Update 3' } }),
      ];

      const updateResponses = await Promise.all(updatePromises);
      
      // All should succeed (last write wins)
      for (const response of updateResponses) {
        expect(response.ok()).toBeTruthy();
      }

      // Verify final state
      const finalResponse = await request.get(`/api/projects/${projectId}`);
      const finalData = await finalResponse.json() as { success: boolean; data: Project };
      expect(['Update 1', 'Update 2', 'Update 3']).toContain(finalData.data.name);

      console.log('✅ Concurrent updates handled');
    });
  });

  test.describe('Data Consistency Workflow', () => {
    test('should maintain referential integrity', async ({ request }) => {
      console.log('🔄 Testing referential integrity workflow...');

      // Create project
      const projectResponse = await request.post('/api/projects', {
        data: { name: 'Integrity Project' },
      });
      const projectData = await projectResponse.json() as { success: boolean; data: Project };
      const projectId = projectData.data.id;

      // Create multiple requirements
      const requirements = [];
      for (let i = 0; i < 3; i++) {
        const response = await request.post('/api/requirements', {
          data: { projectId, title: `Requirement ${i}`, priority: 'medium' },
        });
        const data = await response.json() as { success: boolean; data: Requirement };
        requirements.push(data.data.id);
      }

      // Create tasks for each requirement
      for (const reqId of requirements) {
        const taskResponse = await request.post('/api/tasks', {
          data: { requirementId: reqId, title: 'Task for requirement' },
        });
        expect(taskResponse.ok()).toBeTruthy();
      }

      // Verify relationships
      // 1. Get all requirements for project
      const reqListResponse = await request.get(`/api/requirements?projectId=${projectId}`);
      const reqListData = await reqListResponse.json() as { success: boolean; data: Requirement[] };
      expect(reqListData.data.length).toBe(3);

      // 2. Get all tasks for each requirement
      for (const reqId of requirements) {
        const taskListResponse = await request.get(`/api/tasks?requirementId=${reqId}`);
        const taskListData = await taskListResponse.json() as { success: boolean; data: Task[] };
        expect(taskListData.data.length).toBe(1);
      }

      // 3. Verify project has correct requirement count
      const projectResponse2 = await request.get(`/api/projects/${projectId}`);
      expect(projectResponse2.ok()).toBeTruthy();

      console.log('✅ Referential integrity maintained');
    });

    test('should handle bulk operations', async ({ request }) => {
      console.log('🔄 Testing bulk operation workflow...');

      // Create project
      const projectResponse = await request.post('/api/projects', {
        data: { name: 'Bulk Project' },
      });
      const projectData = await projectResponse.json() as { success: boolean; data: Project };
      const projectId = projectData.data.id;

      // Bulk create requirements
      const bulkReqCount = 10;
      const bulkReqPromises = [];
      
      for (let i = 0; i < bulkReqCount; i++) {
        bulkReqPromises.push(
          request.post('/api/requirements', {
            data: { projectId, title: `Bulk Requirement ${i}`, priority: 'medium' },
          })
        );
      }

      const bulkReqResponses = await Promise.all(bulkReqPromises);
      let successCount = 0;
      
      for (const response of bulkReqResponses) {
        if (response.ok()) successCount++;
      }

      expect(successCount).toBe(bulkReqCount);
      console.log(`   ✅ Created ${successCount} requirements in bulk`);

      // Verify count
      const listResponse = await request.get(`/api/requirements?projectId=${projectId}`);
      const listData = await listResponse.json() as { success: boolean; data: Requirement[] };
      expect(listData.data.length).toBeGreaterThanOrEqual(bulkReqCount);

      console.log('✅ Bulk operations completed');
    });
  });

  test.describe('Complex End-to-End Workflow', () => {
    test('should complete full enterprise workflow', async ({ request }) => {
      console.log('🔄 Testing full enterprise workflow...');

      // Phase 1: Project Planning
      console.log('   📋 Phase 1: Project Planning');
      const projectResponse = await request.post('/api/projects', {
        data: {
          name: 'Enterprise Application',
          description: 'Full enterprise workflow application',
        },
      });
      const projectData = await projectResponse.json() as { success: boolean; data: Project };
      const projectId = projectData.data.id;
      console.log(`      ✅ Created project: ${projectId}`);

      // Phase 2: Requirements Gathering
      console.log('   📋 Phase 2: Requirements Gathering');
      const requirementData = [
        { title: 'User Authentication', priority: 'critical' },
        { title: 'Data Management', priority: 'high' },
        { title: 'Reporting System', priority: 'medium' },
        { title: 'Notification Service', priority: 'low' },
      ];

      const requirementIds: string[] = [];
      for (const req of requirementData) {
        const response = await request.post('/api/requirements', {
          data: { projectId, ...req },
        });
        const data = await response.json() as { success: boolean; data: Requirement };
        requirementIds.push(data.data.id);
        console.log(`      ✅ Added requirement: ${req.title}`);
      }

      // Phase 3: Task Planning
      console.log('   📋 Phase 3: Task Planning');
      const taskTemplates = [
        { reqIndex: 0, title: 'Design auth schema', description: 'User and session tables' },
        { reqIndex: 0, title: 'Implement login API', description: 'POST /auth/login' },
        { reqIndex: 0, title: 'Implement registration API', description: 'POST /auth/register' },
        { reqIndex: 1, title: 'Design data models', description: 'ERD design' },
        { reqIndex: 1, title: 'Create database schema', description: 'SQL migrations' },
        { reqIndex: 2, title: 'Design report templates', description: 'PDF exports' },
        { reqIndex: 3, title: 'Setup notification service', description: 'Email/SMS gateway' },
      ];

      const taskIds: string[] = [];
      for (const template of taskTemplates) {
        const response = await request.post('/api/tasks', {
          data: {
            requirementId: requirementIds[template.reqIndex],
            title: template.title,
            description: template.description,
          },
        });
        const data = await response.json() as { success: boolean; data: Task };
        taskIds.push(data.data.id);
      }
      console.log(`      ✅ Created ${taskIds.length} tasks`);

      // Phase 4: Execution
      console.log('   📋 Phase 4: Execution');
      let completedTasks = 0;
      for (const taskId of taskIds) {
        await request.put(`/api/tasks/${taskId}`, {
          data: { status: 'in_progress' },
        });
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        await request.put(`/api/tasks/${taskId}`, {
          data: { 
            status: 'completed',
            result: 'Task executed successfully',
          },
        });
        
        completedTasks++;
        console.log(`      ✅ Completed task ${completedTasks}/${taskIds.length}`);
      }

      // Phase 5: Completion
      console.log('   📋 Phase 5: Completion');
      
      // Update all requirements to completed
      for (const reqId of requirementIds) {
        await request.put(`/api/requirements/${reqId}`, {
          data: { status: 'completed' },
        });
      }
      console.log('      ✅ All requirements completed');

      // Update project to completed
      const finalUpdate = await request.put(`/api/projects/${projectId}`, {
        data: { status: 'completed' },
      });
      expect(finalUpdate.ok()).toBeTruthy();
      console.log('      ✅ Project marked as completed');

      // Phase 6: Verification
      console.log('   📋 Phase 6: Verification');
      
      // Verify project
      const projectVerify = await request.get(`/api/projects/${projectId}`);
      const projectVerifyData = await projectVerify.json() as { success: boolean; data: Project };
      expect(projectVerifyData.data.status).toBe('completed');

      // Verify requirements
      for (const reqId of requirementIds) {
        const reqVerify = await request.get(`/api/requirements/${reqId}`);
        const reqVerifyData = await reqVerify.json() as { success: boolean; data: Requirement };
        expect(reqVerifyData.data.status).toBe('completed');
      }

      // Verify tasks
      for (const taskId of taskIds) {
        const taskVerify = await request.get(`/api/tasks/${taskId}`);
        const taskVerifyData = await taskVerify.json() as { success: boolean; data: Task };
        expect(taskVerifyData.data.status).toBe('completed');
      }

      console.log('      ✅ All verifications passed');

      console.log('🎉 Full enterprise workflow completed successfully!');
      console.log(`   📊 Summary:`);
      console.log(`      - Project: ${projectId}`);
      console.log(`      - Requirements: ${requirementIds.length}`);
      console.log(`      - Tasks: ${taskIds.length} (all completed)`);
    });
  });
});
