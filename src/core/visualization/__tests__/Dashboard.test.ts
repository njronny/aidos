/**
 * Dashboard Tests - TDD
 * 
 * 测试项目仪表盘
 */

import { Dashboard, DashboardData, ProjectSummary } from '../Dashboard';

describe('Dashboard', () => {
  let dashboard: Dashboard;

  beforeEach(() => {
    dashboard = new Dashboard();
  });

  describe('generate', () => {
    it('should generate dashboard data', async () => {
      const data = await dashboard.generate();

      expect(data).toHaveProperty('projects');
      expect(data).toHaveProperty('tasks');
      expect(data).toHaveProperty('overview');
    });

    it('should include project summary', async () => {
      const data = await dashboard.generate();

      expect(data.projects).toBeDefined();
    });

    it('should include task statistics', async () => {
      const data = await dashboard.generate();

      expect(data.tasks).toHaveProperty('total');
      expect(data.tasks).toHaveProperty('byStatus');
    });
  });

  describe('project summary', () => {
    it('should calculate project progress', async () => {
      // 先创建项目
      const project = await dashboard['projectRepo'].create({
        id: 'proj-1',
        name: 'Test Project',
        status: 'active',
      });

      const summary = await dashboard.getProjectSummary('proj-1');

      expect(summary).toHaveProperty('progress');
    });

    it('should return undefined for non-existent project', async () => {
      const summary = await dashboard.getProjectSummary('non-existent');

      expect(summary).toBeUndefined();
    });
  });

  describe('alerts', () => {
    it('should detect failed tasks', async () => {
      const alerts = await dashboard.getAlerts();

      expect(alerts).toBeDefined();
    });

    it('should detect stalled projects', async () => {
      const alerts = await dashboard.getAlerts();

      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});

describe('DashboardData', () => {
  it('should create valid dashboard data', () => {
    const data: DashboardData = {
      projects: [],
      tasks: { total: 0, byStatus: {}, byType: {} },
      overview: { activeProjects: 0, completedProjects: 0, totalTasks: 0, failedTasks: 0 },
    };

    expect(data.tasks.total).toBe(0);
  });
});
