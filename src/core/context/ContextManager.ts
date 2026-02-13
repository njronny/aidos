import { v4 as uuidv4 } from 'uuid';
import {
  ContextData,
  AgentContext,
  FileContext,
  ProjectConfig,
  ContextHistory,
  ContextSnapshot,
} from './types';

/**
 * Context Manager
 * Manages project context, agent memory, and state throughout the development lifecycle
 */
export class ContextManager {
  private context: ContextData;
  private snapshots: ContextSnapshot[] = [];
  private maxHistorySize: number;
  private maxSnapshots: number;

  constructor(
    projectName: string,
    projectPath: string,
    config: Partial<ProjectConfig> = {},
    maxHistorySize = 1000,
    maxSnapshots = 10
  ) {
    this.maxHistorySize = maxHistorySize;
    this.maxSnapshots = maxSnapshots;

    this.context = {
      projectName,
      projectPath,
      agents: [],
      files: [],
      config: {
        language: config.language ?? 'typescript',
        framework: config.framework,
        testing: config.testing ?? 'jest',
        linter: config.linter ?? 'eslint',
        formatter: config.formatter ?? 'prettier',
      },
      history: [],
    };

    this.addHistoryEntry('context_initialized', { projectName, projectPath });
  }

  /**
   * Add an agent to the context
   */
  addAgent(role: string, capabilities: string[]): string {
    const id = uuidv4();
    const agent: AgentContext = {
      id,
      role,
      capabilities,
    };

    this.context.agents.push(agent);
    this.addHistoryEntry('agent_added', { id, role });

    return id;
  }

  /**
   * Remove an agent from the context
   */
  removeAgent(agentId: string): boolean {
    const index = this.context.agents.findIndex((a) => a.id === agentId);
    if (index !== -1) {
      const removed = this.context.agents.splice(index, 1)[0];
      this.addHistoryEntry('agent_removed', { id: agentId, role: removed.role });
      return true;
    }
    return false;
  }

  /**
   * Update agent's current task
   */
  setAgentTask(agentId: string, taskId: string): void {
    const agent = this.context.agents.find((a) => a.id === agentId);
    if (agent) {
      agent.currentTask = taskId;
      this.addHistoryEntry('agent_task_assigned', { agentId, taskId });
    }
  }

  /**
   * Update agent's memory
   */
  updateAgentMemory(agentId: string, memory: string): void {
    const agent = this.context.agents.find((a) => a.id === agentId);
    if (agent) {
      agent.memory = memory;
      this.addHistoryEntry('agent_memory_updated', { agentId });
    }
  }

  /**
   * Add file to context
   */
  addFile(path: string, type: 'file' | 'directory', content?: string, language?: string): void {
    const file: FileContext = {
      path,
      type,
      content,
      language,
      lastModified: new Date(),
    };

    // Remove existing if present
    this.context.files = this.context.files.filter((f) => f.path !== path);
    this.context.files.push(file);

    this.addHistoryEntry('file_added', { path, type });
  }

  /**
   * Remove file from context
   */
  removeFile(path: string): boolean {
    const index = this.context.files.findIndex((f) => f.path === path);
    if (index !== -1) {
      this.context.files.splice(index, 1);
      this.addHistoryEntry('file_removed', { path });
      return true;
    }
    return false;
  }

  /**
   * Get file context
   */
  getFile(path: string): FileContext | undefined {
    return this.context.files.find((f) => f.path === path);
  }

  /**
   * Get all files
   */
  getAllFiles(): FileContext[] {
    return [...this.context.files];
  }

  /**
   * Get context for a specific agent
   */
  getAgentContext(agentId: string): AgentContext | undefined {
    return this.context.agents.find((a) => a.id === agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentContext[] {
    return [...this.context.agents];
  }

  /**
   * Get full context data
   */
  getContext(): ContextData {
    return { ...this.context };
  }

  /**
   * Get project configuration
   */
  getConfig(): ProjectConfig {
    return { ...this.context.config };
  }

  /**
   * Update project configuration
   */
  updateConfig(config: Partial<ProjectConfig>): void {
    this.context.config = { ...this.context.config, ...config };
    this.addHistoryEntry('config_updated', config);
  }

  /**
   * Add history entry
   */
  private addHistoryEntry(event: string, data?: unknown): void {
    const entry: ContextHistory = {
      timestamp: new Date(),
      event,
      data,
    };

    this.context.history.push(entry);

    // Trim history if needed
    if (this.context.history.length > this.maxHistorySize) {
      this.context.history = this.context.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get history
   */
  getHistory(limit?: number): ContextHistory[] {
    if (limit) {
      return this.context.history.slice(-limit);
    }
    return [...this.context.history];
  }

  /**
   * Create a snapshot of current context
   */
  createSnapshot(): string {
    const snapshot: ContextSnapshot = {
      id: uuidv4(),
      timestamp: new Date(),
      data: JSON.parse(JSON.stringify(this.context)),
    };

    this.snapshots.push(snapshot);

    // Trim snapshots if needed
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    this.addHistoryEntry('snapshot_created', { id: snapshot.id });

    return snapshot.id;
  }

  /**
   * Restore from a snapshot
   */
  restoreSnapshot(snapshotId: string): boolean {
    const snapshot = this.snapshots.find((s) => s.id === snapshotId);
    if (snapshot) {
      this.context = JSON.parse(JSON.stringify(snapshot.data));
      this.addHistoryEntry('snapshot_restored', { id: snapshotId });
      return true;
    }
    return false;
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): ContextSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Clear all temporary context (files, agent tasks)
   */
  clearTemporary(): void {
    // Clear agent tasks and memories
    for (const agent of this.context.agents) {
      agent.currentTask = undefined;
    }

    // Clear file contents (keep paths)
    for (const file of this.context.files) {
      file.content = undefined;
    }

    this.addHistoryEntry('temporary_cleared');
  }

  /**
   * Compress history by keeping only key events
   */
  compressHistory(): void {
    const keyEvents = [
      'context_initialized',
      'agent_added',
      'agent_task_assigned',
      'snapshot_created',
    ];
    this.context.history = this.context.history.filter(
      (entry) => keyEvents.includes(entry.event) || entry.event.includes('failed')
    );

    this.addHistoryEntry('history_compressed', { remaining: this.context.history.length });
  }
}

export default ContextManager;
