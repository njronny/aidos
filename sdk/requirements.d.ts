import { AidosClient } from './AidosClient';
import { Requirement, CreateRequirementDto, UpdateRequirementDto, QueryParams, PaginatedResponse, ApiResponse } from './types';
export declare class RequirementsAPI {
    private client;
    constructor(client: AidosClient);
    /**
     * Get all requirements with pagination and filtering
     */
    list(params?: QueryParams & {
        projectId?: string;
    }): Promise<PaginatedResponse<Requirement[]>>;
    /**
     * Get a single requirement by ID
     */
    get(id: string): Promise<ApiResponse<Requirement>>;
    /**
     * Create a new requirement
     * Note: Creating a requirement may automatically trigger a workflow
     */
    create(data: CreateRequirementDto): Promise<ApiResponse<Requirement> & {
        workflow?: {
            id: string;
            taskCount: number;
            status: string;
        };
    }>;
    /**
     * Update an existing requirement
     */
    update(id: string, data: UpdateRequirementDto): Promise<ApiResponse<Requirement>>;
    /**
     * Delete a requirement
     */
    delete(id: string): Promise<ApiResponse<void>>;
}
//# sourceMappingURL=requirements.d.ts.map