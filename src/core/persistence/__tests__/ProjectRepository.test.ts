/**
 * ProjectRepository Tests - TDD
 * 
 * 测试项目数据存储
 */

import { ProjectRepository, Project } from '../ProjectRepository';

describe('ProjectRepository', () => {
  let repo: ProjectRepository;

  beforeEach(() => {
    repo = new ProjectRepository();
  });

  describe('create', () => {
    it('should create project', async () => {
      const project: Project = {
        id: 'proj-1',
        name: 'Test Project',
        description: 'A test project',
        status: 'active',
        createdAt: Date.now(),
      };

      const result = await repo.create(project);

      expect(result.id).toBe('proj-1');
    });

    it('should generate id if not provided', async () => {
      const project: Partial<Project> = {
        name: 'Auto ID Project',
      };

      const result = await repo.create(project);

      expect(result.id).toBeDefined();
    });
  });

  describe('read', () => {
    it('should get project by id', async () => {
      const project: Project = {
        id: 'proj-read',
        name: 'Read Test',
        status: 'active',
        createdAt: Date.now(),
      };

      await repo.create(project);
      const result = await repo.get('proj-read');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Read Test');
    });

    it('should return undefined for non-existent project', async () => {
      const result = await repo.get('non-existent');

      expect(result).toBeUndefined();
    });

    it('should list all projects', async () => {
      await repo.create({ id: 'p1', name: 'P1', status: 'active', createdAt: Date.now() });
      await repo.create({ id: 'p2', name: 'P2', status: 'active', createdAt: Date.now() });

      const results = await repo.list();

      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('update', () => {
    it('should update project', async () => {
      await repo.create({ id: 'proj-update', name: 'Original', status: 'active', createdAt: Date.now() });

      const updated = await repo.update('proj-update', { name: 'Updated' });

      expect(updated?.name).toBe('Updated');
    });

    it('should return undefined for non-existent', async () => {
      const result = await repo.update('non-existent', { name: 'Test' });

      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete project', async () => {
      await repo.create({ id: 'proj-delete', name: 'Delete Me', status: 'active', createdAt: Date.now() });

      const deleted = await repo.delete('proj-delete');

      expect(deleted).toBe(true);
    });
  });

  describe('status', () => {
    it('should filter by status', async () => {
      await repo.create({ id: 'a1', name: 'Active', status: 'active', createdAt: Date.now() });
      await repo.create({ id: 'a2', name: 'Also Active', status: 'active', createdAt: Date.now() });
      await repo.create({ id: 'c1', name: 'Completed', status: 'completed', createdAt: Date.now() });

      const activeProjects = await repo.findByStatus('active');

      expect(activeProjects.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('Project', () => {
  it('should create valid project', () => {
    const project: Project = {
      id: 'test',
      name: 'Test',
      status: 'active',
      createdAt: Date.now(),
    };

    expect(project.id).toBe('test');
  });
});
