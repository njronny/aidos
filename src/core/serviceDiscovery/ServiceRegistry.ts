import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service status enumeration
 */
export enum ServiceStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  STARTING = 'starting',
  STOPPING = 'stopping',
}

/**
 * Service metadata
 */
export interface ServiceMetadata {
  name: string;
  version: string;
  host: string;
  port: number;
  healthCheckUrl?: string;
  metadata?: Record<string, string>;
}

/**
 * Registered service information
 */
export interface ServiceInfo {
  id: string;
  name: string;
  version: string;
  host: string;
  port: number;
  healthCheckUrl?: string;
  metadata?: Record<string, string>;
  status: ServiceStatus;
  registeredAt: number;
  lastHeartbeat: number;
  metadataKey: string;
}

/**
 * Service registry configuration
 */
export interface ServiceRegistryOptions {
  /** Redis connection instance */
  redis: Redis;
  /** Service name */
  serviceName: string;
  /** Service version */
  version?: string;
  /** Service host */
  host: string;
  /** Service port */
  port: number;
  /** Health check URL */
  healthCheckUrl?: string;
  /** Additional metadata */
  metadata?: Record<string, string>;
  /** Heartbeat interval in milliseconds */
  heartbeatIntervalMs?: number;
  /** Health check interval in milliseconds */
  healthCheckIntervalMs?: number;
  /** Service TTL in seconds (auto-deregister if no heartbeat) */
  serviceTtlSeconds?: number;
}

/**
 * ServiceRegistry - Redis-based service registration and discovery
 * Provides service registration, discovery, and health monitoring
 */
export class ServiceRegistry {
  private redis: Redis;
  private serviceId: string;
  private serviceName: string;
  private version: string;
  private host: string;
  private port: number;
  private healthCheckUrl?: string;
  private metadata?: Record<string, string>;
  private heartbeatIntervalMs: number;
  private healthCheckIntervalMs: number;
  private serviceTtlSeconds: number;
  private heartbeatTimer?: NodeJS.Timeout;
  private isRegistered: boolean = false;
  private onHealthCheck?: () => Promise<boolean>;

  constructor(options: ServiceRegistryOptions) {
    if (!options.redis) {
      throw new Error('Redis instance is required');
    }
    if (!options.serviceName) {
      throw new Error('Service name is required');
    }
    if (!options.host || !options.port) {
      throw new Error('Host and port are required');
    }

    this.redis = options.redis;
    this.serviceName = options.serviceName;
    this.version = options.version ?? '1.0.0';
    this.host = options.host;
    this.port = options.port;
    this.healthCheckUrl = options.healthCheckUrl;
    this.metadata = options.metadata;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 5000; // 5 seconds
    this.healthCheckIntervalMs = options.healthCheckIntervalMs ?? 30000; // 30 seconds
    this.serviceTtlSeconds = options.serviceTtlSeconds ?? 60; // 60 seconds
    this.serviceId = uuidv4();
  }

  /**
   * Set custom health check callback
   */
  setHealthCheckCallback(callback: () => Promise<boolean>): void {
    this.onHealthCheck = callback;
  }

  /**
   * Register this service with the registry
   */
  async register(): Promise<string> {
    const serviceKey = this.getServiceKey(this.serviceId);
    const metadataKey = this.getMetadataKey(this.serviceId);

    const serviceData: Omit<ServiceInfo, 'metadataKey'> = {
      id: this.serviceId,
      name: this.serviceName,
      version: this.version,
      host: this.host,
      port: this.port,
      healthCheckUrl: this.healthCheckUrl,
      metadata: this.metadata,
      status: ServiceStatus.STARTING,
      registeredAt: Date.now(),
      lastHeartbeat: Date.now(),
    };

    // Store service data
    await this.redis.hset(serviceKey, {
      ...serviceData,
      status: ServiceStatus.HEALTHY, // Set to healthy after successful registration
    } as any);

    // Set TTL for auto-cleanup
    await this.redis.expire(serviceKey, this.serviceTtlSeconds * 2);

    // Store metadata separately
    if (this.metadata) {
      await this.redis.set(metadataKey, JSON.stringify(this.metadata));
      await this.redis.expire(metadataKey, this.serviceTtlSeconds * 2);
    }

    // Add to service set for discovery
    await this.redis.sadd(this.getServiceSetKey(), this.serviceId);

    // Store metadata key reference
    await this.redis.hset(`${serviceKey}:meta`, 'metadataKey', metadataKey);

    this.isRegistered = true;

    // Start heartbeat
    this.startHeartbeat();

    // Start health check
    if (this.healthCheckUrl || this.onHealthCheck) {
      this.startHealthCheck();
    }

    return this.serviceId;
  }

