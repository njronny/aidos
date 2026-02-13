// Data store with SQLite persistence
import { ProjectRepository } from '../infrastructure/database/repositories/project.repository';
import { RequirementRepository } from '../infrastructure/database/repositories/requirement.repository';
import { TaskRepository } from '../infrastructure/database/repositories/task.repository';
import { AgentRepository } from '../infrastructure/database/repositories/agent.repository';
import { Project, Requirement, Task, Agent, CreateProjectDto, UpdateProjectDto, CreateRequirementDto, UpdateRequirementDto, CreateTaskDto, UpdateTaskDto, CreateAgentDto, UpdateAgentDto } from './types';

// Repositories
const projectRepo = new ProjectRepository();
const requirementRepo = new RequirementRepository();
const taskRepo = new TaskRepository();
const agentRepo = new AgentRepository();

/**
 * 将数据库实体转换为 API 类型
 */
function toApiProject(p: any): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    createdAt: p.createdAt ? p.createdAt ? new Date(Number(p.createdAt) || Date.now()).toISOString() : new Date().toISOString() : new Date().toISOString(),
    updatedAt: p.updatedAt ? p.updatedAt ? new Date(Number(p.updatedAt) || Date.now()).toISOString() : new Date().toISOString() : new Date().toISOString(),
  };
}

