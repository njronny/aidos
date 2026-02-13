"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsAPI = void 0;
class ProjectsAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Get all projects with pagination and filtering
     */
    async list(params) {
        return this.client.request('GET', '/projects', undefined, params);
    }
    /**
     * Get a single project by ID
     */
    async get(id) {
        return this.client.request('GET', `/projects/${id}`);
    }
    /**
     * Create a new project
     */
    async create(data) {
        return this.client.request('POST', '/projects', data);
    }
    /**
     * Update an existing project
     */
    async update(id, data) {
        return this.client.request('PUT', `/projects/${id}`, data);
    }
    /**
     * Delete a project
     */
    async delete(id) {
        return this.client.request('DELETE', `/projects/${id}`);
    }
}
exports.ProjectsAPI = ProjectsAPI;
//# sourceMappingURL=projects.js.map