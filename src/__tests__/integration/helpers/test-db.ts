/**
 * 测试数据库辅助工具
 * 使用 SQLite 内存数据库进行集成测试
 */
import knex, { Knex } from 'knex';

let testDb: Knex | null = null;

/**
 * 创建测试用内存数据库
 */
export function createTestDatabase(): Knex {
  testDb = knex({
    client: 'better-sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
  });
  return testDb;
}

/**
 * 获取测试数据库实例
 */
export function getTestDatabase(): Knex {
  if (!testDb) {
    throw new Error('Test database not initialized. Call createTestDatabase() first.');
  }
  return testDb;
}

/**
 * 运行建表迁移（SQLite 内存数据库）
 */
export async function runTestMigrations(db: Knex): Promise<void> {
  // 项目表
  await db.raw(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      repository_url TEXT,
      default_branch TEXT DEFAULT 'main',
      status TEXT NOT NULL CHECK (status IN ('active', 'archived', 'completed')),
      config TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 需求表
  await db.raw(`
    CREATE TABLE IF NOT EXISTS requirements (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      parsed_content TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'analyzing', 'analyzed', 'rejected')),
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
      risk_level TEXT,
      risk_notes TEXT,
      ai_model TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 任务表
  await db.raw(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      requirement_id TEXT REFERENCES requirements(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'waiting', 'completed', 'failed', 'skipped')),
      priority INTEGER DEFAULT 0,
      estimated_duration INTEGER,
      actual_duration INTEGER,
      agent_type TEXT,
      assignee TEXT,
      result TEXT,
      error_log TEXT,
      metadata TEXT DEFAULT '{}',
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 任务依赖表
  await db.raw(`
    CREATE TABLE IF NOT EXISTS task_dependencies (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      depends_on_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      dependency_type TEXT DEFAULT 'finish_to_start',
      UNIQUE(task_id, depends_on_id)
    )
  `);

  // 工作流表
  await db.raw(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
      progress REAL DEFAULT 0,
      config TEXT DEFAULT '{}',
      result TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 工作流步骤表
  await db.raw(`
    CREATE TABLE IF NOT EXISTS workflow_steps (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
      result TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 通知记录表
  await db.raw(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
      response TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 代理表
  await db.raw(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('PM', 'PO', 'Architect', 'Dev', 'QA', 'DBA')),
      status TEXT NOT NULL CHECK (status IN ('idle', 'busy', 'offline')),
      capabilities TEXT DEFAULT '[]',
      config TEXT DEFAULT '{}',
      current_task_id TEXT REFERENCES tasks(id),
      total_tasks INTEGER DEFAULT 0,
      success_rate REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 索引
  await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)`);
  await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
  await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority DESC)`);
  await db.raw(`CREATE INDEX IF NOT EXISTS idx_workflows_project ON workflows(project_id)`);
  await db.raw(`CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status)`);
  await db.raw(`CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON workflow_steps(workflow_id)`);
  await db.raw(`CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_order ON workflow_steps(workflow_id, step_order)`);
}

/**
 * 清空所有表数据
 */
export async function clearTestData(db: Knex): Promise<void> {
  await db.raw('DELETE FROM workflow_steps');
  await db.raw('DELETE FROM workflows');
  await db.raw('DELETE FROM task_dependencies');
  await db.raw('DELETE FROM tasks');
  await db.raw('DELETE FROM requirements');
  await db.raw('DELETE FROM notifications');
  await db.raw('DELETE FROM agents');
  await db.raw('DELETE FROM projects');
}

/**
 * 关闭测试数据库
 */
export async function closeTestDatabase(): Promise<void> {
  if (testDb) {
    await testDb.destroy();
    testDb = null;
  }
}

/**
 * 插入测试项目并返回 ID
 */
export async function insertTestProject(db: Knex, name = 'test-project'): Promise<string> {
  const { v4: uuidv4 } = await import('uuid');
  const id = uuidv4();
  await db('projects').insert({
    id,
    name,
    description: `Test project: ${name}`,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return id;
}
