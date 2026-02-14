/**
 * AgentTeam - Multi-Agent Collaboration Framework
 * 
 * 多代理协作框架
 * - 代理注册与管理
 * - 任务分配
 * - 消息通信
 * - 协作工作流
 */

export type AgentRole = 'pm' | 'product' | 'architect' | 'developer' | 'qa' | 'dba';
export type AgentStatus = 'idle' | 'working' | 'blocked' | 'error';

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  capabilities: string[];
  status: AgentStatus;
  currentTask?: string;
  metadata?: Record<string, any>;
}

export interface AgentMessage {
  from: string;
  to: string;
  content: string;
  timestamp: number;
  type?: 'task' | 'notification' | 'request' | 'response';
}

export interface TeamTask {
  id: string;
  title: string;
  description: string;
  requiredRole: AgentRole;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  collaboration?: boolean;
  dependencies?: string[];
}

export interface TeamStatus {
  totalAgents: number;
  availableAgents: number;
  workingAgents: number;
  blockedAgents: number;
}

export interface CollaborationResult {
  taskId: string;
  steps: Array<{
    agentId: string;
    action: string;
    result: string;
  }>;
  completedAt: number;
}

export class AgentTeam {
  private agents: Map<string, Agent> = new Map();
  private messageQueue: Map<string, AgentMessage[]> = new Map();

  constructor() {
    // Initialize with default agents
    this.initializeDefaultAgents();
  }

  /**
   * 初始化默认代理团队
   */
  private initializeDefaultAgents(): void {
    const defaultAgents: Agent[] = [
      { id: 'pm', name: 'Project Manager', role: 'pm', capabilities: ['coordination', 'planning'], status: 'idle' },
      { id: 'product', name: 'Product Manager', role: 'product', capabilities: ['requirements', 'prd'], status: 'idle' },
      { id: 'architect', name: 'System Architect', role: 'architect', capabilities: ['design', 'architecture'], status: 'idle' },
      { id: 'developer', name: 'Full Stack Developer', role: 'developer', capabilities: ['code', 'test'], status: 'idle' },
      { id: 'qa', name: 'QA Engineer', role: 'qa', capabilities: ['test', 'quality'], status: 'idle' },
      { id: 'dba', name: 'Database Expert', role: 'dba', capabilities: ['database', 'sql'], status: 'idle' },
    ];

    defaultAgents.forEach(agent => {
      this.agents.set(agent.id, agent);
      this.messageQueue.set(agent.id, []);
    });
  }

  /**
   * 注册代理
   */
  registerAgent(agent: Agent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent ${agent.id} already exists`);
    }
    this.agents.set(agent.id, agent);
    this.messageQueue.set(agent.id, []);
  }

  /**
   * 注销代理
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.messageQueue.delete(agentId);
  }

  /**
   * 获取代理
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * 获取所有代理
   */
  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * 根据角色获取代理
   */
  getAgentsByRole(role: AgentRole): Agent[] {
    return this.getAgents().filter(a => a.role === role);
  }

  /**
   * 分配任务
   */
  assignTask(task: TeamTask): boolean {
    const suitableAgents = this.getAgents().filter(a => 
      a.role === task.requiredRole && a.status === 'idle'
    );

    if (suitableAgents.length === 0) {
      return false;
    }

    // Assign to first available agent
    const agent = suitableAgents[0];
    agent.status = 'working';
    agent.currentTask = task.id;

    return true;
  }

  /**
   * 广播消息
   */
  broadcastMessage(message: AgentMessage): number {
    let count = 0;
    
    for (const agentId of this.agents.keys()) {
      if (this.sendMessage({ ...message, to: agentId })) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * 发送消息
   */
  sendMessage(message: AgentMessage): boolean {
    const queue = this.messageQueue.get(message.to);
    if (!queue) {
      return false;
    }
    
    queue.push(message);
    return true;
  }

  /**
   * 获取消息
   */
  getMessages(agentId: string): AgentMessage[] {
    return this.messageQueue.get(agentId) || [];
  }

  /**
   * 清空消息
   */
  clearMessages(agentId: string): void {
    const queue = this.messageQueue.get(agentId);
    if (queue) {
      queue.length = 0;
    }
  }

  /**
   * 获取团队状态
   */
  getTeamStatus(): TeamStatus {
    const agents = this.getAgents();
    
    return {
      totalAgents: agents.length,
      availableAgents: agents.filter(a => a.status === 'idle').length,
      workingAgents: agents.filter(a => a.status === 'working').length,
      blockedAgents: agents.filter(a => a.status === 'blocked').length,
    };
  }

  /**
   * 协作执行任务
   */
  async collaborate(task: TeamTask): Promise<CollaborationResult> {
    const steps: CollaborationResult['steps'] = [];
    
    // Step 1: PM analyzes task
    const pmAgents = this.getAgentsByRole('pm');
    if (pmAgents.length > 0) {
      steps.push({
        agentId: pmAgents[0].id,
        action: 'analyze',
        result: 'Task analyzed and prioritized',
      });
    }

    // Step 2: Architect designs
    const archAgents = this.getAgentsByRole('architect');
    if (archAgents.length > 0) {
      steps.push({
        agentId: archAgents[0].id,
        action: 'design',
        result: 'Architecture designed',
      });
    }

    // Step 3: Developer implements
    const devAgents = this.getAgentsByRole('developer');
    if (devAgents.length > 0) {
      steps.push({
        agentId: devAgents[0].id,
        action: 'implement',
        result: 'Code implemented',
      });
    }

    // Step 4: QA tests
    const qaAgents = this.getAgentsByRole('qa');
    if (qaAgents.length > 0) {
      steps.push({
        agentId: qaAgents[0].id,
        action: 'test',
        result: 'Tests passed',
      });
    }

    return {
      taskId: task.id,
      steps,
      completedAt: Date.now(),
    };
  }

  /**
   * 更新代理状态
   */
  updateAgentStatus(agentId: string, status: AgentStatus): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      if (status === 'idle') {
        agent.currentTask = undefined;
      }
    }
  }

  /**
   * 获取可用代理
   */
  getAvailableAgents(): Agent[] {
    return this.getAgents().filter(a => a.status === 'idle');
  }
}

export default AgentTeam;
