/**
 * VSCodePlugin - VSCode Extension Integration
 * 
 * VSCode 插件集成
 * - 命令注册与执行
 * - 视图管理
 * - Webview 支持
 * - 工作区集成
 */

export interface VSCodeCommand {
  id: string;
  title: string;
  handler: (...args: any[]) => Promise<any>;
}

export interface VSCodeView {
  id: string;
  name: string;
  type: 'tree' | 'webview';
}

export interface WebviewPanel {
  id: string;
  title: string;
  html?: string;
  show(): void;
  dispose(): void;
}

export interface StatusBarItem {
  text: string;
  tooltip?: string;
  command?: string;
}

export interface WorkspaceFile {
  path: string;
  name: string;
  isDirectory: boolean;
}

export class VSCodePlugin {
  private commands: Map<string, VSCodeCommand> = new Map();
  private views: Map<string, VSCodeView> = new Map();
  private webviews: Map<string, WebviewPanel> = new Map();
  private statusBarItem?: StatusBarItem;
  private config: Map<string, any> = new Map();

  constructor() {
    this.initializeDefaults();
  }

  /**
   * 初始化默认配置
   */
  private initializeDefaults(): void {
    // Default configuration
    this.config.set('aidos.autoStart', true);
    this.config.set('aidos.maxTokens', 4000);
    this.config.set('aidos.defaultModel', 'gpt-4');
  }

  /**
   * 注册命令
   */
  registerCommand(command: VSCodeCommand): void {
    if (this.commands.has(command.id)) {
      throw new Error(`Command ${command.id} already registered`);
    }
    this.commands.set(command.id, command);
  }

  /**
   * 获取命令
   */
  getCommand(id: string): VSCodeCommand | undefined {
    return this.commands.get(id);
  }

  /**
   * 执行命令
   */
  async executeCommand(id: string, ...args: any[]): Promise<any> {
    const command = this.commands.get(id);
    if (!command) {
      throw new Error(`Command ${id} not found`);
    }
    return command.handler(...args);
  }

  /**
   * 创建视图
   */
  createView(view: VSCodeView): void {
    if (this.views.has(view.id)) {
      throw new Error(`View ${view.id} already exists`);
    }
    this.views.set(view.id, view);
  }

  /**
   * 获取视图
   */
  getView(id: string): VSCodeView | undefined {
    return this.views.get(id);
  }

  /**
   * 获取所有视图
   */
  getViews(): VSCodeView[] {
    return Array.from(this.views.values());
  }

  /**
   * 创建 Webview
   */
  createWebview(options: { id: string; title: string; html?: string }): WebviewPanel {
    const panel: WebviewPanel = {
      id: options.id,
      title: options.title,
      html: options.html,
      show: () => {
        console.log(`Webview ${options.id} shown`);
      },
      dispose: () => {
        this.webviews.delete(options.id);
      },
    };

    this.webviews.set(options.id, panel);
    return panel;
  }

  /**
   * 获取 Webview
   */
  getWebview(id: string): WebviewPanel | undefined {
    return this.webviews.get(id);
  }

  /**
   * 读取工作区文件
   */
  async readWorkspaceFiles(pattern: string): Promise<WorkspaceFile[]> {
    // Mock implementation - in real VSCode would use workspace.findFiles
    console.log(`Searching files with pattern: ${pattern}`);
    return [
      { path: '/workspace/src/index.ts', name: 'index.ts', isDirectory: false },
      { path: '/workspace/src/app.ts', name: 'app.ts', isDirectory: false },
    ];
  }

  /**
   * 获取配置
   */
  getConfiguration(section?: string): any {
    if (section) {
      const keys = Array.from(this.config.keys()).filter(k => k.startsWith(section));
      const result: Record<string, any> = {};
      keys.forEach(k => {
        result[k.replace(`${section}.`, '')] = this.config.get(k);
      });
      return result;
    }
    return Object.fromEntries(this.config);
  }

  /**
   * 设置配置
   */
  setConfiguration(key: string, value: any): void {
    this.config.set(key, value);
  }

  /**
   * 获取状态栏
   */
  getStatusBarItem(): StatusBarItem | undefined {
    return this.statusBarItem;
  }

  /**
   * 设置状态栏
   */
  setStatusBarItem(item: StatusBarItem): void {
    this.statusBarItem = item;
  }

  /**
   * 显示通知
   */
  showNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * 打开文档
   */
  async openDocument(path: string): Promise<void> {
    console.log(`Opening document: ${path}`);
  }

  /**
   * 获取当前文件
   */
  getActiveEditor(): { path: string; content: string } | undefined {
    return {
      path: '/workspace/src/index.ts',
      content: '// Current file content',
    };
  }
}

export default VSCodePlugin;
