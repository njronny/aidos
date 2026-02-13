"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsAPI = void 0;
class AgentsAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Get all agents with pagination and filtering
     */
    async list(params) {
        return this.client.request('GET', '/agents', undefined, params);
    }
    /**
     * Get a single agent by ID
     */
    async get(id) {
        return this.client.request('GET', `/agents/${id}`);
    }
    /**
     * Create a new agent
     */
    async create(data) {
        return this.client.request('POST', '/agents', data);
    }
    /**
     * Update an existing agent
     */
    async update(id, data) {
        return this.client.request('PUT', `/agents/${id}`, data);
    }
    /**
     * Delete an agent
     */
    async delete(id) {
        return this.client.request('DELETE', `/agents/${id}`);
    }
}
exports.AgentsAPI = AgentsAPI;
//# sourceMappingURL=agents.js.map