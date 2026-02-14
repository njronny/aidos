/**
 * VSCodePlugin Tests - TDD
 * 
 * 测试 VSCode 插件能力
 */

import { VSCodePlugin, VSCodeCommand, VSCodeView } from '../VSCodePlugin';

describe('VSCodePlugin', () => {
  let plugin: VSCodePlugin;

  beforeEach(() => {
    plugin = new VSCodePlugin();
  });

  describe('constructor', () => {
    it('should create plugin with default config', () => {
      expect(plugin).toBeDefined();
    });
  });

  describe('registerCommand', () => {
    it('should register a command', () => {
      const command: VSCodeCommand = {
        id: 'aidos.analyze',
        title: 'Analyze Requirements',
        handler: async () => 'result',
      };

      plugin.registerCommand(command);
      
      const cmd = plugin.getCommand('aidos.analyze');
      expect(cmd).toBeDefined();
      expect(cmd?.id).toBe('aidos.analyze');
    });

    it('should throw for duplicate command', () => {
      const command: VSCodeCommand = {
        id: 'aidos.test',
        title: 'Test',
        handler: async () => 'result',
      };

      plugin.registerCommand(command);
      
      expect(() => plugin.registerCommand(command)).toThrow('already registered');
    });
  });

  describe('executeCommand', () => {
    it('should execute registered command', async () => {
      const command: VSCodeCommand = {
        id: 'aidos.hello',
        title: 'Hello',
        handler: async (name: string) => `Hello, ${name}!`,
      };

      plugin.registerCommand(command);
      const result = await plugin.executeCommand('aidos.hello', 'World');
      
      expect(result).toBe('Hello, World!');
    });

    it('should throw for unknown command', async () => {
      await expect(plugin.executeCommand('unknown.command')).rejects.toThrow('not found');
    });
  });

  describe('createView', () => {
    it('should create a view', () => {
      const view: VSCodeView = {
        id: 'aidos.explorer',
        name: 'AIDOS Explorer',
        type: 'tree',
      };

      plugin.createView(view);
      
      const v = plugin.getView('aidos.explorer');
      expect(v).toBeDefined();
    });
  });

  describe('createWebview', () => {
    it('should create webview panel', () => {
      const panel = plugin.createWebview({
        id: 'aidos.dashboard',
        title: 'Dashboard',
        html: '<html>...</html>',
      });

      expect(panel).toHaveProperty('id');
      expect(panel).toHaveProperty('show');
    });
  });

  describe('workspace integration', () => {
    it('should read workspace files', async () => {
      const files = await plugin.readWorkspaceFiles('**/*.ts');
      
      expect(Array.isArray(files)).toBe(true);
    });

    it('should get workspace config', () => {
      const config = plugin.getConfiguration('aidos');
      
      expect(config).toBeDefined();
    });
  });

  describe('status bar', () => {
    it('should set status bar item', () => {
      plugin.setStatusBarItem({
        text: 'AIDOS: Ready',
        tooltip: 'Click to open',
        command: 'aidos.open',
      });

      const item = plugin.getStatusBarItem();
      expect(item?.text).toBe('AIDOS: Ready');
    });
  });
});
