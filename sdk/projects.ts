// Aidos SDK - Projects API
import { AidosClient } from './AidosClient';
import {
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  QueryParams,
  PaginatedResponse,
  ApiResponse,
} from './types';

export class ProjectsAPI {
  constructor(private client: AidosClient) {}

  /**
   * Get all projects with pagination and filtering
   */
  async list(params?: QueryParams): Promise<PaginatedResponse<Project[]>> {
    return this.client.request<PaginatedResponse<Project[]>>('GET', '/projects', undefined, params);
  }

  /**
   * Get a single project by ID
   */
  async get(id: string): Promise<ApiResponse<Project>> {
    return this.client.request<ApiResponse<Project>>('GET', `/projects/${id}`);
  }

  /**
   * Create a new project
   */
  async create(data: CreateProjectDto): Promise<ApiResponse<Project>> {
    return this.client.request<ApiResponse<Project>>('POST', '/projects', data);
  }

  /**
   * Update an existing project
   */
  async update(id: string, data: UpdateProjectDto): Promise<ApiResponse<Project>> {
    return this.client.request<ApiResponse<Project>>('PUT', `/projects/${id}`, data);
  }

  /**
   * Delete a project
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return this.client.request<ApiResponse<void>>('DELETE', `/projects/${id}`);
  }
}
