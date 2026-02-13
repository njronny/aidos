// Aidos SDK - Agents API
import { AidosClient } from './AidosClient';
import {
  Agent,
  CreateAgentDto,
  UpdateAgentDto,
  QueryParams,
  PaginatedResponse,
  ApiResponse,
} from './types';

export class AgentsAPI {
  constructor(private client: AidosClient) {}

  /**
   * Get all agents with pagination and filtering
   */
  async list(params?: QueryParams & { type?: string; status?: string }): Promise<PaginatedResponse<Agent[]>> {
    return this.client.request<PaginatedResponse<Agent[]>>('GET', '/agents', undefined, params);
  }

  /**
   * Get a single agent by ID
   */
  async get(id: string): Promise<ApiResponse<Agent>> {
    return this.client.request<ApiResponse<Agent>>('GET', `/agents/${id}`);
  }

  /**
   * Create a new agent
   */
  async create(data: CreateAgentDto): Promise<ApiResponse<Agent>> {
    return this.client.request<ApiResponse<Agent>>('POST', '/agents', data);
  }

  /**
   * Update an existing agent
   */
  async update(id: string, data: UpdateAgentDto): Promise<ApiResponse<Agent>> {
    return this.client.request<ApiResponse<Agent>>('PUT', `/agents/${id}`, data);
  }

  /**
   * Delete an agent
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return this.client.request<ApiResponse<void>>('DELETE', `/agents/${id}`);
  }
}
