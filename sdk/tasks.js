"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksAPI = void 0;
class TasksAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Get all tasks with pagination and filtering
     */
    async list(params) {
        return this.client.request('GET', '/tasks', undefined, params);
    }
    /**
     * Get a single task by ID
     */
    async get(id) {
        return this.client.request('GET', `/tasks/${id}`);
    }
    /**
     * Create a new task
     */
    async create(data) {
        return this.client.request('POST', '/tasks', data);
    }
    /**
     * Update an existing task
     */
    async update(id, data) {
        return this.client.request('PUT', `/tasks/${id}`, data);
    }
    /**
     * Delete a task
     */
    async delete(id) {
        return this.client.request('DELETE', `/tasks/${id}`);
    }
}
exports.TasksAPI = TasksAPI;
//# sourceMappingURL=tasks.js.map