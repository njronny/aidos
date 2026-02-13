import { MessageTemplate, TemplateVariables, UnifiedMessage, NotificationType, NotificationPriority } from '../../core/notifier/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Default templates for notifications
 */
const DEFAULT_TEMPLATES: Record<string, MessageTemplate> = {
  milestone: {
    id: 'milestone',
    name: 'Milestone Completed',
    subject: '🎉 Milestone Completed: {{milestoneName}}',
    title: '🎉 Milestone Completed',
    content: '{{milestoneName}} has been completed!\n\n{{#if details}}Details: {{details}}{{/if}}',
    variables: ['milestoneName', 'details'],
  },
  error: {
    id: 'error',
    name: 'Error Notification',
    subject: '❌ Error: {{error}}',
    title: '❌ Error Occurred',
    content: 'An error has occurred:\n\n{{error}}\n\n{{#if context}}Context: {{context}}{{/if}}',
    variables: ['error', 'context'],
  },
  progress: {
    id: 'progress',
    name: 'Progress Update',
    subject: '📊 Progress Update: {{progress}}%',
    title: '📊 Progress Update',
    content: 'Progress: {{completed}}/{{total}} ({{progress}}%)\n\n{{#if currentTask}}Current Task: {{currentTask}}{{/if}}',
    variables: ['completed', 'total', 'progress', 'currentTask'],
  },
  completion: {
    id: 'completion',
    name: 'Project Completed',
    subject: '✨ {{projectName}} Completed',
    title: '✨ Project Completed',
    content: '{{projectName}} has been completed!\n\n{{#if duration}}Duration: {{duration}} minutes{{/if}}',
    variables: ['projectName', 'duration'],
  },
  alert: {
    id: 'alert',
    name: 'Alert Notification',
    subject: '{{#if urgent}}🚨{{else}}⚠️{{/if}} Alert: {{alert}}',
    title: '{{#if urgent}}🚨{{else}}⚠️{{/if}} Alert',
    content: '{{alert}}',
    variables: ['alert', 'urgent'],
  },
};

/**
 * Template Manager - Handles message templates and variable substitution
 */
export class TemplateManager {
  private templates: Map<string, MessageTemplate>;

  constructor(customTemplates?: Record<string, MessageTemplate>) {
    this.templates = new Map(Object.entries(DEFAULT_TEMPLATES));
    
    // Add custom templates
    if (customTemplates) {
      Object.entries(customTemplates).forEach(([key, template]) => {
        this.templates.set(key, template);
      });
    }
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): MessageTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Add or update a template
   */
  addTemplate(template: MessageTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Remove a template
   */
  removeTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  /**
   * Get all template IDs
   */
  getTemplateIds(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Render a template with variables
   */
  render(templateId: string, variables: TemplateVariables): { title: string; content: string; subject?: string } {
    const template = this.templates.get(templateId);
    
    if (!template) {
      // Return default if template not found
      return {
        title: variables.projectName || variables.taskName || 'Notification',
        content: JSON.stringify(variables),
      };
    }

    const title = this.substitute(template.title || '', variables);
    const content = this.substitute(template.content, variables);
    const subject = template.subject ? this.substitute(template.subject, variables) : undefined;

    return { title, content, subject };
  }

  /**
   * Create a UnifiedMessage from a template
   */
  createMessage(
    type: NotificationType,
    priority: NotificationPriority,
    variables: TemplateVariables,
    metadata?: Record<string, unknown>
  ): UnifiedMessage {
    const rendered = this.render(type, variables);
    
    return {
      id: uuidv4(),
      type,
      priority,
      title: rendered.title,
      content: rendered.content,
      template: type,
      templateData: variables,
      timestamp: new Date(),
      metadata,
    };
  }

  /**
   * Simple template variable substitution
   * Supports: {{variable}} and {{#if variable}}...{{/if}}
   */
  private substitute(template: string, variables: TemplateVariables): string {
    let result = template;

    // Replace simple variables {{variable}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    });

    // Handle conditional blocks {{#if variable}}...{{/if}}
    result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
      const value = variables[key];
      if (value) {
        // Recursively process the content
        return this.substitute(content, variables);
      }
      return '';
    });

    return result;
  }

  /**
   * Validate template variables
   */
  validateTemplate(templateId: string, variables: TemplateVariables): { valid: boolean; missing: string[] } {
    const template = this.templates.get(templateId);
    
    if (!template) {
      return { valid: false, missing: [] };
    }

    const missing = template.variables.filter(v => variables[v] === undefined);
    
    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

export default TemplateManager;
