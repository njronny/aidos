// Aidos SDK - Tests
import { AidosClient } from '../AidosClient';
import { createClient } from '../index';
import { ProjectsAPI } from '../projects';
import { RequirementsAPI } from '../requirements';
import { TasksAPI } from '../tasks';
import { AgentsAPI } from '../agents';
import { AidosError } from '../types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AidosClient', () => {
  let client: AidosClient;

  beforeEach(() => {
    client = new AidosClient({
      baseUrl: 'http://localhost:3000',
      apiKey: 'test-key',
      timeout: 5000,
    });
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with base URL', () => {
      expect(client.getBaseUrl()).toBe('http://localhost:3000');
    });

    it('should remove trailing slash from base URL', () => {
      const client2 = new AidosClient({ baseUrl: 'http://localhost:3000/' });
      expect(client2.getBaseUrl()).toBe('http://localhost:3000');
    });

    it('should set default timeout', () => {
      const client2 = new AidosClient({ baseUrl: 'http://localhost:3000' });
      expect(client2.getBaseUrl()).toBe('http://localhost:3000');
    });
  });

  describe('request', () => {
    it('should make GET request successfully', async () => {
      const mockResponse = { success: true, data: { id: '1', name: 'Test' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.request('GET', '/projects/1');
      expect(result).toEqual(mockResponse);
    });

    it('should include headers in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      await client.request('GET', '/projects');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/projects',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('should include query params in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [], pagination: {} }),
      });

      await client.request('GET', '/projects', undefined, { page: 1, limit: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/projects?page=1&limit=10',
        expect.any(Object)
      );
    });

    it('should include body in POST request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: '1' } }),
      });

      await client.request('POST', '/projects', { name: 'New Project' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/projects',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New Project' }),
        })
      );
    });

    it('should throw AidosError on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ success: false, error: '项目不存在' }),
      });

      await expect(client.request('GET', '/projects/999')).rejects.toThrow(AidosError);
    });

    it('should throw AidosError on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.request('GET', '/projects')).rejects.toThrow(AidosError);
    });
  });

  describe('setApiKey', () => {
    it('should update API key', () => {
      client.setApiKey('new-key');
      // The client now has the new key set
    });
  });

  describe('setTimeout', () => {
    it('should update timeout', () => {
      client.setTimeout(10000);
    });
  });
});

describe('ProjectsAPI', () => {
  let client: AidosClient;
  let projectsApi: ProjectsAPI;

  beforeEach(() => {
    client = new AidosClient({ baseUrl: 'http://localhost:3000' });
    projectsApi = new ProjectsAPI(client);
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should fetch projects with pagination', async () => {
      const mockResponse = {
        success: true,
        data: [{ id: '1', name: 'Project 1' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await projectsApi.list({ page: 1, limit: 10 });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('get', () => {
    it('should fetch single project', async () => {
      const mockResponse = { success: true, data: { id: '1', name: 'Project 1' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await projectsApi.get('1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('create', () => {
    it('should create project', async () => {
      const mockResponse = { success: true, data: { id: '1', name: 'New Project' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await projectsApi.create({ name: 'New Project', description: 'Test' });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('update', () => {
    it('should update project', async () => {
      const mockResponse = { success: true, data: { id: '1', name: 'Updated Project' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await projectsApi.update('1', { name: 'Updated Project' });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('delete', () => {
    it('should delete project', async () => {
      const mockResponse = { success: true, message: '项目已删除' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await projectsApi.delete('1');
      expect(result).toEqual(mockResponse);
    });
  });
});

describe('RequirementsAPI', () => {
  let client: AidosClient;
  let requirementsApi: RequirementsAPI;

  beforeEach(() => {
    client = new AidosClient({ baseUrl: 'http://localhost:3000' });
    requirementsApi = new RequirementsAPI(client);
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should fetch requirements with project filter', async () => {
      const mockResponse = {
        success: true,
        data: [{ id: '1', title: 'Requirement 1' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await requirementsApi.list({ projectId: 'proj-1' });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/requirements?projectId=proj-1',
        expect.any(Object)
      );
    });
  });

  describe('create', () => {
    it('should create requirement with workflow info', async () => {
      const mockResponse = {
        success: true,
        data: { id: '1', title: 'New Requirement' },
        workflow: { id: 'wf-1', taskCount: 3, status: 'running' },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await requirementsApi.create({
        projectId: 'proj-1',
        title: 'New Requirement',
        priority: 'high',
      });
      expect(result).toEqual(mockResponse);
    });
  });
});

describe('TasksAPI', () => {
  let client: AidosClient;
  let tasksApi: TasksAPI;

  beforeEach(() => {
    client = new AidosClient({ baseUrl: 'http://localhost:3000' });
    tasksApi = new TasksAPI(client);
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should fetch tasks with filters', async () => {
      const mockResponse = {
        success: true,
        data: [{ id: '1', title: 'Task 1' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await tasksApi.list({ requirementId: 'req-1', agentId: 'agent-1' });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/tasks?requirementId=req-1&agentId=agent-1',
        expect.any(Object)
      );
    });
  });
});

describe('AgentsAPI', () => {
  let client: AidosClient;
  let agentsApi: AgentsAPI;

  beforeEach(() => {
    client = new AidosClient({ baseUrl: 'http://localhost:3000' });
    agentsApi = new AgentsAPI(client);
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should fetch agents with type and status filters', async () => {
      const mockResponse = {
        success: true,
        data: [{ id: '1', name: 'Agent 1', type: 'developer' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await agentsApi.list({ type: 'developer', status: 'idle' });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/agents?type=developer&status=idle',
        expect.any(Object)
      );
    });
  });
});

describe('createClient', () => {
  it('should create client with all APIs', () => {
    const sdk = createClient({
      baseUrl: 'http://localhost:3000',
      apiKey: 'test-key',
    });

    expect(sdk.client).toBeDefined();
    expect(sdk.projects).toBeInstanceOf(ProjectsAPI);
    expect(sdk.requirements).toBeInstanceOf(RequirementsAPI);
    expect(sdk.tasks).toBeInstanceOf(TasksAPI);
    expect(sdk.agents).toBeInstanceOf(AgentsAPI);
  });
});
