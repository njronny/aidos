/**
 * Database - Database Abstraction Layer
 * 
 * 支持 SQLite 和 PostgreSQL
 */

export type DatabaseType = 'sqlite' | 'postgresql';

export interface DatabaseConfig {
  type: DatabaseType;
  path?: string;           // For SQLite
  connectionString?: string; // For PostgreSQL
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  maxConnections?: number;
}

export interface QueryResult {
  lastInsertRowid?: number;
  rowsAffected: number;
}

export interface Transaction {
  execute(sql: string, params?: any[]): Promise<QueryResult>;
  select(sql: string, params?: any[]): Promise<any[]>;
}

export class Database {
  private config: DatabaseConfig;
  private connected = false;
  private db: any = null;

  constructor(config: DatabaseConfig) {
    if (!config.type) {
      throw new Error('Database type is required');
    }

    const supportedTypes: DatabaseType[] = ['sqlite', 'postgresql'];
    if (!supportedTypes.includes(config.type)) {
      throw new Error('Unsupported database type');
    }

    this.config = config;
  }

  /**
   * Get database type
   */
  getType(): DatabaseType {
    return this.config.type;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      if (this.config.type === 'sqlite') {
        await this.connectSQLite();
      } else if (this.config.type === 'postgresql') {
        await this.connectPostgreSQL();
      }
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  /**
   * Connect to SQLite
   */
  private async connectSQLite(): Promise<void> {
    // Use better-sqlite3 synchronously
    const Database = require('better-sqlite3');
    const path = this.config.path || ':memory:';
    this.db = new Database(path);
  }

  /**
   * Connect to PostgreSQL
   */
  private async connectPostgreSQL(): Promise<void> {
    // For now, use a simple mock for testing
    // In production, use pg pool
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: this.config.connectionString,
    });
    
    // Test connection
    const client = await pool.connect();
    client.release();
    
    this.db = pool;
  }

  /**
   * Execute SQL (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params: any[] = []): Promise<QueryResult> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      if (this.config.type === 'sqlite') {
        const stmt = this.db.prepare(sql);
        const result = stmt.run(...params);
        
        return {
          lastInsertRowid: result.lastInsertRowid,
          rowsAffected: result.changes,
        };
      } else {
        const result = await this.db.query(sql, params);
        return {
          rowsAffected: result.rowCount || 0,
        };
      }
    } catch (error) {
      throw new Error(`Query execution failed: ${error}`);
    }
  }

  /**
   * Select data (SELECT)
   */
  async select(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      if (this.config.type === 'sqlite') {
        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
      } else {
        const result = await this.db.query(sql, params);
        return result.rows || [];
      }
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }

  /**
   * Execute transaction
   */
  async transaction<T>(fn: (trx: Transaction) => Promise<T>): Promise<T> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    if (this.config.type === 'sqlite') {
      return this.transactionSQLite(fn);
    } else {
      return this.transactionPostgreSQL(fn);
    }
  }

  /**
   * SQLite transaction
   */
  private async transactionSQLite<T>(fn: (trx: Transaction) => Promise<T>): Promise<T> {
    const begin = this.db.prepare('BEGIN');
    const commit = this.db.prepare('COMMIT');
    const rollback = this.db.prepare('ROLLBACK');

    begin.run();

    try {
      const trx: Transaction = {
        execute: async (sql: string, params: any[] = []) => {
          const stmt = this.db.prepare(sql);
          const result = stmt.run(...params);
          return {
            lastInsertRowid: result.lastInsertRowid,
            rowsAffected: result.changes,
          };
        },
        select: async (sql: string, params: any[] = []) => {
          const stmt = this.db.prepare(sql);
          return stmt.all(...params);
        },
      };

      const result = await fn(trx);
      commit.run();
      return result;
    } catch (error) {
      rollback.run();
      throw error;
    }
  }

  /**
   * PostgreSQL transaction
   */
  private async transactionPostgreSQL<T>(fn: (trx: Transaction) => Promise<T>): Promise<T> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const trx: Transaction = {
        execute: async (sql: string, params: any[] = []) => {
          const result = await client.query(sql, params);
          return {
            rowsAffected: result.rowCount || 0,
          };
        },
        select: async (sql: string, params: any[] = []) => {
          const result = await client.query(sql, params);
          return result.rows || [];
        },
      };

      const result = await fn(trx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      if (this.config.type === 'sqlite') {
        this.db.close();
      } else {
        await this.db.end();
      }
    } finally {
      this.connected = false;
      this.db = null;
    }
  }
}

export default Database;
