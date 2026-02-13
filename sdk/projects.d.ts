import { AidosClient } from './AidosClient';
import { Project, CreateProjectDto, UpdateProjectDto, QueryParams, PaginatedResponse, ApiResponse } from './types';
export declare class ProjectsAPI {
    private client;
    constructor(client: AidosClient);
    /**
     * Get all projects with pagination and filtering
     */
    list(params?: QueryParams): Promise<PaginatedResponse<Project[]>>;
    /**
     * Get a single project by ID
     */
    get(id: string): Promise<ApiResponse<Project>>;
    /**
     * Create a new project
     */
    create(data: CreateProjectDto): Promise<ApiResponse<Project>>;
    /**
     * Update an existing project
     */
    update(id: string, data: UpdateProjectDto): Promise<ApiResponse<Project>>;
    /**
     * Delete a project
     */
    delete(id: string): Promise<ApiResponse<void>>;
}
//# sourceMappingURL=projects.d.ts.map