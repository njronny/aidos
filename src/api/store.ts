// In-memory data store for API
import { v4 as uuidv4 } from 'uuid';
import { Project, Requirement, Task, Agent } from './types';

class DataStore {
  private projects: Map<string, Project> = new Map();
  private requirements: Map<string, Requirement> = new Map();
  private tasks: Map<string, Task> = new Map();
  private agents: Map<string, Agent> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed sample data
    const projectId = uuidv4();
    this.projects.set(projectId, {
      id: projectId,
      name: '示例项目',
      description: 'AI开发系统演示项目',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const reqId = uuidv4();
    this.requirements.set(reqId, {
      id: reqId,
      projectId,
      title: '用户登录功能',
      description: '实现基于JWT的用户认证系统',
      priority: 'high',
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const taskId = uuidv4();
    this.tasks.set(taskId, {
      id: taskId,
      requirementId: reqId,
      title: '实现登录API',
      description: '创建登录和注册接口',
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const agentId = uuidv4();
    this.agents.set(agentId, {
      id: agentId,
      name: '开发代理',
      type: 'developer',
      status: 'idle',
      capabilities: ['code_generation', 'code_review'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Projects
  getAllProjects() {
    return Array.from(this.projects.values());
  }

  getProjectById(id: string) {
    return this.projects.get(id) || null;
  }

  createProject(data: { name: string; description?: string }) {
    const project: Project = {
      id: uuidv4(),
      name: data.name,
      description: data.description,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(project.id, project);
    return project;
  }

  updateProject(id: string, data: Partial<Project>) {
    const project = this.projects.get(id);
    if (!project) return null;
    const updated = { ...project, ...data, updatedAt: new Date().toISOString() };
    this.projects.set(id, updated);
    return updated;
  }

  deleteProject(id: string) {
    return this.projects.delete(id);
  }

  // Requirements
  getAllRequirements(filters?: { projectId?: string }) {
    let reqs = Array.from(this.requirements.values());
    if (filters?.projectId) {
      reqs = reqs.filter(r => r.projectId === filters.projectId);
    }
    return reqs;
  }

  getRequirementById(id: string) {
    return this.requirements.get(id) || null;
  }

  createRequirement(data: { projectId: string; title: string; description?: string; priority?: string }) {
    const requirement: Requirement = {
      id: uuidv4(),
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      priority: (data.priority as any) || 'medium',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.requirements.set(requirement.id, requirement);
    return requirement;
  }

  updateRequirement(id: string, data: Partial<Requirement>) {
    const req = this.requirements.get(id);
    if (!req) return null;
    const updated = { ...req, ...data, updatedAt: new Date().toISOString() };
    this.requirements.set(id, updated);
    return updated;
  }

  deleteRequirement(id: string) {
    return this.requirements.delete(id);
  }

  // Tasks
  getAllTasks(filters?: { requirementId?: string; agentId?: string }) {
    let taskList = Array.from(this.tasks.values());
    if (filters?.requirementId) {
      taskList = taskList.filter(t => t.requirementId === filters.requirementId);
    }
    if (filters?.agentId) {
      taskList = taskList.filter(t => t.agentId === filters.agentId);
    }
    return taskList;
  }

  getTaskById(id: string) {
    return this.tasks.get(id) || null;
  }

  createTask(data: { requirementId: string; title: string; description?: string; agentId?: string }) {
    const task: Task = {
      id: uuidv4(),
      requirementId: data.requirementId,
      title: data.title,
      description: data.description,
      agentId: data.agentId,
      status: data.agentId ? 'assigned' : 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  updateTask(id: string, data: Partial<Task>) {
    const task = this.tasks.get(id);
    if (!task) return null;
    const updated = { ...task, ...data, updatedAt: new Date().toISOString() };
    this.tasks.set(id, updated);
    return updated;
  }

  deleteTask(id: string) {
    return this.tasks.delete(id);
  }

  // Agents
  getAllAgents(filters?: { type?: string; status?: string }) {
    let agentList = Array.from(this.agents.values());
    if (filters?.type) {
      agentList = agentList.filter(a => a.type === filters.type);
    }
    if (filters?.status) {
      agentList = agentList.filter(a => a.status === filters.status);
    }
    return agentList;
  }

  getAgentById(id: string) {
    return this.agents.get(id) || null;
  }

  createAgent(data: { name: string; type: string; capabilities?: string[] }) {
    const agent: Agent = {
      id: uuidv4(),
      name: data.name,
      type: data.type as any,
      status: 'idle',
      capabilities: data.capabilities,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.agents.set(agent.id, agent);
    return agent;
  }

  updateAgent(id: string, data: Partial<Agent>) {
    const agent = this.agents.get(id);
    if (!agent) return null;
    const updated = { ...agent, ...data, updatedAt: new Date().toISOString() };
    this.agents.set(id, updated);
    return updated;
  }

  deleteAgent(id: string) {
    return this.agents.delete(id);
  }
}

export const dataStore = new DataStore();
