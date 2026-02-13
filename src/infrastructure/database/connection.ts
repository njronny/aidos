import knex, { Knex } from 'knex';
import { getDatabaseConfig, DatabaseConfig } from './config';

let dbInstance: Knex | null = null;

/**
 * 获取数据库连接实例（单例）
 */
export function getDatabase(): Knex {
  if (!dbInstance) {
    const config = getDatabaseConfig();
    dbInstance = createConnection(config);
  }
  return dbInstance;
}

/**
 * 创建数据库连接
 */
export function createConnection(config: DatabaseConfig): Knex {
  return knex(config);
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
  }
}

/**
 * 测试数据库连接
 */
export async function testConnection(): Promise<boolean> {
  try {
    const db = getDatabase();
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * 获取当前数据库类型
 */
export function getDatabaseClient(): 'better-sqlite3' | 'sqlite3' | 'pg' {
  const config = getDatabaseConfig();
  return config.client;
}

/**
 * 判断是否为 SQLite (better-sqlite3 或 sqlite3)
 */
export function isSQLite(): boolean {
  const client = getDatabaseClient();
  return client === 'sqlite3' || client === 'better-sqlite3';
}

/**
 * 判断是否为 PostgreSQL
 */
export function isPostgreSQL(): boolean {
  return getDatabaseClient() === 'pg';
}

export { Knex };
