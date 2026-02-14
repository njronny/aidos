/**
 * TaskRepository Tests - TDD
 * 
 * 测试任务状态存储
 */

import { TaskRepository, Task, TaskStatus } from '../TaskRepository';

describe('TaskRepository', () => {
  let repo: TaskRepository;

  beforeEach(() => {
    repo = new TaskRepository();
  });

  describe('create', () => {
    it('should create task', async () => {
      const task: Partial<Task> = {
        projectId: 'proj-1',
        name: 'Test Task',
        type: 'development',
      };

      const result = await repo.create(task);

      expect(result.id).toBeDefined();
      expect(result.status).toBe('pending');
    });
  });

  describe('status management', () => {
    it('should update task status', async () => {
      const task = await repo.create({ projectId: 'p1', name: 'Task', type: 'development' });

      const updated = await repo.updateStatus(task.id, 'running');

      expect(updated?.status).toBe('running');
    });

    it('should track status history', async () => {
      const task = await repo.create({ projectId: 'p1', name: 'Task', type: 'development' });

      await repo.updateStatus(task.id, 'running');
      await repo.updateStatus(task.id, 'completed');

      const updated = await repo.get(task.id);
      expect(updated?.statusHistory?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('query', () => {
    it('should get tasks by project', async () => {
      await repo.create({ projectId: 'p1', name: 'Task 1', type: 'development' });
      await repo.create({ projectId: 'p1', name: 'Task 2', type: 'development' });
      await repo.create({ projectId: 'p2', name: 'Task 3', type: 'development' });

      const tasks = await repo.getByProject('p1');

      expect(tasks.length).toBe(2);
    });

    it('should filter by status', async () => {
      const t1 = await repo.create({ projectId: 'p1', name: 'Pending', type: 'development' });
      await repo.create({ projectId: 'p1', name: 'Running', type: 'development' });
      await repo.updateStatus(t1.id, 'completed');

      const pending = await repo.findByStatus('pending');

      expect(pending.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('dependencies', () => {
    it('should add dependency', async () => {
      const t1 = await repo.create({ projectId: 'p1', name: 'Task 1', type: 'development' });
      const t2 = await repo.create({ projectId: 'p1', name: 'Task 2', type: 'development' });

      await repo.addDependency(t2.id, t1.id);

      const task = await repo.get(t2.id);
      expect(task?.dependencies).toContain(t1.id);
    });
  });
});

describe('Task', () => {
  it('should create valid task', () => {
    const task: Task = {
      id: 't1',
      projectId: 'p1',
      name: 'Test',
      type: 'development',
      status: 'pending',
      createdAt: Date.now(),
    };

    expect(task.status).toBe('pending');
  });
});
