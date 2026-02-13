import { 
  Agent, 
  AgentType, 
  AgentStatus, 
  AgentCapabilities, 
  AgentExecutionResult,
  AgentTask 
} from './Agent';
import { ProjectManager } from './ProjectManager';
import { ProductManager } from './ProductManager';
import { Architect } from './Architect';
import { FullStackDeveloper } from './FullStackDeveloper';
import { QAEngineer } from './QAEngineer';
import { DatabaseExpert } from './DatabaseExpert';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent Pool Events - 代理池事件
 */
export enum AgentPoolEventType {
  AGENT_REGISTERED = 'agent_registered',
  AGENT_UNREGISTERED = 'agent_unregistered',
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  AGENT_STATUS_CHANGED = 'agent_status_changed',
}

export interface AgentPoolEvent {
  type: AgentPoolEventType;
  agentId?: string;
  taskId?: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export type AgentPoolEventHandler = (event: AgentPoolEvent) => void;

/**
 * Agent Pool Configuration - 代理池配置
 */
export interface AgentPoolConfig {
  maxConcurrentTasksPerAgent: number;
  taskTimeout: number;
  enableAutoAssignment: boolean;
  fallbackEnabled: boolean;
}

/**
 * Agent Assignment Strategy - 代理分配策略
 */
export enum AssignmentStrategy {
  ROUND_ROBIN = 'round_robin',       // 轮询分配
  LEAST_LOADED = 'least_loaded',     // 选择负载最低
  CAPABILITY_MATCH = 'capability_match', // 能力匹配优先
  RANDOM = 'random',                 // 随机分配
}

/**
 * Agent Pool - 代理池管理器
 * 负责代理的注册、发现、调度和状态管理
 */
export class AgentPool {
  private agents: Map<AgentType, Agent[]> = new Map();
  private allAgents: Map<string, Agent> = new Map();
  private config: AgentPoolConfig;
  private eventHandlers: AgentPoolEventHandler[] = [];
  private assignmentStrategy: AssignmentStrategy;
  private taskQueue: Map<string, AgentTask> = new Map();

  constructor(
    config: Partial<AgentPoolConfig> = {},
    strategy: AssignmentStrategy = AssignmentStrategy.CAPABILITY_MATCH
  ) {
    this.config = {
      maxConcurrentTasksPerAgent: config.maxConcurrentTasksPerAgent ?? 1,
      taskTimeout: config.taskTimeout ?? 300000,
      enableAutoAssignment: config.enableAutoAssignment ?? true,
      fallbackEnabled: config.fallbackEnabled ?? true,
    };
    this.assignmentStrategy = strategy;

    // 初始化代理池
    this.initializeDefaultAgents();
  }

  /**
   * 初始化默认代理
   */
  private initializeDefaultAgents(): void {
    // 注册所有类型的代理
    this.registerAgent(new ProjectManager());
    this.registerAgent(new ProductManager());
    this.registerAgent(new Architect());
    this.registerAgent(new FullStackDeveloper());
    this.registerAgent(new QAEngineer());
    this.registerAgent(new DatabaseExpert());

    console.log('[AgentPool] Default agents initialized');
  }

  /**
   * 注册代理
   */
  registerAgent(agent: Agent): void {
    const type = agent.type;
    
    if (!this.agents.has(type)) {
      this.agents.set(type, []);
    }
    
    this.agents.get(type)!.push(agent);
    this.allAgents.set(agent.id, agent);

    this.emitEvent({
      type: AgentPoolEventType.AGENT_REGISTERED,
      agentId: agent.id,
      timestamp: new Date(),
      data: { agentType: type, agentName: agent.name },
    });

    console.log(`[AgentPool] Registered agent: ${agent.name} (${type})`);
  }

  /**
   * 注销代理
   */
  unregisterAgent(agentId: string): boolean {
    const agent = this.allAgents.get(agentId);
    if (!agent) return false;

    const typeAgents = this.agents.get(agent.type);
    if (typeAgents) {
      const index = typeAgents.findIndex(a => a.id === agentId);
      if (index !== -1) {
        typeAgents.splice(index, 1);
      }
    }

    this.allAgents.delete(agentId);

    this.emitEvent({
      type: AgentPoolEventType.AGENT_UNREGISTERED,
      agentId,
      timestamp: new Date(),
      data: { agentType: agent.type },
    });

    console.log(`[AgentPool] Unregistered agent: ${agent.name}`);
    return true;
  }

  /**
   * 根据类型获取代理
   */
  getAgentsByType(type: AgentType): Agent[] {
    return this.agents.get(type) || [];
  }

  /**
   * 根据ID获取代理
   */
  getAgent(agentId: string): Agent | undefined {
    return this.allAgents.get(agentId);
  }

  /**
   * 获取所有代理
   */
  getAllAgents(): Agent[] {
    return Array.from(this.allAgents.values());
  }

  /**
   * 获取空闲代理
   */
  getIdleAgents(type?: AgentType): Agent[] {
    const agentsToCheck = type 
      ? this.agents.get(type) || [] 
      : Array.from(this.allAgents.values());

    return agentsToCheck.filter(agent => agent.status === AgentStatus.IDLE);
  }

