// Aidos SDK - Requirements API
import { AidosClient } from './AidosClient';
import {
  Requirement,
  CreateRequirementDto,
  UpdateRequirementDto,
  QueryParams,
  PaginatedResponse,
  ApiResponse,
} from './types';

export class RequirementsAPI {
  constructor(private client: AidosClient) {}

  /**
   * Get all requirements with pagination and filtering
   */
  async list(params?: QueryParams & { projectId?: string }): Promise<PaginatedResponse<Requirement[]>> {
    return this.client.request<PaginatedResponse<Requirement[]>>('GET', '/requirements', undefined, params);
  }

  /**
   * Get a single requirement by ID
   */
  async get(id: string): Promise<ApiResponse<Requirement>> {
    return this.client.request<ApiResponse<Requirement>>('GET', `/requirements/${id}`);
  }

  /**
   * Create a new requirement
   * Note: Creating a requirement may automatically trigger a workflow
   */
  async create(data: CreateRequirementDto): Promise<ApiResponse<Requirement> & { workflow?: { id: string; taskCount: number; status: string } }> {
    return this.client.request<ApiResponse<Requirement> & { workflow?: { id: string; taskCount: number; status: string } }>('POST', '/requirements', data);
  }

  /**
   * Update an existing requirement
   */
  async update(id: string, data: UpdateRequirementDto): Promise<ApiResponse<Requirement>> {
    return this.client.request<ApiResponse<Requirement>>('PUT', `/requirements/${id}`, data);
  }

  /**
   * Delete a requirement
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return this.client.request<ApiResponse<void>>('DELETE', `/requirements/${id}`);
  }
}
