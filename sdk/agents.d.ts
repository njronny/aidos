import { AidosClient } from './AidosClient';
import { Agent, CreateAgentDto, UpdateAgentDto, QueryParams, PaginatedResponse, ApiResponse } from './types';
export declare class AgentsAPI {
    private client;
    constructor(client: AidosClient);
    /**
     * Get all agents with pagination and filtering
     */
    list(params?: QueryParams & {
        type?: string;
        status?: string;
    }): Promise<PaginatedResponse<Agent[]>>;
    /**
     * Get a single agent by ID
     */
    get(id: string): Promise<ApiResponse<Agent>>;
    /**
     * Create a new agent
     */
    create(data: CreateAgentDto): Promise<ApiResponse<Agent>>;
    /**
     * Update an existing agent
     */
    update(id: string, data: UpdateAgentDto): Promise<ApiResponse<Agent>>;
    /**
     * Delete an agent
     */
    delete(id: string): Promise<ApiResponse<void>>;
}
//# sourceMappingURL=agents.d.ts.map