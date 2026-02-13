import { AidosClientConfig } from './types';
export declare class AidosClient {
    private baseUrl;
    private apiKey?;
    private timeout;
    constructor(config: AidosClientConfig);
    private getHeaders;
    private buildQueryString;
    request<T>(method: string, endpoint: string, body?: any, queryParams?: Record<string, any>): Promise<T>;
    getBaseUrl(): string;
    setApiKey(apiKey: string): void;
    setTimeout(timeout: number): void;
}
//# sourceMappingURL=AidosClient.d.ts.map