  /**
   * Deregister this service
   */
  async deregister(): Promise<boolean> {
    if (!this.isRegistered) {
      return false;
    }

    // Stop timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    const serviceKey = this.getServiceKey(this.serviceId);
    const metadataKey = this.getMetadataKey(this.serviceId);

    // Remove from service set
    await this.redis.srem(this.getServiceSetKey(), this.serviceId);

    // Delete service data
    await this.redis.del(serviceKey);

    // Delete metadata
    await this.redis.del(metadataKey);

    this.isRegistered = false;

    return true;
  }

  /**
   * Send heartbeat to maintain registration
   */
  async heartbeat(): Promise<boolean> {
    if (!this.isRegistered) {
      return false;
    }

    const serviceKey = this.getServiceKey(this.serviceId);

    // Update last heartbeat time
    await this.redis.hset(serviceKey, 'lastHeartbeat', Date.now().toString());

    // Refresh TTL
    await this.redis.expire(serviceKey, this.serviceTtlSeconds * 2);

    return true;
  }

  /**
   * Start automatic heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.heartbeat().catch((err) => {
        console.error('Heartbeat error:', err);
      });
    }, this.heartbeatIntervalMs);
  }

  /**
   * Start health check for other services
   */
  private startHealthCheck(): void {
    setInterval(() => {
      this.checkServicesHealth().catch((err) => {
        console.error('Health check error:', err);
      });
    }, this.healthCheckIntervalMs);
  }

  /**
   * Check health of all registered services
   */
  private async checkServicesHealth(): Promise<void> {
    const services = await this.discoverServices(this.serviceName);

    for (const service of services) {
      if (service.id === this.serviceId) continue;

      const isHealthy = await this.checkServiceHealth(service);
      const serviceKey = this.getServiceKey(service.id);

      if (!isHealthy) {
        await this.redis.hset(serviceKey, 'status', ServiceStatus.UNHEALTHY);
      } else {
        await this.redis.hset(serviceKey, 'status', ServiceStatus.HEALTHY);
      }
    }
  }

  /**
   * Check if a service is healthy
   */
  private async checkServiceHealth(service: ServiceInfo): Promise<boolean> {
    // Check if heartbeat is stale
    const staleThreshold = this.serviceTtlSeconds * 1000;
    if (Date.now() - service.lastHeartbeat > staleThreshold) {
      return false;
    }

    // If service has health check URL, make HTTP check (placeholder)
    if (service.healthCheckUrl) {
      // In production, implement actual HTTP health check
      // For now, just check heartbeat
    }

    return true;
  }

  /**
   * Discover all services by name
   */
  async discoverServices(serviceName: string): Promise<ServiceInfo[]> {
    const serviceSetKey = `services:${serviceName}`;
    const serviceIds = await this.redis.smembers(serviceSetKey);

    if (!serviceIds || serviceIds.length === 0) {
      return [];
    }

    const services: ServiceInfo[] = [];

    for (const serviceId of serviceIds) {
      const service = await this.getService(serviceId);
      if (service) {
        services.push(service);
      }
    }

    return services;
  }

