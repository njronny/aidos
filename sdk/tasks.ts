// Aidos SDK - Tasks API
import { AidosClient } from './AidosClient';
import {
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  QueryParams,
  PaginatedResponse,
  ApiResponse,
} from './types';

export class TasksAPI {
  constructor(private client: AidosClient) {}

  /**
   * Get all tasks with pagination and filtering
   */
  async list(params?: QueryParams & { requirementId?: string; agentId?: string }): Promise<PaginatedResponse<Task[]>> {
    return this.client.request<PaginatedResponse<Task[]>>('GET', '/tasks', undefined, params);
  }

  /**
   * Get a single task by ID
   */
  async get(id: string): Promise<ApiResponse<Task>> {
    return this.client.request<ApiResponse<Task>>('GET', `/tasks/${id}`);
  }

  /**
   * Create a new task
   */
  async create(data: CreateTaskDto): Promise<ApiResponse<Task>> {
    return this.client.request<ApiResponse<Task>>('POST', '/tasks', data);
  }

  /**
   * Update an existing task
   */
  async update(id: string, data: UpdateTaskDto): Promise<ApiResponse<Task>> {
    return this.client.request<ApiResponse<Task>>('PUT', `/tasks/${id}`, data);
  }

  /**
   * Delete a task
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return this.client.request<ApiResponse<void>>('DELETE', `/tasks/${id}`);
  }
}
