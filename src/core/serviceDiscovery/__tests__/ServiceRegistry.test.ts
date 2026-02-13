/**
 * ServiceRegistry 单元测试
 */

// Define mock Redis interface
interface MockRedisInterface {
  store: Map<string, any>;
  sets: Map<string, Set<string>>;
  hashStore: Map<string, Map<string, string>>;
  hset(key: string, data: Record<string, string>): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, ...members: string[]): Promise<number>;
  del(...keys: string[]): Promise<number>;
  set(key: string, value: string): Promise<string>;
  get(key: string): Promise<string | null>;
  expire(key: string, seconds: number): Promise<number>;
  pttl(key: string): Promise<number>;
  clear(): void;
}

// Mock Redis client for testing
const mockRedis: MockRedisInterface = {
  store: new Map(),
  sets: new Map(),
  hashStore: new Map(),

  async hset(key: string, data: Record<string, string>): Promise<number> {
    if (!this.hashStore.has(key)) {
      this.hashStore.set(key, new Map());
    }
    const hash = this.hashStore.get(key)!;
    let count = 0;
    for (const [field, value] of Object.entries(data)) {
      if (!hash.has(field)) {
        count++;
      }
      hash.set(field, value);
    }
    return count;
  },

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.hashStore.get(key);
    if (!hash) return {};
    return Object.fromEntries(hash);
  },

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    let count = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        count++;
      }
    }
    return count;
  },

  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  },

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    let count = 0;
    for (const member of members) {
      if (set.has(member)) {
        set.delete(member);
        count++;
      }
    }
    return count;
  },

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key) || this.hashStore.delete(key) || this.sets.delete(key)) {
        count++;
      }
    }
    return count;
  },

  async set(key: string, value: string): Promise<string> {
    this.store.set(key, value);
    return 'OK';
  },

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  },

  async expire(_key: string, _seconds: number): Promise<number> {
    return 1;
  },

  async pttl(_key: string): Promise<number> {
    return -1;
  },

  clear(): void {
    this.store.clear();
    this.sets.clear();
    this.hashStore.clear();
  }
};

import { ServiceRegistry, ServiceDiscovery, ServiceStatus } from '../ServiceRegistry';

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    mockRedis.clear();
  });

  describe('服务注册', () => {
    it('should register a service successfully', async () => {
      registry = new ServiceRegistry({
        redis: mockRedis as any,
        serviceName: 'test-service',
        version: '1.0.0',
        host: 'localhost',
        port: 3000,
        heartbeatIntervalMs: 5000,
        serviceTtlSeconds: 60,
      });

      const serviceId = await registry.register();

      expect(serviceId).toBeDefined();
      expect(registry.registered).toBe(true);
      expect(registry.getServiceId()).toBe(serviceId);
      expect(registry.getServiceName()).toBe('test-service');
    });

    it('should throw error when Redis is not provided', () => {
      expect(() => {
        new ServiceRegistry({
          redis: null as any,
          serviceName: 'test-service',
          host: 'localhost',
          port: 3000,
        });
      }).toThrow('Redis instance is required');
    });

    it('should throw error when service name is not provided', () => {
      expect(() => {
        new ServiceRegistry({
          redis: mockRedis as any,
          serviceName: '',
          host: 'localhost',
          port: 3000,
        });
      }).toThrow('Service name is required');
    });

    it('should throw error when host or port is missing', () => {
      expect(() => {
        new ServiceRegistry({
          redis: mockRedis as any,
          serviceName: 'test-service',
          host: 'localhost',
          port: 0,
        });
      }).toThrow('Host and port are required');
    });
  });

  describe('服务注销', () => {
    it('should deregister a service successfully', async () => {
      registry = new ServiceRegistry({
        redis: mockRedis as any,
        serviceName: 'test-service',
        host: 'localhost',
        port: 3000,
      });

      await registry.register();
      const deregistered = await registry.deregister();

      expect(deregistered).toBe(true);
      expect(registry.registered).toBe(false);
    });

    it('should return false when deregistering unregistered service', async () => {
      registry = new ServiceRegistry({
        redis: mockRedis as any,
        serviceName: 'test-service',
        host: 'localhost',
        port: 3000,
      });

      const deregistered = await registry.deregister();

      expect(deregistered).toBe(false);
    });
  });

  describe('心跳', () => {
    it('should send heartbeat successfully', async () => {
      registry = new ServiceRegistry({
        redis: mockRedis as any,
        serviceName: 'test-service',
        host: 'localhost',
        port: 3000,
      });

      await registry.register();
      const heartbeatResult = await registry.heartbeat();

      expect(heartbeatResult).toBe(true);
    });

    it('should fail heartbeat when not registered', async () => {
      registry = new ServiceRegistry({
        redis: mockRedis as any,
        serviceName: 'test-service',
        host: 'localhost',
        port: 3000,
      });

      const heartbeatResult = await registry.heartbeat();

      expect(heartbeatResult).toBe(false);
    });
  });
});

