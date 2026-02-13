"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementsAPI = void 0;
class RequirementsAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Get all requirements with pagination and filtering
     */
    async list(params) {
        return this.client.request('GET', '/requirements', undefined, params);
    }
    /**
     * Get a single requirement by ID
     */
    async get(id) {
        return this.client.request('GET', `/requirements/${id}`);
    }
    /**
     * Create a new requirement
     * Note: Creating a requirement may automatically trigger a workflow
     */
    async create(data) {
        return this.client.request('POST', '/requirements', data);
    }
    /**
     * Update an existing requirement
     */
    async update(id, data) {
        return this.client.request('PUT', `/requirements/${id}`, data);
    }
    /**
     * Delete a requirement
     */
    async delete(id) {
        return this.client.request('DELETE', `/requirements/${id}`);
    }
}
exports.RequirementsAPI = RequirementsAPI;
//# sourceMappingURL=requirements.js.map