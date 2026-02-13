import { v4 as uuidv4 } from 'uuid';

/**
 * Agent Status - 代理状态
 */
export enum AgentStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  OFFLINE = 'offline',
  ERROR = 'error',
}

/**
 * Agent Capabilities - 代理能力
 */
export interface AgentCapabilities {
  canDesign: boolean;          // 可以进行设计
  canDevelop: boolean;         // 可以进行开发
  canTest: boolean;           // 可以进行测试
  canAnalyze: boolean;        // 可以进行分析
  canManage: boolean;         // 可以进行管理
  canDesignDatabase: boolean; // 可以设计数据库
  canReview: boolean;         // 可以进行代码审查
  supportedLanguages?: string[]; // 支持的编程语言
  supportedFrameworks?: string[]; // 支持的框架
}

/**
 * Agent Type - 代理类型
 */
export enum AgentType {
  PROJECT_MANAGER = 'project_manager',
  PRODUCT_MANAGER = 'product_manager',
  ARCHITECT = 'architect',
  FULL_STACK_DEVELOPER = 'full_stack_developer',
  QA_ENGINEER = 'qa_engineer',
  DATABASE_EXPERT = 'database_expert',
}

/**
 * Agent Execution Result - 代理执行结果
 */
export interface AgentExecutionResult {
  success: boolean;
  output?: string;
  artifacts?: string[];
  data?: Record<string, unknown>;
  error?: string;
  duration: number;
}

/**
 * Agent Task - 代理任务
 */
export interface AgentTask {
  id: string;
  type: string;
  input: Record<string, unknown>;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: AgentExecutionResult;
}

/**
 * Base Agent - 代理基类
 * 所有专业代理的抽象基类
 */
export abstract class Agent {
  public readonly id: string;
  public readonly name: string;
  public readonly type: AgentType;
  public readonly capabilities: AgentCapabilities;
  public status: AgentStatus;
  public currentTask: AgentTask | null;
  public completedTasks: AgentTask[];
  public metadata: Record<string, unknown>;

  constructor(
    name: string,
    type: AgentType,
    capabilities: AgentCapabilities
  ) {
    this.id = uuidv4();
    this.name = name;
    this.type = type;
    this.capabilities = capabilities;
    this.status = AgentStatus.IDLE;
    this.currentTask = null;
    this.completedTasks = [];
    this.metadata = {};
  }

  /**
   * Execute a task - 执行任务
   * 子类必须实现具体的执行逻辑
   */
  abstract execute(input: Record<string, unknown>): Promise<AgentExecutionResult>;

  /**
   * Reset the agent - 重置代理
   * 清除当前状态和任务
   */
  reset(): void {
    this.status = AgentStatus.IDLE;
    this.currentTask = null;
    this.metadata = {};
    console.log(`[Agent] ${this.name} has been reset`);
  }

  /**
   * Check if agent can handle a specific task type
   */
  canHandle(taskType: string): boolean {
    switch (taskType) {
      case 'design':
      case 'architecture':
        return this.capabilities.canDesign;
      case 'develop':
      case 'implement':
      case 'coding':
        return this.capabilities.canDevelop;
      case 'test':
      case 'testing':
        return this.capabilities.canTest;
      case 'analyze':
      case 'analysis':
        return this.capabilities.canAnalyze;
      case 'manage':
      case 'management':
        return this.capabilities.canManage;
      case 'database':
      case 'db_design':
        return this.capabilities.canDesignDatabase;
      case 'review':
        return this.capabilities.canReview;
      default:
        return false;
    }
  }

  /**
   * Get agent info
   */
  getInfo(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      capabilities: this.capabilities,
      completedTasksCount: this.completedTasks.length,
      isBusy: this.status === AgentStatus.BUSY,
    };
  }
}

export default Agent;
