/**
 * Redis连接池实现
 */
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  ConnectionPoolConfig,
  ConnectionState,
  ConnectionPoolStats,
  IConnectionPool,
} from './types';

/**
 * Redis连接池
 */
export class RedisConnectionPool implements IConnectionPool {
  private config: ConnectionPoolConfig;
  private pool: Redis[] = [];
  private availableConnections: Redis[] = [];
  private connectionStates: Map<string, ConnectionState> = new Map();
  private waitingQueue: Array<{
    resolve: (conn: Redis) => void;
    reject: (err: Error) => void;
    timestamp: number;
  }> = [];
  
  private stats = {
    totalRequests: 0,
    failedRequests: 0,
    waitTimes: [] as number[],
    maxWaitTime: 0,
  };

  constructor(config: ConnectionPoolConfig) {
    this.config = config;
  }

  /**
   * 初始化连接池
   */
  async initialize(): Promise<void> {
    const initPromises: Promise<Redis>[] = [];
    
    for (let i = 0; i < this.config.poolSize; i++) {
      initPromises.push(this.createConnection());
    }
    
    await Promise.all(initPromises);
    console.log(`[ConnectionPool] 初始化完成，创建了 ${this.pool.length} 个连接`);
  }

  /**
   * 创建新连接
   */
  private async createConnection(): Promise<Redis> {
    const connectionId = uuidv4();
    
    const redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      connectionName: this.config.redis.connectionName || `pool-${connectionId}`,
      connectTimeout: this.config.connectTimeout,
      maxRetriesPerRequest: this.config.retryAttempts,
      retryStrategy: (times) => {
        if (times > this.config.retryAttempts) {
          return null;
        }
        return Math.min(times * this.config.retryDelay, 2000);
      },
    });

    const state: ConnectionState = {
      id: connectionId,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      inUse: false,
      errorCount: 0,
    };

    redis.on('error', (err) => {
      state.errorCount++;
      console.error(`[ConnectionPool] 连接 ${connectionId} 错误:`, err.message);
    });

    redis.on('close', () => {
      this.removeConnection(redis);
    });

    this.pool.push(redis);
    this.connectionStates.set(connectionId, state);
    this.availableConnections.push(redis);

    return redis;
  }

  /**
   * 获取连接
   */
  async acquire(): Promise<Redis> {
    this.stats.totalRequests++;
    const startTime = Date.now();

    // 尝试从可用连接中获取
    const connection = this.availableConnections.pop();
    
    if (connection) {
      const state = this.getConnectionState(connection);
      if (state) {
        state.inUse = true;
        state.lastUsedAt = Date.now();
      }
      
      const waitTime = Date.now() - startTime;
      this.recordWaitTime(waitTime);
      
      return connection;
    }

    // 如果还有空闲槽位，创建新连接
    if (this.pool.length < this.config.poolSize) {
      const newConn = await this.createConnection();
      const state = this.getConnectionState(newConn);
      if (state) {
        state.inUse = true;
        state.lastUsedAt = Date.now();
      }
      
      const waitTime = Date.now() - startTime;
      this.recordWaitTime(waitTime);
      
      return newConn;
    }

    // 等待可用连接
    return new Promise<Redis>((resolve, reject) => {
      const waitStartTime = Date.now();
      
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.findIndex(
          (q) => q.resolve === resolve
        );
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
        }
        this.stats.failedRequests++;
        reject(new Error(`获取连接超时，等待时间: ${Date.now() - waitStartTime}ms`));
      }, this.config.maxWaitTime);

      this.waitingQueue.push({
        resolve: (conn) => {
          clearTimeout(timeout);
          const state = this.getConnectionState(conn);
          if (state) {
            state.inUse = true;
            state.lastUsedAt = Date.now();
          }
          const waitTime = Date.now() - startTime;
          this.recordWaitTime(waitTime);
          resolve(conn);
        },
        reject: (err) => {
          clearTimeout(timeout);
          this.stats.failedRequests++;
          reject(err);
        },
        timestamp: waitStartTime,
      });
    });
  }

  /**
   * 释放连接
   */
  release(connection: Redis): void {
    const state = this.getConnectionState(connection);
    
    if (!state) {
      console.warn('[ConnectionPool] 尝试释放未知连接');
      return;
    }

    state.inUse = false;
    state.lastUsedAt = Date.now();

    // 检查连接是否有效
    if (state.errorCount > 3) {
      this.removeConnection(connection);
      this.notifyNextWaiting();
      return;
    }

    // 检查连接是否空闲超时
    if (Date.now() - state.lastUsedAt > this.config.idleTimeout) {
      this.removeConnection(connection);
      this.notifyNextWaiting();
      return;
    }

    // 将连接加入可用队列
    this.availableConnections.push(connection);
    this.notifyNextWaiting();
  }

  /**
   * 通知等待队列中的下一个请求
   */
  private notifyNextWaiting(): void {
    if (this.waitingQueue.length === 0) {
      return;
    }

    const connection = this.availableConnections.pop();
    if (connection) {
      const waiting = this.waitingQueue.shift();
      if (waiting) {
        waiting.resolve(connection);
      }
    }
  }

  /**
   * 记录等待时间
   */
  private recordWaitTime(waitTime: number): void {
    this.stats.waitTimes.push(waitTime);
    if (waitTime > this.stats.maxWaitTime) {
      this.stats.maxWaitTime = waitTime;
    }
    
    // 保持最近1000条记录
    if (this.stats.waitTimes.length > 1000) {
      this.stats.waitTimes.shift();
    }
  }

  /**
   * 获取连接状态
   */
  private getConnectionState(connection: Redis): ConnectionState | undefined {
    for (const [id, state] of this.connectionStates) {
      // 通过比对connection找到对应的state
      const connIndex = this.pool.indexOf(connection);
      if (connIndex !== -1) {
        const connId = this.pool[connIndex]?.options?.connectionName;
        if (connId === state.id) {
          return state;
        }
      }
    }
    return undefined;
  }

  /**
   * 移除连接
   */
  private removeConnection(connection: Redis): void {
    const index = this.pool.indexOf(connection);
    if (index !== -1) {
      this.pool.splice(index, 1);
    }
    
    const availIndex = this.availableConnections.indexOf(connection);
    if (availIndex !== -1) {
      this.availableConnections.splice(availIndex, 1);
    }

    try {
      connection.disconnect();
    } catch (e) {
      // 忽略断开错误
    }
  }

  /**
   * 关闭连接池
   */
  async close(): Promise<void> {
    // 拒绝所有等待中的请求
    for (const waiting of this.waitingQueue) {
      waiting.reject(new Error('连接池已关闭'));
    }
    this.waitingQueue = [];

    // 关闭所有连接
    const closePromises = this.pool.map((conn) => {
      return new Promise<void>((resolve) => {
        conn.quit().then(() => resolve()).catch(() => resolve());
      });
    });

    await Promise.all(closePromises);
    this.pool = [];
    this.availableConnections = [];
    this.connectionStates.clear();
    
    console.log('[ConnectionPool] 连接池已关闭');
  }

  /**
   * 获取统计信息
   */
  getStats(): ConnectionPoolStats {
    const waitTimes = this.stats.waitTimes;
    const avgWaitTime = waitTimes.length > 0
      ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
      : 0;

    const activeConnections = this.pool.filter((conn) => {
      const state = this.getConnectionState(conn);
      return state?.inUse;
    }).length;

    return {
      totalConnections: this.pool.length,
      activeConnections,
      idleConnections: this.availableConnections.length,
      waitingRequests: this.waitingQueue.length,
      avgWaitTime,
      maxWaitTime: this.stats.maxWaitTime,
      totalRequests: this.stats.totalRequests,
      failedRequests: this.stats.failedRequests,
      hitRate: this.stats.totalRequests > 0
        ? (this.stats.totalRequests - this.stats.failedRequests) / this.stats.totalRequests
        : 1,
    };
  }
}