  /**
   * 查找可以处理任务的代理
   * @returns 可用的Agent实例，如果没有可用代理则返回null
   */
  findAvailableAgent(taskType: string, preferredType?: AgentType): Agent | null {
    const matchingType = this.mapTaskTypeToAgentType(taskType);
    const typesToCheck: AgentType[] = preferredType 
      ? [preferredType] 
      : (matchingType ? [matchingType] : Object.values(AgentType));

    for (const type of typesToCheck) {
      const agents = this.agents.get(type) || [];
      const idleAgents = agents.filter(a => a.status === AgentStatus.IDLE);
      
      if (idleAgents.length > 0) {
        // 根据策略选择代理
        switch (this.assignmentStrategy) {
          case AssignmentStrategy.ROUND_ROBIN:
            return idleAgents[0];
          case AssignmentStrategy.LEAST_LOADED:
            return this.selectLeastLoaded(idleAgents);
          case AssignmentStrategy.RANDOM:
            return idleAgents[Math.floor(Math.random() * idleAgents.length)];
          case AssignmentStrategy.CAPABILITY_MATCH:
          default:
            return idleAgents.find(a => a.canHandle(taskType)) || idleAgents[0];
        }
      }
    }

    // 尝试fallback: 查找任意空闲代理（不管类型是否匹配）
    if (this.config.fallbackEnabled) {
      return this.findAnyIdleAgent();
    }

    return null;
  }

  /**
   * 查找任意空闲代理（作为最后的fallback）
   * @returns 任意空闲的Agent，如果没有则返回null
   */
  private findAnyIdleAgent(): Agent | null {
    for (const agents of this.agents.values()) {
      const idleAgent = agents.find(a => a.status === AgentStatus.IDLE);
      if (idleAgent) {
        return idleAgent;
      }
    }
    return null;
  }

  /**
   * 选择负载最低的代理
   */
  private selectLeastLoaded(agents: Agent[]): Agent {
    let minTasks = Infinity;
    let selected = agents[0];

    for (const agent of agents) {
      const taskCount = agent.completedTasks.length;
      if (taskCount < minTasks) {
        minTasks = taskCount;
        selected = agent;
      }
    }

    return selected;
  }

  /**
   * 将任务映射到代理类型
   */
  private mapTaskTypeToAgentType(taskType: string): AgentType | null {
    const mapping: Record<string, AgentType> = {
      'plan': AgentType.PROJECT_MANAGER,
      'manage': AgentType.PROJECT_MANAGER,
      'assign': AgentType.PROJECT_MANAGER,
      'track': AgentType.PROJECT_MANAGER,
      'analyze': AgentType.PRODUCT_MANAGER,
      'requirement': AgentType.PRODUCT_MANAGER,
      'story': AgentType.PRODUCT_MANAGER,
      'PRD': AgentType.PRODUCT_MANAGER,
      'design': AgentType.ARCHITECT,
      'architecture': AgentType.ARCHITECT,
      'tech_stack': AgentType.ARCHITECT,
      'develop': AgentType.FULL_STACK_DEVELOPER,
      'implement': AgentType.FULL_STACK_DEVELOPER,
      'api': AgentType.FULL_STACK_DEVELOPER,
      'frontend': AgentType.FULL_STACK_DEVELOPER,
      'backend': AgentType.FULL_STACK_DEVELOPER,
      'test': AgentType.QA_ENGINEER,
      'testing': AgentType.QA_ENGINEER,
      'automate': AgentType.QA_ENGINEER,
      'review': AgentType.QA_ENGINEER,
      'database': AgentType.DATABASE_EXPERT,
      'db_design': AgentType.DATABASE_EXPERT,
      'optimize': AgentType.DATABASE_EXPERT,
      'migration': AgentType.DATABASE_EXPERT,
    };

    return mapping[taskType.toLowerCase()] || null;
  }

