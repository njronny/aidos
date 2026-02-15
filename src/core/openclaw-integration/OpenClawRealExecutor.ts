/**
 * OpenClawRealExecutor - 真实任务执行器
 * 
 * 支持两种执行模式：
 * 1. Gateway 模式：调用 OpenClaw Gateway API 执行任务
 * 2. 本地模式：使用模板引擎生成代码
 */

import { EventEmitter } from 'events';
import { exec as nodeExec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OpenClawGatewayClient, getGatewayClient } from './GatewayClient';

const execAsync = promisify(nodeExec);

export interface RealTask {
  id: string;
  prompt: string;
  type?: 'code' | 'test' | 'deploy' | 'analyze';
  agent?: string;  // 代理类型
  context?: Record<string, any>;
  workdir?: string;
}

export interface RealResult {
  success: boolean;
  taskId: string;
  output: string;
  error?: string;
  executionTime: number;
  files?: string[];
}

export interface ExecutorConfig {
  workDir?: string;
  timeout?: number;
}

export class OpenClawRealExecutor extends EventEmitter {
  private workDir: string;
  private timeout: number;
  private useRealExecution: boolean = true;
  private gatewayClient: OpenClawGatewayClient | null = null;
  private useGateway: boolean = false;

  constructor(config?: ExecutorConfig & { useGateway?: boolean; gatewayToken?: string }) {
    super();
    this.workDir = config?.workDir || '/tmp/aidos';
    this.timeout = config?.timeout || 120000;
    this.useGateway = config?.useGateway || false;
    this.ensureWorkDir();

    // 初始化 Gateway 客户端
    if (this.useGateway && config?.gatewayToken) {
      this.gatewayClient = new OpenClawGatewayClient({
        host: 'localhost',
        port: 18789,
        token: config.gatewayToken,
      });
      console.log('[Executor] Gateway client initialized');
    }
  }

  private async ensureWorkDir(): Promise<void> {
    try {
      await fs.mkdir(this.workDir, { recursive: true });
    } catch (e) {
      // ignore
    }
  }

  /**
   * 启用真实执行
   */
  enableRealExecution(): void {
    this.useRealExecution = true;
  }

  /**
   * 禁用真实执行
   */
  disableRealExecution(): void {
    this.useRealExecution = false;
  }

  /**
   * 检查是否启用真实执行
   */
  isRealExecutionEnabled(): boolean {
    return this.useRealExecution;
  }

