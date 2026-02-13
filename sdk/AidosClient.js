"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AidosClient = void 0;
// Aidos SDK - Client Main Class
const types_1 = require("./types");
class AidosClient {
    baseUrl;
    apiKey;
    timeout;
    constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.apiKey = config.apiKey;
        this.timeout = config.timeout || 30000;
    }
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        return headers;
    }
    buildQueryString(params) {
        if (!params)
            return '';
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        }
        const qs = searchParams.toString();
        return qs ? `?${qs}` : '';
    }
    async request(method, endpoint, body, queryParams) {
        const url = `${this.baseUrl}${endpoint}${this.buildQueryString(queryParams)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(url, {
                method,
                headers: this.getHeaders(),
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new types_1.AidosError(data.error || `HTTP ${response.status}`, response.status, data.code);
            }
            return data;
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof types_1.AidosError) {
                throw error;
            }
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new types_1.AidosError('Request timeout', 408, 'TIMEOUT');
                }
                throw new types_1.AidosError(error.message, undefined, 'NETWORK_ERROR');
            }
            throw new types_1.AidosError('Unknown error', undefined, 'UNKNOWN');
        }
    }
    // Helper methods
    getBaseUrl() {
        return this.baseUrl;
    }
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }
    setTimeout(timeout) {
        this.timeout = timeout;
    }
}
exports.AidosClient = AidosClient;
//# sourceMappingURL=AidosClient.js.map