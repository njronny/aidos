/**
 * Database Tests - TDD
 * 
 * 测试数据库持久化能力
 */

import { Database, DatabaseConfig } from '../Database';

describe('Database', () => {
  let db: Database;

  describe('constructor', () => {
    it('should create database with config', () => {
      const config: DatabaseConfig = {
        type: 'sqlite',
        path: ':memory:',
      };
      
      db = new Database(config);
      expect(db).toBeDefined();
    });

    it('should throw for unknown database type', () => {
      expect(() => {
        new Database({ type: 'unknown' as any });
      }).toThrow('Unsupported database type');
    });

    it('should support sqlite', () => {
      const config: DatabaseConfig = {
        type: 'sqlite',
        path: ':memory:',
      };
      
      const db = new Database(config);
      expect(db.getType()).toBe('sqlite');
    });

    it('should support postgresql', () => {
      const config: DatabaseConfig = {
        type: 'postgresql',
        connectionString: 'postgresql://localhost/test',
      };
      
      const db = new Database(config);
      expect(db.getType()).toBe('postgresql');
    });
  });

  describe('connect', () => {
    it('should connect to in-memory database', async () => {
      const config: DatabaseConfig = {
        type: 'sqlite',
        path: ':memory:',
      };
      
      db = new Database(config);
      await db.connect();
      
      expect(db.isConnected()).toBe(true);
    });

    it('should handle connection errors', async () => {
      const config: DatabaseConfig = {
        type: 'postgresql',
        connectionString: 'postgresql://invalid:invalid@localhost:99999/test',
      };
      
      db = new Database(config);
      
      // Should fail to connect to invalid database
      await expect(db.connect()).rejects.toThrow();
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      const config: DatabaseConfig = {
        type: 'sqlite',
        path: ':memory:',
      };
      db = new Database(config);
      await db.connect();
    });

    it('should execute query', async () => {
      await db.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      
      const result = await db.execute('INSERT INTO users (name) VALUES (?)', ['张三']);
      
      expect(result).toHaveProperty('lastInsertRowid');
    });

    it('should select data', async () => {
      await db.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      await db.execute('INSERT INTO users (name) VALUES (?)', ['张三']);
      
      const rows = await db.select('SELECT * FROM users');
      
      expect(rows.length).toBe(1);
      expect(rows[0].name).toBe('张三');
    });

    it('should return empty array for no results', async () => {
      await db.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      
      const rows = await db.select('SELECT * FROM users WHERE id = ?', [999]);
      
      expect(rows).toEqual([]);
    });
  });

  describe('transaction', () => {
    beforeEach(async () => {
      const config: DatabaseConfig = {
        type: 'sqlite',
        path: ':memory:',
      };
      db = new Database(config);
      await db.connect();
    });

    it('should execute transaction', async () => {
      await db.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      
      await db.transaction(async (trx) => {
        await trx.execute('INSERT INTO users (name) VALUES (?)', ['张三']);
        await trx.execute('INSERT INTO users (name) VALUES (?)', ['李四']);
      });
      
      const rows = await db.select('SELECT * FROM users');
      expect(rows.length).toBe(2);
    });

    it('should rollback on error', async () => {
      await db.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      
      await expect(async () => {
        await db.transaction(async (trx) => {
          await trx.execute('INSERT INTO users (name) VALUES (?)', ['张三']);
          throw new Error('Rollback test');
        });
      }).rejects.toThrow('Rollback test');
      
      const rows = await db.select('SELECT * FROM users');
      expect(rows.length).toBe(0);
    });
  });

  describe('close', () => {
    it('should close connection', async () => {
      const config: DatabaseConfig = {
        type: 'sqlite',
        path: ':memory:',
      };
      db = new Database(config);
      await db.connect();
      
      await db.close();
      
      expect(db.isConnected()).toBe(false);
    });
  });
});

describe('DatabaseConfig', () => {
  it('should create sqlite config', () => {
    const config: DatabaseConfig = {
      type: 'sqlite',
      path: './data.db',
    };
    
    expect(config.type).toBe('sqlite');
  });

  it('should create postgresql config', () => {
    const config: DatabaseConfig = {
      type: 'postgresql',
      connectionString: 'postgresql://user:pass@localhost:5432/db',
    };
    
    expect(config.type).toBe('postgresql');
  });
});
