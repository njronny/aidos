export * from './config';
export * from './connection';
export * from './entities';
export * from './repositories';
export * from './migrations';

/**
 * 初始化数据库
 */
import { getDatabase, closeDatabase, testConnection } from './connection';
import { runMigrations } from './migrations';

export async function initializeDatabase(): Promise<void> {
  console.log('Initializing database...');
  
  // 测试连接
  const connected = await testConnection();
  if (!connected) {
    throw new Error('Failed to connect to database');
  }
  
  // 运行迁移
  await runMigrations();
  
  console.log('Database initialized successfully');
}

export { getDatabase, closeDatabase, testConnection };
