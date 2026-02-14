/**
 * TemplateService 模板服务 - TDD 测试
 * 项目模板、任务模板管理
 */

import { TemplateService, ProjectTemplate, TaskTemplate } from '../TemplateService';

describe('TemplateService', () => {
  let service: TemplateService;

  beforeEach(() => {
    service = new TemplateService();
  });

  describe('getProjectTemplates', () => {
    it('should return list of project templates', () => {
      const templates = service.getProjectTemplates();
      
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should contain required fields', () => {
      const templates = service.getProjectTemplates();
      const first = templates[0];
      
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('description');
      expect(first).toHaveProperty('techStack');
    });
  });

  describe('getTaskTemplates', () => {
    it('should return task templates', () => {
      const templates = service.getTaskTemplates();
      
      expect(Array.isArray(templates)).toBe(true);
    });

    it('should filter by type', () => {
      const templates = service.getTaskTemplates('backend');
      
      expect(templates.every(t => t.type === 'backend')).toBe(true);
    });
  });

  describe('createProjectFromTemplate', () => {
    it('should create project from template', async () => {
      const project = await service.createProjectFromTemplate('express-api');
      
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('description');
      expect(project).toHaveProperty('structure');
    });

    it('should throw for invalid template', async () => {
      await expect(service.createProjectFromTemplate('invalid-template'))
        .rejects.toThrow('模板不存在');
    });
  });

  describe('generateTaskFromTemplate', () => {
    it('should generate tasks from template', async () => {
      const tasks = await service.generateTaskFromTemplate('crud-api', '用户管理');
      
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0]).toHaveProperty('name');
      expect(tasks[0]).toHaveProperty('type');
    });
  });

  describe('customTemplate', () => {
    it('should add custom project template', async () => {
      const customTemplate: ProjectTemplate = {
        id: 'custom-web',
        name: 'Custom Web',
        description: 'Custom web project',
        techStack: ['React', 'Node.js'],
        structure: { 'src': 'typescript' },
      };
      
      service.addProjectTemplate(customTemplate);
      const templates = service.getProjectTemplates();
      
      expect(templates.some(t => t.id === 'custom-web')).toBe(true);
    });
  });
});
