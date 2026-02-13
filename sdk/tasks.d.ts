import { AidosClient } from './AidosClient';
import { Task, CreateTaskDto, UpdateTaskDto, QueryParams, PaginatedResponse, ApiResponse } from './types';
export declare class TasksAPI {
    private client;
    constructor(client: AidosClient);
    /**
     * Get all tasks with pagination and filtering
     */
    list(params?: QueryParams & {
        requirementId?: string;
        agentId?: string;
    }): Promise<PaginatedResponse<Task[]>>;
    /**
     * Get a single task by ID
     */
    get(id: string): Promise<ApiResponse<Task>>;
    /**
     * Create a new task
     */
    create(data: CreateTaskDto): Promise<ApiResponse<Task>>;
    /**
     * Update an existing task
     */
    update(id: string, data: UpdateTaskDto): Promise<ApiResponse<Task>>;
    /**
     * Delete a task
     */
    delete(id: string): Promise<ApiResponse<void>>;
}
//# sourceMappingURL=tasks.d.ts.map