  /**
   * Get service info by ID
   */
  async getService(serviceId: string): Promise<ServiceInfo | null> {
    const serviceKey = this.getServiceKey(serviceId);
    const data = await this.redis.hgetall(serviceKey);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    const metadataKey = data.metadataKey;
    let metadata: Record<string, string> | undefined;

    if (metadataKey) {
      const metadataStr = await this.redis.get(metadataKey);
      if (metadataStr) {
        try {
          metadata = JSON.parse(metadataStr);
        } catch {
          // Ignore parse errors
        }
      }
    }

    return {
      id: data.id,
      name: data.name,
      version: data.version,
      host: data.host,
      port: parseInt(data.port, 10),
      healthCheckUrl: data.healthCheckUrl,
      metadata,
      status: data.status as ServiceStatus,
      registeredAt: parseInt(data.registeredAt, 10),
      lastHeartbeat: parseInt(data.lastHeartbeat, 10),
      metadataKey,
    };
  }

  /**
   * Get the service ID
   */
  getServiceId(): string {
    return this.serviceId;
  }

  /**
   * Check if registered
   */
  get registered(): boolean {
    return this.isRegistered;
  }

  /**
   * Get service name
   */
  getServiceName(): string {
    return this.serviceName;
  }

  /**
   * Get Redis key for service
   */
  private getServiceKey(serviceId: string): string {
    return `service:${this.serviceName}:${serviceId}`;
  }

  /**
   * Get Redis key for metadata
   */
  private getMetadataKey(serviceId: string): string {
    return `service:${this.serviceName}:${serviceId}:meta`;
  }

  /**
   * Get Redis key for service set
   */
  private getServiceSetKey(): string {
    return `services:${this.serviceName}`;
  }
}

/**
 * ServiceDiscovery - Client-side service discovery
 */
export class ServiceDiscovery {
  private redis: Redis;
  private cache: Map<string, { services: ServiceInfo[]; timestamp: number }> = new Map();
  private cacheTtlMs: number;

  constructor(redis: Redis, cacheTtlMs: number = 5000) {
    this.redis = redis;
    this.cacheTtlMs = cacheTtlMs;
  }

  /**
   * Find services by name with caching
   */
  async findServices(serviceName: string, useCache: boolean = true): Promise<ServiceInfo[]> {
    const cacheKey = serviceName;

    // Check cache
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
        return cached.services;
      }
    }

    // Discover services
    const serviceSetKey = `services:${serviceName}`;
    const serviceIds = await this.redis.smembers(serviceSetKey);

    if (!serviceIds || serviceIds.length === 0) {
      return [];
    }

    const services: ServiceInfo[] = [];

    for (const serviceId of serviceIds) {
      const serviceKey = `service:${serviceName}:${serviceId}`;
      const data = await this.redis.hgetall(serviceKey);

      if (data && Object.keys(data).length > 0) {
        services.push({
          id: data.id,
          name: data.name,
          version: data.version,
          host: data.host,
          port: parseInt(data.port, 10),
          healthCheckUrl: data.healthCheckUrl,
          status: data.status as ServiceStatus,
          registeredAt: parseInt(data.registeredAt, 10),
          lastHeartbeat: parseInt(data.lastHeartbeat, 10),
          metadataKey: '',
        });
      }
    }

    // Update cache
    this.cache.set(cacheKey, {
      services,
      timestamp: Date.now(),
    });

    return services;
  }

  /**
   * Find healthy services only
   */
  async findHealthyServices(serviceName: string): Promise<ServiceInfo[]> {
    const services = await this.findServices(serviceName, false);
    return services.filter((s) => s.status === ServiceStatus.HEALTHY);
  }

  /**
   * Get a random healthy service instance
   */
  async getRandomService(serviceName: string): Promise<ServiceInfo | null> {
    const services = await this.findHealthyServices(serviceName);
    if (services.length === 0) {
      return null;
    }
    return services[Math.floor(Math.random() * services.length)];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export default ServiceRegistry;
