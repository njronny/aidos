import { TemplateManager } from '../../integrations/notification/TemplateManager';

describe('TemplateManager', () => {
  let templateManager: TemplateManager;

  beforeEach(() => {
    templateManager = new TemplateManager();
  });

  describe('default templates', () => {
    it('should have default milestone template', () => {
      const template = templateManager.getTemplate('milestone');
      
      expect(template).toBeDefined();
      expect(template!.name).toBe('Milestone Completed');
      expect(template!.variables).toContain('milestoneName');
    });

    it('should have default error template', () => {
      const template = templateManager.getTemplate('error');
      
      expect(template).toBeDefined();
      expect(template!.name).toBe('Error Notification');
    });

    it('should have default progress template', () => {
      const template = templateManager.getTemplate('progress');
      
      expect(template).toBeDefined();
      expect(template!.name).toBe('Progress Update');
    });

    it('should have default completion template', () => {
      const template = templateManager.getTemplate('completion');
      
      expect(template).toBeDefined();
      expect(template!.name).toBe('Project Completed');
    });

    it('should have default alert template', () => {
      const template = templateManager.getTemplate('alert');
      
      expect(template).toBeDefined();
      expect(template!.name).toBe('Alert Notification');
    });
  });

  describe('render', () => {
    it('should render milestone template with variables', () => {
      const result = templateManager.render('milestone', {
        milestoneName: 'Phase 1 Complete',
        details: 'All tasks finished',
      });

      expect(result.title).toContain('Milestone Completed');
      expect(result.content).toContain('Phase 1 Complete');
      expect(result.content).toContain('All tasks finished');
    });

    it('should render error template with variables', () => {
      const result = templateManager.render('error', {
        error: 'Connection timeout',
        context: 'API call to external service',
      });

      expect(result.title).toContain('Error Occurred');
      expect(result.content).toContain('Connection timeout');
      expect(result.content).toContain('API call');
    });

    it('should render progress template with variables', () => {
      const result = templateManager.render('progress', {
        completed: 5,
        total: 10,
        progress: 50,
        currentTask: 'Writing documentation',
      });

      expect(result.content).toContain('5/10');
      expect(result.content).toContain('50%');
      expect(result.content).toContain('Writing documentation');
    });

    it('should render completion template with variables', () => {
      const result = templateManager.render('completion', {
        projectName: 'AIDOS',
        duration: 30,
      });

      expect(result.content).toContain('AIDOS');
      expect(result.content).toContain('30');
    });

    it('should render alert template with urgent flag', () => {
      const result = templateManager.render('alert', {
        alert: 'System overload',
        urgent: true,
      });

      expect(result.content).toContain('System overload');
      expect(result.title).toContain('🚨');
    });

    it('should handle missing template gracefully', () => {
      const result = templateManager.render('nonexistent', { test: 'value' });

      expect(result.title).toBe('Notification');
    });

    it('should handle missing variables', () => {
      const result = templateManager.render('milestone', {});

      expect(result.content).toContain('{{milestoneName}}');
    });
  });

  describe('createMessage', () => {
    it('should create UnifiedMessage from template', () => {
      const message = templateManager.createMessage(
        'milestone',
        'high',
        {
          milestoneName: 'Phase 1',
          details: 'Initial release',
        }
      );

      expect(message.id).toBeDefined();
      expect(message.type).toBe('milestone');
      expect(message.priority).toBe('high');
      expect(message.title).toContain('Milestone');
      expect(message.content).toContain('Phase 1');
      expect(message.template).toBe('milestone');
      expect(message.templateData).toEqual({
        milestoneName: 'Phase 1',
        details: 'Initial release',
      });
      expect(message.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('validateTemplate', () => {
    it('should validate complete variables', () => {
      const result = templateManager.validateTemplate('milestone', {
        milestoneName: 'Phase 1',
        details: 'Test',
      });

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should detect missing variables', () => {
      const result = templateManager.validateTemplate('milestone', {});

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('milestoneName');
    });

    it('should return valid for nonexistent template', () => {
      const result = templateManager.validateTemplate('nonexistent', {});

      expect(result.valid).toBe(false);
    });
  });

  describe('custom templates', () => {
    it('should accept custom templates', () => {
      const customManager = new TemplateManager({
        custom: {
          id: 'custom',
          name: 'Custom Template',
          title: 'Custom Title',
          content: 'Custom content: {{customVar}}',
          variables: ['customVar'],
        },
      });

      const template = customManager.getTemplate('custom');
      expect(template).toBeDefined();
      expect(template!.name).toBe('Custom Template');
    });

    it('should override default templates with custom', () => {
      const customManager = new TemplateManager({
        milestone: {
          id: 'milestone',
          name: 'Custom Milestone',
          title: 'Custom',
          content: 'Custom content',
          variables: [],
        },
      });

      const template = customManager.getTemplate('milestone');
      expect(template!.name).toBe('Custom Milestone');
    });
  });

  describe('addTemplate and removeTemplate', () => {
    it('should add new template', () => {
      templateManager.addTemplate({
        id: 'newTemplate',
        name: 'New Template',
        title: 'New Title',
        content: 'New content',
        variables: [],
      });

      const template = templateManager.getTemplate('newTemplate');
      expect(template).toBeDefined();
    });

    it('should remove template', () => {
      const removed = templateManager.removeTemplate('milestone');
      
      expect(removed).toBe(true);
      expect(templateManager.getTemplate('milestone')).toBeUndefined();
    });

    it('should return false for removing nonexistent template', () => {
      const removed = templateManager.removeTemplate('nonexistent');
      
      expect(removed).toBe(false);
    });
  });

  describe('getTemplateIds', () => {
    it('should return all template IDs', () => {
      const ids = templateManager.getTemplateIds();
      
      expect(ids).toContain('milestone');
      expect(ids).toContain('error');
      expect(ids).toContain('progress');
      expect(ids).toContain('completion');
      expect(ids).toContain('alert');
    });
  });
});