  /**
   * 分配任务给代理
   */
  async assignTask(
    taskType: string,
    input: Record<string, unknown>,
    preferredAgentId?: string
  ): Promise<AgentExecutionResult> {
    let agent: Agent | null = null;

    // 优先使用指定的代理
    if (preferredAgentId) {
      const preferredAgent = this.allAgents.get(preferredAgentId);
      if (preferredAgent && preferredAgent.status === AgentStatus.IDLE) {
        agent = preferredAgent;
      }
    }

    // 如果没有指定代理或指定代理不可用，自动分配
    if (!agent) {
      agent = this.findAvailableAgent(taskType);
    }

    // 如果没有可用代理，尝试使用fallback
    if (!agent && this.config.fallbackEnabled) {
      const anyIdle = this.getIdleAgents();
      if (anyIdle.length > 0) {
        agent = anyIdle[0];
      }
    }

    if (!agent) {
      return {
        success: false,
        error: 'No available agent found',
        duration: 0,
      };
    }

    // 创建任务
    const task: AgentTask = {
      id: uuidv4(),
      type: taskType,
      input,
      assignedAt: new Date(),
    };

    // 更新代理状态
    agent.status = AgentStatus.BUSY;
    agent.currentTask = task;
    this.taskQueue.set(task.id, task);

    this.emitEvent({
      type: AgentPoolEventType.TASK_ASSIGNED,
      agentId: agent.id,
      taskId: task.id,
      timestamp: new Date(),
      data: { taskType, agentType: agent.type },
    });

    try {
      // 执行任务
      const result = await Promise.race([
        agent.execute(input),
        new Promise<AgentExecutionResult>((_, reject) => 
          setTimeout(() => reject(new Error('Task timeout')), this.config.taskTimeout)
        )
      ]);

      // 完成任务
      task.completedAt = new Date();
      task.result = result;
      agent.completedTasks.push(task);
      agent.status = AgentStatus.IDLE;
      agent.currentTask = null;

      this.emitEvent({
        type: AgentPoolEventType.TASK_COMPLETED,
        agentId: agent.id,
        taskId: task.id,
        timestamp: new Date(),
        data: { success: result.success },
      });

      return result;
    } catch (error) {
      // 任务失败
      agent.status = AgentStatus.ERROR;
      
      const errorResult: AgentExecutionResult = {
        success: false,
        error: (error as Error).message,
        duration: 0,
      };

      this.emitEvent({
        type: AgentPoolEventType.TASK_FAILED,
        agentId: agent.id,
        taskId: task.id,
        timestamp: new Date(),
        data: { error: (error as Error).message },
      });

      // 重置代理状态
      agent.reset();
      
      return errorResult;
    }
  }

  /**
   * 根据需求自动分配代理
   */
  async assignForRequirement(requirement: {
    title: string;
    description: string;
    type?: string;
  }): Promise<Map<AgentType, AgentExecutionResult>> {
    const results = new Map<AgentType, AgentExecutionResult>();
    const title = requirement.title.toLowerCase();
    const desc = requirement.description.toLowerCase();

    // 1. 产品经理分析需求
    if (title.includes('需求') || desc.includes('需要') || desc.includes('feature')) {
      const pmResult = await this.assignTask('analyze', {
        action: 'analyze',
        requirement: requirement.title,
        source: '用户',
      });
      results.set(AgentType.PRODUCT_MANAGER, pmResult);
    }

    // 2. 架构师设计架构
    if (title.includes('系统') || title.includes('架构') || desc.includes('system')) {
      const architectResult = await this.assignTask('design', {
        action: 'design',
        projectName: requirement.title,
        requirements: [requirement.description],
      });
      results.set(AgentType.ARCHITECT, architectResult);
    }

    // 3. 数据库专家设计数据库
    if (title.includes('数据库') || title.includes('数据') || desc.includes('database')) {
      const dbResult = await this.assignTask('database', {
        action: 'design',
        projectName: requirement.title,
        entities: ['核心实体'],
      });
      results.set(AgentType.DATABASE_EXPERT, dbResult);
    }

    // 4. 全栈开发实现功能
    if (title.includes('功能') || title.includes('开发') || desc.includes('implement')) {
      const devResult = await this.assignTask('develop', {
        action: 'develop',
        featureName: requirement.title,
        description: requirement.description,
      });
      results.set(AgentType.FULL_STACK_DEVELOPER, devResult);
    }

    // 5. QA工程师编写测试
    if (title.includes('测试') || title.includes('test')) {
      const qaResult = await this.assignTask('test', {
        action: 'case',
        featureName: requirement.title,
        testType: 'functional',
      });
      results.set(AgentType.QA_ENGINEER, qaResult);
    }

    // 6. 项目经理规划项目
    if (title.includes('项目') || desc.includes('project')) {
      const pmgrResult = await this.assignTask('plan', {
        action: 'plan',
        requirement: requirement.title,
        estimatedDays: 30,
      });
      results.set(AgentType.PROJECT_MANAGER, pmgrResult);
    }

    return results;
  }

  /**
   * 订阅事件
   */
  onEvent(handler: AgentPoolEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * 触发事件
   */
  private emitEvent(event: AgentPoolEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[AgentPool] Event handler error:', error);
      }
    }
  }

  /**
   * 获取代理池状态
   */
  getStatus(): {
    totalAgents: number;
    idleAgents: number;
    busyAgents: number;
    byType: Record<string, number>;
  } {
    const allAgents = Array.from(this.allAgents.values());
    const idleCount = allAgents.filter(a => a.status === AgentStatus.IDLE).length;
    const busyCount = allAgents.filter(a => a.status === AgentStatus.BUSY).length;

    const byType: Record<string, number> = {};
    for (const [type, agents] of this.agents) {
      byType[type] = agents.length;
    }

    return {
      totalAgents: allAgents.length,
      idleAgents: idleCount,
      busyAgents: busyCount,
      byType,
    };
  }

  /**
   * 重置所有代理
   */
  resetAll(): void {
    for (const agent of this.allAgents.values()) {
      agent.reset();
    }
    this.taskQueue.clear();
    console.log('[AgentPool] All agents reset');
  }
}

export default AgentPool;