function toApiRequirement(r: any): Requirement {
  return {
    id: r.id,
    projectId: r.projectId,
    title: r.title,
    description: r.content,
    priority: r.priority,
    status: r.status === 'analyzing' ? 'in_progress' : r.status === 'analyzed' ? 'completed' : r.status === 'rejected' ? 'rejected' : 'pending',
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function toDbRequirement(input: CreateRequirementDto): any {
  return {
    projectId: input.projectId,
    title: input.title,
    content: input.description || '',
    priority: input.priority || 'medium',
    status: 'pending',
  };
}

function toApiTask(t: any): Task {
  return {
    id: t.id,
    requirementId: t.requirementId || '',
    agentId: t.assignee,
    title: t.title,
    description: t.description,
    status: t.status === 'running' ? 'in_progress' : t.status === 'assigned' ? 'assigned' : t.status,
    result: t.result ? JSON.stringify(t.result) : undefined,
    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function toDbTask(input: CreateTaskDto): any {
  return {
    projectId: '', // 需要从 requirement 获取
    requirementId: input.requirementId,
    title: input.title,
    description: input.description,
    status: input.agentId ? 'pending' : 'pending',
    assignee: input.agentId,
    priority: 0,
  };
}

function toApiAgent(a: any): Agent {
  return {
    id: a.id,
    name: a.name,
    type: a.role === 'Dev' ? 'developer' : a.role === 'PM' ? 'planner' : a.role === 'QA' ? 'tester' : 'reviewer',
    status: a.status,
    capabilities: a.capabilities,
    currentTaskId: a.currentTaskId,
    createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: a.updatedAt ? new Date(a.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function toDbAgent(input: CreateAgentDto): any {
  return {
    name: input.name,
    role: input.type === 'developer' ? 'Dev' : input.type === 'planner' ? 'PM' : input.type === 'tester' ? 'QA' : 'Dev',
    status: 'idle',
    capabilities: input.capabilities || [],
  };
}

class DataStore {
  // Projects
  async getAllProjects() {
    const projects = await projectRepo.findAll();
    return projects.map(toApiProject);
  }

  async getProjectById(id: string) {
    const project = await projectRepo.findById(id);
    return project ? toApiProject(project) : null;
  }

  async createProject(data: CreateProjectDto) {
    const project = await projectRepo.create({
      name: data.name,
      description: data.description,
      status: 'active',
    });
    return toApiProject(project);
  }

  async updateProject(id: string, data: UpdateProjectDto) {
    const project = await projectRepo.update(id, {
      name: data.name,
      description: data.description,
      status: data.status,
    });
    return project ? toApiProject(project) : null;
  }

  async deleteProject(id: string) {
    return await projectRepo.delete(id);
  }

  // Requirements
  async getAllRequirements(filters?: { projectId?: string }) {
    let requirements;
    if (filters?.projectId) {
      requirements = await requirementRepo.findByProjectId(filters.projectId);
    } else {
      requirements = await requirementRepo.findAll();
    }
    return requirements.map(toApiRequirement);
  }

  async getRequirementById(id: string) {
    const requirement = await requirementRepo.findById(id);
    return requirement ? toApiRequirement(requirement) : null;
  }

  async createRequirement(data: CreateRequirementDto) {
    const requirement = await requirementRepo.create(toDbRequirement(data));
    return toApiRequirement(requirement);
  }

  async updateRequirement(id: string, data: UpdateRequirementDto) {
    const requirement = await requirementRepo.update(id, {
      title: data.title,
      content: data.description,
      status: data.status === 'in_progress' ? 'analyzing' : data.status === 'completed' ? 'analyzed' : data.status === 'rejected' ? 'rejected' : 'pending',
      priority: data.priority,
    });
    return requirement ? toApiRequirement(requirement) : null;
  }

  async deleteRequirement(id: string) {
    return await requirementRepo.delete(id);
  }

  // Tasks
  async getAllTasks(filters?: { requirementId?: string; agentId?: string }) {
    let tasks;
    if (filters?.requirementId) {
      tasks = await taskRepo.findByRequirementId(filters.requirementId);
    } else if (filters?.agentId) {
      tasks = await taskRepo.findByAssignee(filters.agentId);
    } else {
      tasks = await taskRepo.findAll();
    }
    return tasks.map(toApiTask);
  }

  async getTaskById(id: string) {
    const task = await taskRepo.findById(id);
    return task ? toApiTask(task) : null;
  }

  async createTask(data: CreateTaskDto) {
    // 获取 requirement 来获取 projectId
    const requirement = await requirementRepo.findById(data.requirementId);
    const task = await taskRepo.create({
      projectId: requirement?.projectId || '',
      requirementId: data.requirementId,
      title: data.title,
      description: data.description,
      status: 'pending',
      assignee: data.agentId,
      priority: 0,
    });
    return toApiTask(task);
  }

  async updateTask(id: string, data: UpdateTaskDto) {
    const statusMap: Record<string, any> = {
      'pending': 'pending',
      'assigned': 'pending',
      'in_progress': 'running',
      'completed': 'completed',
      'failed': 'failed',
    };
    const task = await taskRepo.update(id, {
      title: data.title,
      description: data.description,
      status: data.status ? statusMap[data.status] : undefined,
      assignee: data.agentId,
    });
    return task ? toApiTask(task) : null;
  }

  async deleteTask(id: string) {
    return await taskRepo.delete(id);
  }

  // Agents
  async getAllAgents(filters?: { type?: string; status?: string }) {
    let agents;
    if (filters?.status) {
      agents = await agentRepo.findByStatus(filters.status as any);
    } else if (filters?.type) {
      const roleMap: Record<string, any> = {
        'planner': 'PM',
        'developer': 'Dev',
        'tester': 'QA',
        'reviewer': 'Dev',
      };
      agents = await agentRepo.findByRole(roleMap[filters.type] as any);
    } else {
      agents = await agentRepo.findAll();
    }
    return agents.map(toApiAgent);
  }

  async getAgentById(id: string) {
    const agent = await agentRepo.findById(id);
    return agent ? toApiAgent(agent) : null;
  }

  async createAgent(data: CreateAgentDto) {
    const agent = await agentRepo.create(toDbAgent(data));
    return toApiAgent(agent);
  }

  async updateAgent(id: string, data: UpdateAgentDto) {
    const roleMap: Record<string, any> = {
      'planner': 'PM',
      'developer': 'Dev',
      'tester': 'QA',
      'reviewer': 'Dev',
    };
    const agent = await agentRepo.update(id, {
      name: data.name,
      role: data.type ? roleMap[data.type] as any : undefined,
      status: data.status,
      capabilities: data.capabilities,
      currentTaskId: data.currentTaskId,
    });
    return agent ? toApiAgent(agent) : null;
  }

  async deleteAgent(id: string) {
    return await agentRepo.delete(id);
  }
}

export const dataStore = new DataStore();
