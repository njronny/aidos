/**
 * 数据库配置
 */
export interface DatabaseConfig {
  client: 'sqlite3' | 'better-sqlite3' | 'pg';
  connection: string | SQLiteConfig | PGConfig;
  useNullAsDefault?: boolean;
  pool?: {
    min: number;
    max: number;
  };
  acquireConnectionTimeout?: number;
}

export interface SQLiteConfig {
  filename: string;
}

export interface PGConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * 根据环境变量获取数据库配置
 */
export function getDatabaseConfig(): DatabaseConfig {
  const client = (process.env.DB_CLIENT as 'sqlite3' | 'better-sqlite3' | 'pg') || 'better-sqlite3';

  if (client === 'pg') {
    return {
      client: 'pg',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'aidos',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      },
      pool: {
        min: parseInt(process.env.DB_POOL_MIN || '2'),
        max: parseInt(process.env.DB_POOL_MAX || '10'),
      },
    };
  }

  // SQLite 默认配置
  return {
    client: 'better-sqlite3',
    connection: {
      filename: process.env.DB_FILENAME || './data/aidos.db',
    },
    useNullAsDefault: true,
    pool: {
      min: 1,
      max: 1,
    },
    acquireConnectionTimeout: 5000,
  };
}