describe('ServiceDiscovery', () => {
  let discovery: ServiceDiscovery;

  beforeEach(() => {
    mockRedis.clear();
    discovery = new ServiceDiscovery(mockRedis as any, 5000);
  });

  describe('服务发现', () => {
    it('should discover registered services', async () => {
      // Register a service first
      const registry = new ServiceRegistry({
        redis: mockRedis as any,
        serviceName: 'discovery-test',
        host: 'localhost',
        port: 3000,
      });
      await registry.register();

      // Discover the service
      const services = await discovery.findServices('discovery-test');

      expect(services.length).toBeGreaterThanOrEqual(1);
      expect(services[0].name).toBe('discovery-test');
      expect(services[0].host).toBe('localhost');
      expect(services[0].port).toBe(3000);

      await registry.deregister();
    });

    it('should return empty array when no services found', async () => {
      const services = await discovery.findServices('nonexistent-service');

      expect(services).toEqual([]);
    });

    it('should find healthy services only', async () => {
      const registry = new ServiceRegistry({
        redis: mockRedis as any,
        serviceName: 'healthy-test',
        host: 'localhost',
        port: 3001,
      });
      await registry.register();

      const services = await discovery.findHealthyServices('healthy-test');

      expect(services.length).toBeGreaterThanOrEqual(1);
      expect(services[0].status).toBe(ServiceStatus.HEALTHY);

      await registry.deregister();
    });

    it('should get random healthy service', async () => {
      const registry = new ServiceRegistry({
        redis: mockRedis as any,
        serviceName: 'random-test',
        host: 'localhost',
        port: 3002,
      });
      await registry.register();

      const service = await discovery.getRandomService('random-test');

      expect(service).not.toBeNull();
      expect(service?.name).toBe('random-test');

      await registry.deregister();
    });

    it('should return null when no healthy services', async () => {
      const service = await discovery.getRandomService('nonexistent');

      expect(service).toBeNull();
    });
  });

  describe('缓存', () => {
    it('should cache service discovery results', async () => {
      const registry = new ServiceRegistry({
        redis: mockRedis as any,
        serviceName: 'cache-test',
        host: 'localhost',
        port: 3003,
      });
      await registry.register();

      // First call - should hit Redis
      const services1 = await discovery.findServices('cache-test', true);
      
      // Second call - should hit cache
      const services2 = await discovery.findServices('cache-test', true);

      expect(services1.length).toBe(services2.length);

      await registry.deregister();
    });

    it('should clear cache', async () => {
      const registry = new ServiceRegistry({
        redis: mockRedis as any,
        serviceName: 'clear-test',
        host: 'localhost',
        port: 3004,
      });
      await registry.register();

      await discovery.findServices('clear-test', true);
      discovery.clearCache();

      // Cache should be cleared - next call should hit Redis
      const services = await discovery.findServices('clear-test', true);
      expect(services.length).toBeGreaterThanOrEqual(1);

      await registry.deregister();
    });
  });
});
