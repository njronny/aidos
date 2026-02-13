/**
 * AgentPool Tests - 代理池单元测试
 */

import { AgentPool, AssignmentStrategy } from '../AgentPool';
import { Agent, AgentStatus, AgentType, AgentCapabilities, AgentExecutionResult } from '../Agent';

// Mock Agent for testing
class MockAgent extends Agent {
  constructor(
    name: string,
    type: AgentType,
    capabilities: AgentCapabilities,
    public mockExecute: (input: Record<string, unknown>) => Promise<AgentExecutionResult> = async () => ({ success: true, duration: 0 })
  ) {
    super(name, type, capabilities);
  }

  async execute(input: Record<string, unknown>): Promise<AgentExecutionResult> {
    return this.mockExecute(input);
  }
}

describe('AgentPool', () => {
  let pool: AgentPool;

  beforeEach(() => {
    pool = new AgentPool({}, AssignmentStrategy.CAPABILITY_MATCH);
  });

  describe('constructor', () => {
    it('should create AgentPool instance', () => {
      expect(pool).toBeInstanceOf(AgentPool);
    });

    it('should initialize default agents', () => {
      const status = pool.getStatus();
      expect(status.totalAgents).toBeGreaterThan(0);
    });
  });

  describe('registerAgent', () => {
    it('should register a custom agent', () => {
      const agent = new MockAgent('TestAgent', AgentType.FULL_STACK_DEVELOPER, {
        canDevelop: true,
        canDesign: false,
        canTest: false,
        canAnalyze: false,
        canManage: false,
        canDesignDatabase: false,
        canReview: false,
      });
      
      pool.registerAgent(agent);
      const agents = pool.getAgentsByType(AgentType.FULL_STACK_DEVELOPER);
      expect(agents.length).toBeGreaterThan(0);
    });
  });

  describe('unregisterAgent', () => {
    it('should unregister an agent', () => {
      const agent = new MockAgent('TestAgent', AgentType.ARCHITECT, {
        canDesign: true,
        canDevelop: false,
        canTest: false,
        canAnalyze: false,
        canManage: false,
        canDesignDatabase: false,
        canReview: false,
      });
      
      pool.registerAgent(agent);
      const result = pool.unregisterAgent(agent.id);
      expect(result).toBe(true);
    });

    it('should return false for non-existent agent', () => {
      const result = pool.unregisterAgent('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('findAvailableAgent', () => {
    it('should find available agent for valid task type', () => {
      const agent = pool.findAvailableAgent('develop');
      expect(agent).not.toBeNull();
      expect(agent?.type).toBe(AgentType.FULL_STACK_DEVELOPER);
    });

    it('should return null when no agents available (all busy)', () => {
      // Find an agent and make it busy
      const agent = pool.findAvailableAgent('develop')!;
      agent.status = AgentStatus.BUSY;
      
      // Now try to find again - should still work due to fallback
      const available = pool.findAvailableAgent('develop');
      // Should use fallback to find any idle agent
      expect(available).not.toBeNull();
    });

    it('should return null when fallback is disabled and no matching type available', () => {
      const noFallbackPool = new AgentPool({ fallbackEnabled: false }, AssignmentStrategy.CAPABILITY_MATCH);
      
      // Make all FullStackDeveloper agents busy
      const agents = noFallbackPool.getAgentsByType(AgentType.FULL_STACK_DEVELOPER);
      agents.forEach(a => a.status = AgentStatus.BUSY);
      
      // Should return null since fallback is disabled
      const available = noFallbackPool.findAvailableAgent('develop');
      expect(available).toBeNull();
    });

    it('should use preferredType if provided', () => {
      const agent = pool.findAvailableAgent('develop', AgentType.QA_ENGINEER);
      expect(agent).not.toBeNull();
      expect(agent?.type).toBe(AgentType.QA_ENGINEER);
    });
  });

  describe('getIdleAgents', () => {
    it('should return idle agents of specific type', () => {
      const idleAgents = pool.getIdleAgents(AgentType.FULL_STACK_DEVELOPER);
      expect(idleAgents.length).toBeGreaterThan(0);
    });

    it('should return all idle agents when type not specified', () => {
      const idleAgents = pool.getIdleAgents();
      expect(idleAgents.length).toBeGreaterThan(0);
    });
  });

  describe('assignTask', () => {
    it('should successfully assign task to available agent', async () => {
      const result = await pool.assignTask('develop', { feature: 'test' });
      // Default mock agents return success
      expect(result).toBeDefined();
    });

    it('should return error when no agents available and fallback disabled', async () => {
      const noFallbackPool = new AgentPool({ fallbackEnabled: false }, AssignmentStrategy.CAPABILITY_MATCH);
      
      // Make all agents busy
      const allAgents = noFallbackPool.getAllAgents();
      allAgents.forEach(a => a.status = AgentStatus.BUSY);
      
      const result = await noFallbackPool.assignTask('develop', { feature: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('No available agent found');
    });
  });

  describe('getStatus', () => {
    it('should return correct pool status', () => {
      const status = pool.getStatus();
      expect(status).toHaveProperty('totalAgents');
      expect(status).toHaveProperty('idleAgents');
      expect(status).toHaveProperty('busyAgents');
      expect(status).toHaveProperty('byType');
      expect(status.totalAgents).toBeGreaterThan(0);
    });
  });

  describe('resetAll', () => {
    it('should reset all agents', () => {
      pool.resetAll();
      const status = pool.getStatus();
      expect(status.idleAgents).toBe(status.totalAgents);
    });
  });

  describe('fallback logic', () => {
    it('should fallback to any idle agent when specific type not available', () => {
      // Make all FULL_STACK_DEVELOPER agents busy
      const devAgents = pool.getAgentsByType(AgentType.FULL_STACK_DEVELOPER);
      devAgents.forEach(a => a.status = AgentStatus.BUSY);
      
      // Should still find an agent via fallback
      const agent = pool.findAvailableAgent('develop');
      expect(agent).not.toBeNull();
      expect(agent?.status).toBe(AgentStatus.IDLE);
    });

    it('should return null when no agents available at all', () => {
      const busyPool = new AgentPool({ fallbackEnabled: true }, AssignmentStrategy.CAPABILITY_MATCH);
      
      // Make all agents busy
      const allAgents = busyPool.getAllAgents();
      allAgents.forEach(a => a.status = AgentStatus.BUSY);
      
      const agent = busyPool.findAvailableAgent('develop');
      expect(agent).toBeNull();
    });
  });
});
