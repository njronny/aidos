// Aidos SDK - Client Main Class
import { AidosClientConfig, AidosError, ApiResponse } from './types';

export class AidosClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: AidosClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private buildQueryString(params?: Record<string, any>): string {
    if (!params) return '';
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const qs = searchParams.toString();
    return qs ? `?${qs}` : '';
  }

  async request<T>(
    method: string,
    endpoint: string,
    body?: any,
    queryParams?: Record<string, any>
  ): Promise<T> {
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

      const data = await response.json() as ApiResponse;

      if (!response.ok || !data.success) {
        throw new AidosError(
          data.error || `HTTP ${response.status}`,
          response.status,
          data.code
        );
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof AidosError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new AidosError('Request timeout', 408, 'TIMEOUT');
        }
        throw new AidosError(error.message, undefined, 'NETWORK_ERROR');
      }
      
      throw new AidosError('Unknown error', undefined, 'UNKNOWN');
    }
  }

  // Helper methods
  getBaseUrl(): string {
    return this.baseUrl;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}
