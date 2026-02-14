/**
 * TemplateService - 模板服务
 * 项目模板、任务模板管理
 */

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  structure: Record<string, string>;
  defaultTasks?: string[];
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  type: 'backend' | 'frontend' | 'database' | 'devops' | 'testing' | 'documentation';
  estimatedHours: number;
  steps: string[];
}

export interface GeneratedProject {
  name: string;
  description: string;
  techStack: string[];
  structure: Record<string, string>;
  files: GeneratedFile[];
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export class TemplateService {
  private projectTemplates: ProjectTemplate[] = [];
  private taskTemplates: TaskTemplate[] = [];

  constructor() {
    this.initProjectTemplates();
    this.initTaskTemplates();
  }

  /**
   * 初始化项目模板
   */
  private initProjectTemplates(): void {
    this.projectTemplates = [
      {
        id: 'express-api',
        name: 'Express API',
        description: 'Node.js Express RESTful API 项目',
        techStack: ['Express', 'TypeScript', 'SQLite'],
        structure: {
          'src/routes': 'typescript',
          'src/controllers': 'typescript',
          'src/models': 'typescript',
          'src/middleware': 'typescript',
          'tests': 'typescript',
        },
        defaultTasks: ['init', 'model', 'controller', 'route', 'test'],
      },
      {
        id: 'react-web',
        name: 'React Web',
        description: 'React 前端项目',
        techStack: ['React', 'TypeScript', 'Vite'],
        structure: {
          'src/components': 'tsx',
          'src/pages': 'tsx',
          'src/hooks': 'typescript',
          'src/api': 'typescript',
          'tests': 'typescript',
        },
        defaultTasks: ['init', 'component', 'page', 'api', 'test'],
      },
      {
        id: 'nextjs-app',
        name: 'Next.js App',
        description: 'Next.js 全栈应用',
        techStack: ['Next.js', 'React', 'TypeScript'],
        structure: {
          'src/app': 'typescript',
          'src/components': 'tsx',
          'src/lib': 'typescript',
          'prisma': 'prisma',
        },
        defaultTasks: ['init', 'page', 'api', 'db', 'test'],
      },
      {
        id: 'node-cli',
        name: 'Node CLI',
        description: 'Node.js 命令行工具',
        techStack: ['Node.js', 'TypeScript', 'Commander'],
        structure: {
          'src': 'typescript',
          'bin': 'javascript',
          'tests': 'typescript',
        },
        defaultTasks: ['init', 'command', 'parser', 'test'],
      },
    ];
  }

  /**
   * 初始化任务模板
   */
  private initTaskTemplates(): void {
    this.taskTemplates = [
      {
        id: 'crud-api',
        name: 'CRUD API',
        description: '完整的 CRUD API 开发',
        type: 'backend',
        estimatedHours: 8,
        steps: [
          '设计数据库模型',
          '创建数据库表',
          '实现 Model 层',
          '实现 Controller 层',
          '定义路由',
          '编写测试用例',
        ],
      },
      {
        id: 'react-component',
        name: 'React 组件',
        description: 'React 组件开发',
        type: 'frontend',
        estimatedHours: 4,
        steps: [
          '创建组件文件',
          '定义 Props 接口',
          '实现组件逻辑',
          '添加样式',
          '编写测试',
        ],
      },
      {
        id: 'database-schema',
        name: '数据库设计',
        description: '数据库表结构设计',
        type: 'database',
        estimatedHours: 3,
        steps: [
          '分析需求',
          '设计 ER 图',
          '创建表结构',
          '添加索引',
          '编写迁移脚本',
        ],
      },
      {
        id: 'docker-setup',
        name: 'Docker 配置',
        description: 'Docker 容器化配置',
        type: 'devops',
        estimatedHours: 2,
        steps: [
          '编写 Dockerfile',
          '配置 docker-compose',
          '优化镜像大小',
          '添加健康检查',
        ],
      },
      {
        id: 'unit-test',
        name: '单元测试',
        description: '编写单元测试',
        type: 'testing',
        estimatedHours: 4,
        steps: [
          '分析测试范围',
          '编写测试用例',
          '运行测试',
          '修复失败用例',
          '添加覆盖率',
        ],
      },
    ];
  }

  /**
   * 获取项目模板列表
   */
  getProjectTemplates(): ProjectTemplate[] {
    return this.projectTemplates;
  }

  /**
   * 获取任务模板列表
   */
  getTaskTemplates(type?: string): TaskTemplate[] {
    if (!type) return this.taskTemplates;
    return this.taskTemplates.filter(t => t.type === type);
  }

  /**
   * 根据模板创建项目
   */
  async createProjectFromTemplate(templateId: string): Promise<GeneratedProject> {
    const template = this.projectTemplates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error(`模板不存在: ${templateId}`);
    }

    // 生成项目结构
    const files: GeneratedFile[] = [];
    
    for (const [path, ext] of Object.entries(template.structure)) {
      files.push({
        path: `${path}/index.${ext === 'typescript' ? 'ts' : ext}`,
        content: this.generateFileContent(path, ext, template.techStack),
      });
    }

    return {
      name: template.name,
      description: template.description,
      techStack: template.techStack,
      structure: template.structure,
      files,
    };
  }

  /**
   * 根据模板生成任务
   */
  async generateTaskFromTemplate(templateId: string, context: string): Promise<TaskTemplate[]> {
    const template = this.taskTemplates.find(t => t.id === templateId);
    
    if (!template) {
      // 返回默认任务
      return [
        {
          id: 'default-task',
          name: `${context} 开发`,
          description: `开发 ${context} 功能`,
          type: 'backend',
          estimatedHours: 8,
          steps: ['需求分析', '设计实现', '编写测试', '代码审查'],
        },
      ];
    }

    return [{ ...template, name: `${context} - ${template.name}` }];
  }

  /**
   * 添加自定义项目模板
   */
  addProjectTemplate(template: ProjectTemplate): void {
    const exists = this.projectTemplates.find(t => t.id === template.id);
    if (exists) {
      // 更新
      Object.assign(exists, template);
    } else {
      this.projectTemplates.push(template);
    }
  }

  /**
   * 添加自定义任务模板
   */
  addTaskTemplate(template: TaskTemplate): void {
    const exists = this.taskTemplates.find(t => t.id === template.id);
    if (exists) {
      Object.assign(exists, template);
    } else {
      this.taskTemplates.push(template);
    }
  }

  /**
   * 生成文件内容
   */
  private generateFileContent(path: string, ext: string, techStack: string[]): string {
    if (ext === 'typescript' || ext === 'tsx') {
      const isReact = path.includes('component') || path.includes('page');
      if (isReact && ext === 'tsx') {
        return `// ${path} component
import React from 'react';

interface Props {
  // Define props here
}

export const ${this.getComponentName(path)}: React.FC<Props> = () => {
  return (
    <div>
      {/* Component content */}
    </div>
  );
};
`;
      }
      return `// ${path} module
export class ${this.getClassName(path)} {
  constructor() {
    // Initialize
  }
}
`;
    }
    
    return `# ${path}\n`;
  }

  private getComponentName(path: string): string {
    const name = path.split('/').pop() || 'Component';
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  private getClassName(path: string): string {
    const name = path.split('/').pop() || 'Class';
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
}

export const templateService = new TemplateService();
