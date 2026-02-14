/**
 * AgentTeam Tests - TDD
 * 
 * 测试 Agent 协作框架
 */

import { AgentTeam, Agent, AgentRole, AgentMessage, TeamTask } from '../AgentTeam';

describe('AgentTeam', () => {
  let team: AgentTeam;

  beforeEach(() => {
    team = new AgentTeam();
    // Clear default agents for clean tests
    const defaultIds = ['pm', 'product', 'architect', 'developer', 'qa', 'dba'];
    defaultIds.forEach(id => team.unregisterAgent(id));
  });

  describe('constructor', () => {
    it('should create empty agent team', () => {
      expect(team).toBeDefined();
      expect(team.getAgents().length).toBe(0);
    });
  });

  describe('registerAgent', () => {
    it('should register an agent', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Developer',
        role: 'developer',
        capabilities: ['code', 'test'],
        status: 'idle',
      };

      team.registerAgent(agent);
      
      expect(team.getAgents().length).toBe(1);
      expect(team.getAgent('agent-1')).toEqual(agent);
    });

    it('should throw for duplicate agent id', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Dev',
        role: 'developer',
        capabilities: ['code'],
        status: 'idle',
      };

      team.registerAgent(agent);
      
      expect(() => team.registerAgent(agent)).toThrow('already exists');
    });
  });

  describe('unregisterAgent', () => {
    it('should unregister an agent', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Dev',
        role: 'developer',
        capabilities: ['code'],
        status: 'idle',
      };

      team.registerAgent(agent);
      team.unregisterAgent('agent-1');
      
      expect(team.getAgents().length).toBe(0);
    });
  });

  describe('assignTask', () => {
    it('should assign task to available agent', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Dev',
        role: 'developer',
        capabilities: ['code'],
        status: 'idle',
      };
      team.registerAgent(agent);

      const task: TeamTask = {
        id: 'task-1',
        title: '开发功能',
        description: '实现某个功能',
        requiredRole: 'developer',
      };

      const assigned = team.assignTask(task);
      
      expect(assigned).toBe(true);
    });

    it('should reject task if no suitable agent', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'QA',
        role: 'qa',
        capabilities: ['test'],
        status: 'idle',
      };
      team.registerAgent(agent);

      const task: TeamTask = {
        id: 'task-1',
        title: '开发功能',
        description: '实现某个功能',
        requiredRole: 'developer',
      };

      const assigned = team.assignTask(task);
      
      expect(assigned).toBe(false);
    });
  });

  describe('broadcastMessage', () => {
    it('should broadcast message to all agents', () => {
      const agent1: Agent = { id: 'a1', name: 'Dev', role: 'developer', capabilities: [], status: 'idle' };
      const agent2: Agent = { id: 'a2', name: 'QA', role: 'qa', capabilities: [], status: 'idle' };
      
      team.registerAgent(agent1);
      team.registerAgent(agent2);

      const message: AgentMessage = {
        from: 'system',
        to: 'all',
        content: 'New task available',
        timestamp: Date.now(),
      };

      const received = team.broadcastMessage(message);
      
      expect(received).toBe(2);
    });
  });

  describe('sendMessage', () => {
    it('should send message to specific agent', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Dev',
        role: 'developer',
        capabilities: [],
        status: 'idle',
      };
      team.registerAgent(agent);

      const message: AgentMessage = {
        from: 'system',
        to: 'agent-1',
        content: 'Hello',
        timestamp: Date.now(),
      };

      const sent = team.sendMessage(message);
      
      expect(sent).toBe(true);
    });
  });

  describe('getTeamStatus', () => {
    it('should return team status', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Dev',
        role: 'developer',
        capabilities: [],
        status: 'working',
      };
      team.registerAgent(agent);

      const status = team.getTeamStatus();
      
      expect(status).toHaveProperty('totalAgents');
      expect(status).toHaveProperty('availableAgents');
      expect(status.totalAgents).toBe(1);
      expect(status.availableAgents).toBe(0);
    });
  });

  describe('collaborate', () => {
    it('should enable collaboration between agents', async () => {
      const devAgent: Agent = {
        id: 'dev',
        name: 'Developer',
        role: 'developer',
        capabilities: ['code'],
        status: 'idle',
      };
      const qaAgent: Agent = {
        id: 'qa',
        name: 'QA Engineer',
        role: 'qa',
        capabilities: ['test'],
        status: 'idle',
      };
      
      team.registerAgent(devAgent);
      team.registerAgent(qaAgent);

      const task: TeamTask = {
        id: 'task-1',
        title: '开发并测试功能',
        description: '实现功能并测试',
        requiredRole: 'developer',
        collaboration: true,
      };

      const result = await team.collaborate(task);
      
      expect(result).toHaveProperty('taskId');
      expect(result).toHaveProperty('steps');
    });
  });
});

describe('AgentRole', () => {
  it('should have valid roles', () => {
    const roles: AgentRole[] = ['pm', 'product', 'architect', 'developer', 'qa', 'dba'];
    
    expect(roles).toContain('developer');
    expect(roles).toContain('qa');
  });
});

describe('AgentMessage', () => {
  it('should create valid agent message', () => {
    const message: AgentMessage = {
      from: 'agent-1',
      to: 'agent-2',
      content: 'Task completed',
      timestamp: Date.now(),
    };
    
    expect(message.from).toBe('agent-1');
    expect(message.to).toBe('agent-2');
    expect(message.content).toBe('Task completed');
  });
});