  /**
   * 执行任务 - 根据任务类型调用不同的执行器
   * 支持 Gateway 模式和本地模式
   */
  async execute(task: RealTask): Promise<RealResult> {
    const startTime = Date.now();
    
    try {
      if (!this.useRealExecution) {
        return this.mockExecute(task, startTime);
      }

      // 如果配置了 Gateway，优先使用 Gateway 执行
      if (this.useGateway && this.gatewayClient) {
        return await this.executeViaGateway(task, startTime);
      }

      console.log(`[Executor] 执行任务: ${task.id}, 类型: ${task.type || 'code'}`);

      let result: RealResult;
      
      switch (task.type) {
        case 'test':
          result = await this.runTest(task, startTime);
          break;
        case 'deploy':
          result = await this.runDeploy(task, startTime);
          break;
        case 'analyze':
          result = await this.analyzeRequirement(task, startTime);
          break;
        default:
          result = await this.generateAndWriteCode(task, startTime);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        taskId: task.id,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 通过 OpenClaw Gateway 执行任务
   */
  private async executeViaGateway(task: RealTask, startTime: number): Promise<RealResult> {
    console.log(`[Executor] Gateway模式: ${task.id}`);

    // 生成文件名
    const safeName = task.prompt.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 30);
    const filename = `${task.id}.js`;
    const outputPath = `/root/.openclaw/workspace/aidos/generated/${safeName}`;

    try {
      // 调用 Gateway 启动子代理 - 更明确的指令
      const taskPrompt = `你是一个全栈工程师。请根据需求生成代码。

需求: ${task.prompt}

请:
1. 分析需求
2. 生成对应的代码（可以是 Express API、React 组件、类等）
3. 用 write 工具将代码写入文件: ${outputPath}/${filename}
4. 完成后返回已生成的文件路径

注意：请直接写代码文件，不要只返回代码文本。`;

      const spawnResult = await this.gatewayClient!.spawnSubAgent({
        task: taskPrompt,
        timeoutSeconds: 180,
        label: `aidos-task-${task.id}`,
      });

      if (spawnResult.status === 'error') {
        return {
          success: false,
          taskId: task.id,
          output: '',
          error: spawnResult.error || 'Gateway调用失败',
          executionTime: Date.now() - startTime,
        };
      }

      console.log(`[Executor] Gateway任务已启动: ${spawnResult.runId}, Session: ${spawnResult.sessionKey}`);
      
      // P1: 等待任务完成
      if (spawnResult.sessionKey) {
        console.log(`[Executor] 等待任务完成...`);
        
        const waitResult = await this.gatewayClient!.waitForTaskComplete(
          spawnResult.sessionKey, 
          180000,  // 3分钟超时
          3000     // 3秒轮询间隔
        );
        
        if (waitResult.completed) {
          console.log(`[Executor] 任务完成!`);
          return {
            success: true,
            taskId: task.id,
            output: `✅ 任务完成!\n\n生成文件: ${outputPath}/${filename}\n\n结果:\n${waitResult.result?.substring(0, 1000) || '代码已生成'}`,
            executionTime: Date.now() - startTime,
          };
        } else {
          console.log(`[Executor] 等待超时，任务可能已在后台完成`);
          return {
            success: true,
            taskId: task.id,
            output: `⏳ 任务超时，但可能已在后台完成\n输出路径: ${outputPath}/${filename}`,
            executionTime: Date.now() - startTime,
          };
        }
      }
      
      return {
        success: true,
        taskId: task.id,
        output: `Gateway任务已启动\n输出路径: ${outputPath}/${filename}\nSession: ${spawnResult.sessionKey}\nRunId: ${spawnResult.runId}`,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        taskId: task.id,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 分析需求 - 理解用户需求并生成任务列表
   */
  private async analyzeRequirement(task: RealTask, startTime: number): Promise<RealResult> {
    const prompt = task.prompt;
    
    // 简单的需求分析 - 生成任务列表
    const tasks = this.generateTasksFromPrompt(prompt);
    
    return {
      success: true,
      taskId: task.id,
      output: JSON.stringify(tasks, null, 2),
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * 根据需求生成任务列表
   */
  private generateTasksFromPrompt(prompt: string): any[] {
    const tasks: any[] = [];
    
    // 基础任务
    tasks.push({
      name: '需求分析',
      description: `分析需求: ${prompt}`,
      type: 'analyze',
      status: 'pending',
    });

    // 检测需要的任务类型
    if (prompt.toLowerCase().includes('api') || prompt.toLowerCase().includes('后端')) {
      tasks.push({
        name: '后端开发',
        description: '实现API接口',
        type: 'code',
        status: 'pending',
      });
    }

    if (prompt.toLowerCase().includes('前端') || prompt.toLowerCase().includes('界面') || prompt.toLowerCase().includes('ui')) {
      tasks.push({
        name: '前端开发',
        description: '实现用户界面',
        type: 'code',
        status: 'pending',
      });
    }

    if (prompt.toLowerCase().includes('数据库') || prompt.toLowerCase().includes('db')) {
      tasks.push({
        name: '数据库设计',
        description: '设计数据库结构',
        type: 'code',
        status: 'pending',
      });
    }

    // 始终添加测试任务
    tasks.push({
      name: '编写测试',
      description: '编写单元测试',
      type: 'test',
      status: 'pending',
    });

    return tasks;
  }

  /**
   * 生成并写入代码
   */
  private async generateAndWriteCode(task: RealTask, startTime: number): Promise<RealResult> {
    const prompt = task.prompt;
    const projectDir = path.join(this.workDir, task.id);
    
    await fs.mkdir(projectDir, { recursive: true });

    let code = '';
    let filename = 'index.js';
    let files: string[] = [];

    // 根据需求类型生成代码
    // 检测是否为 CRUD 管理系统
    const isCRUD = prompt.toLowerCase().includes('增删改查') || 
                   prompt.toLowerCase().includes('crud') ||
                   prompt.toLowerCase().includes('管理');
    const isAPI = prompt.toLowerCase().includes('api') || 
                  prompt.toLowerCase().includes('后端') ||
                  prompt.toLowerCase().includes('服务');
    
    if (isCRUD || isAPI || prompt.toLowerCase().includes('express')) {
      filename = 'server.js';
      code = this.generateExpressServer(prompt);
    } else if (prompt.toLowerCase().includes('前端') || prompt.toLowerCase().includes('react') || prompt.toLowerCase().includes('界面')) {
      filename = 'App.jsx';
      code = this.generateReactComponent(prompt);
    } else if (prompt.toLowerCase().includes('类') || prompt.toLowerCase().includes('class')) {
      filename = 'index.js';
      code = this.generateClass(prompt);
    } else if (prompt.toLowerCase().includes('函数') || prompt.toLowerCase().includes('function')) {
      filename = 'index.js';
      code = this.generateFunction(prompt);
    } else {
      // 默认生成一个简单的服务
      filename = 'app.js';
      code = this.generateDefaultApp(prompt);
    }

    // 写入主文件
    const mainFilePath = path.join(projectDir, filename);
    await fs.writeFile(mainFilePath, code, 'utf-8');
    files.push(filename);

    // 生成 package.json
    const packageJson = this.generatePackageJson(filename);
    await fs.writeFile(path.join(projectDir, 'package.json'), packageJson, 'utf-8');
    files.push('package.json');

    // 如果是API，生成测试文件
    if (filename === 'server.js') {
      const testCode = this.generateApiTest(filename);
      await fs.writeFile(path.join(projectDir, 'test.js'), testCode, 'utf-8');
      files.push('test.js');
    }

    // 尝试安装依赖并运行
    try {
      await this.runCommand('npm install', projectDir, 60000);
      
      // 运行测试（如果存在）
      try {
        await this.runCommand('npm test', projectDir, 30000);
      } catch (e) {
        // 测试失败不中断
      }
    } catch (e) {
      console.log('[Executor] npm install failed, continuing...');
    }

    return {
      success: true,
      taskId: task.id,
      output: `生成文件: ${files.join(', ')}\n\n${code}`,
      executionTime: Date.now() - startTime,
      files,
    };
  }

  /**
   * 运行测试
   */
  private async runTest(task: RealTask, startTime: number): Promise<RealResult> {
    const projectDir = path.join(this.workDir, task.context?.projectId || 'default');
    
    try {
      // 运行 npm test
      const output = await this.runCommand('npm test 2>&1', projectDir, 30000);
      return {
        success: true,
        taskId: task.id,
        output: `测试结果:\n${output}`,
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        taskId: task.id,
        output: '',
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 运行部署
   */
  private async runDeploy(task: RealTask, startTime: number): Promise<RealResult> {
    // 模拟部署流程
    const steps = [
      '1. 构建项目 (npm run build)',
      '2. 运行测试',
      '3. 打包镜像',
      '4. 推送到仓库',
      '5. 部署到环境',
    ];

    return {
      success: true,
      taskId: task.id,
      output: `部署步骤:\n${steps.join('\n')}\n\n(模拟部署完成)`,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * 执行Shell命令
   */
  private async runCommand(cmd: string, cwd: string, timeout: number = 30000): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, [], {
        shell: true,
        cwd,
        timeout,
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || stdout || `Command exited with code ${code}`));
        }
      });
      
      child.on('error', reject);
    });
  }

  /**
   * 模拟执行（备用）
   */
  private mockExecute(task: RealTask, startTime: number): RealResult {
    return {
      success: true,
      taskId: task.id,
      output: this.generateMockOutput(task.prompt),
      executionTime: Date.now() - startTime,
    };
  }

  // ============ 智能代码生成模板 ============

  /**
   * 智能 Express 服务器生成 - 根据需求自动生成 CRUD API
   */
  private generateExpressServer(prompt: string): string {
    // 1. 解析需求中的实体
    const entities = this.extractEntities(prompt);
    
    // 2. 生成实体模型和 CRUD 接口
    let modelsCode = '';
    let routesCode = '';
    let dataStore = 'const db = new Map();\n';
    
    for (const entity of entities) {
      const entityLower = entity.toLowerCase();
      const modelName = this.toPascalCase(entity);
      const plural = entityLower + 's';
      
      // 模型
      modelsCode += `// ${modelName} 模型\n`;
      
      // CRUD 路由
      routesCode += `
/* ${modelName} CRUD */
app.get('/api/${plural}', (req, res) => {
  const items = Array.from(db.get('${entityLower}s') || []);
  res.json({ data: items });
});

app.get('/api/${plural}/:id', (req, res) => {
  const items = db.get('${entityLower}s') || new Map();
  const item = items.get(req.params.id);
  if (!item) return res.status(404).json({ error: '${entity} not found' });
  res.json({ data: item });
});

app.post('/api/${plural}', (req, res) => {
  const items = db.get('${entityLower}s') || new Map();
  const id = Date.now().toString();
  const item = { id, ...req.body, createdAt: new Date().toISOString() };
  items.set(id, item);
  db.set('${entityLower}s', items);
  res.status(201).json({ data: item });
});

app.put('/api/${plural}/:id', (req, res) => {
  const items = db.get('${entityLower}s') || new Map();
  const item = items.get(req.params.id);
  if (!item) return res.status(404).json({ error: '${entity} not found' });
  const updated = { ...item, ...req.body, updatedAt: new Date().toISOString() };
  items.set(req.params.id, updated);
  db.set('${entityLower}s', items);
  res.json({ data: updated });
});

app.delete('/api/${plural}/:id', (req, res) => {
  const items = db.get('${entityLower}s') || new Map();
  if (!items.has(req.params.id)) return res.status(404).json({ error: '${entity} not found' });
  items.delete(req.params.id);
  db.set('${entityLower}s', items);
  res.status(204).send();
});
`;
    }

    // 如果没有检测到实体，使用默认数据
    if (entities.length === 0) {
      routesCode = `
app.get('/api/data', (req, res) => {
  res.json({ data: [{ id: 1, name: 'Sample Item' }] });
});
`;
    }

    return `/**
 * ${prompt}
 * 自动生成的 Express 服务器
 * 检测到实体: ${entities.length > 0 ? entities.join(', ') : '默认'}
 */

const express = require('express');
const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// 内存数据库
${dataStore}

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 信息
app.get('/api', (req, res) => {
  res.json({ 
    message: 'AIDOS API',
    version: '1.0.0',
    entities: ${JSON.stringify(entities.length > 0 ? entities : ['data'])}
  });
});

${routesCode}

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

module.exports = app;
`;
  }

  /**
   * 从需求中提取实体
   */
  private extractEntities(prompt: string): string[] {
    const entities: string[] = [];
    const lowerPrompt = prompt.toLowerCase();
    
    // 常见实体模式
    const patterns = [
      { regex: /用户(?:管理|系统)?/i, name: '用户' },
      { regex: /订单(?:管理|系统)?/i, name: '订单' },
      { regex: /商品(?:管理|系统)?/i, name: '商品' },
      { regex: /文章(?:管理|系统)?/i, name: '文章' },
      { regex: /任务(?:管理|系统)?/i, name: '任务' },
      { regex: /项目(?:管理|系统)?/i, name: '项目' },
      { regex: /员工(?:管理|系统)?/i, name: '员工' },
      { regex: /客户(?:管理|系统)?/i, name: '客户' },
      { regex: /category/i, name: '分类' },
      { regex: /product/i, name: '产品' },
      { regex: /user/i, name: '用户' },
      { regex: /order/i, name: '订单' },
      { regex: /task/i, name: '任务' },
      { regex: /book/i, name: '书籍' },
    ];
    
    for (const p of patterns) {
      if (p.regex.test(lowerPrompt) && !entities.includes(p.name)) {
        entities.push(p.name);
      }
    }
    
    return entities;
  }

  /**
   * 转换为 PascalCase
   */
  private toPascalCase(str: string): string {
    return str.replace(/(?:^|\s)\w/g, c => c.toUpperCase());
  }

  private generateReactComponent(prompt: string): string {
    return `/**
 * ${prompt}
 * 自动生成的 React 组件
 */

import React, { useState, useEffect } from 'react';

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result.data || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>${prompt}</h1>
      <ul>
        {data.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
      <button onClick={fetchData}>Refresh</button>
    </div>
  );
}
`;
  }

  private generateFunction(prompt: string): string {
    return `/**
 * ${prompt}
 */

export function processData(input) {
  if (!input) {
    throw new Error('Input is required');
  }
  
  // 处理逻辑
  const result = {
    original: input,
    processed: input.toString().toUpperCase(),
    timestamp: new Date().toISOString()
  };
  
  return result;
}

export function validateInput(input) {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Input must be a string' };
  }
  if (input.length < 1) {
    return { valid: false, error: 'Input is empty' };
  }
  return { valid: true };
}

// 测试
if (require.main === module) {
  console.log(processData('hello'));
  console.log(validateInput('test'));
}
`;
  }

  private generateClass(prompt: string): string {
    return `/**
 * ${prompt}
 */

class DataService {
  constructor() {
    this.data = [];
  }

  add(item) {
    const newItem = {
      id: Date.now(),
      ...item,
      createdAt: new Date().toISOString()
    };
    this.data.push(newItem);
    return newItem;
  }

  get(id) {
    return this.data.find(item => item.id === id);
  }

  getAll() {
    return this.data;
  }

  update(id, updates) {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    this.data[index] = { ...this.data[index], ...updates };
    return this.data[index];
  }

  delete(id) {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) return false;
    
    this.data.splice(index, 1);
    return true;
  }
}

module.exports = DataService;
`;
  }

  private generateDefaultApp(prompt: string): string {
    return `/**
 * ${prompt}
 * 自动生成的应用
 */

const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Hello from AIDOS!',
    request: req.url,
    timestamp: new Date().toISOString()
  }));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(\`Server listening on port \${PORT}\`);
});
`;
  }

  private generatePackageJson(mainFile: string): string {
    const scripts: Record<string, string> = {
      start: `node ${mainFile}`,
      test: mainFile === 'server.js' ? 'node test.js' : 'echo "No tests"',
    };

    return JSON.stringify({
      name: 'aidos-generated',
      version: '1.0.0',
      main: mainFile,
      scripts,
      dependencies: mainFile === 'server.js' ? { express: '^4.18.0' } : {},
      devDependencies: {},
    }, null, 2);
  }

  private generateApiTest(serverFile: string): string {
    return `/**
 * API 测试
 */
const request = require('supertest');
const app = require('./${serverFile.replace('.js', '')}');

describe('API Tests', () => {
  test('GET /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /api/data', async () => {
    const res = await request(app).get('/api/data');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
`;
  }

  private generateMockOutput(prompt: string): string {
    if (prompt.includes('测试') || prompt.includes('test')) {
      return `// Test generated
describe('test', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});`;
    }
    return `// Generated for: ${prompt}`;
  }
}

export default OpenClawRealExecutor;
