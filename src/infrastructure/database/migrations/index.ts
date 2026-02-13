import { getDatabase, isSQLite, isPostgreSQL, Knex } from '../connection';

/**
 * 数据库迁移管理器
 */
export class MigrationManager {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 运行所有迁移
   */
  async run(): Promise<void> {
    console.log('Running database migrations...');
    
    // 创建版本跟踪表
    await this.createSchemaVersionsTable();
    
    // 获取当前版本
    const currentVersion = await this.getCurrentVersion();
    console.log(`Current database version: ${currentVersion || 'none'}`);
    
    // 执行迁移
    const migrations = this.getMigrations();
    
    for (const migration of migrations) {
      if (!currentVersion || migration.version > currentVersion) {
        console.log(`Applying migration: ${migration.version} - ${migration.description}`);
        await migration.up(this.db);
        await this.recordMigration(migration.version, migration.description);
        console.log(`Migration ${migration.version} applied successfully`);
      }
    }
    
    console.log('All migrations completed');
  }

  /**
   * 创建版本跟踪表
   */
  private async createSchemaVersionsTable(): Promise<void> {
    if (isSQLite()) {
      await this.db.raw(`
        CREATE TABLE IF NOT EXISTS schema_versions (
          version VARCHAR(50) PRIMARY KEY,
          applied_at TEXT NOT NULL DEFAULT (datetime('now')),
          description TEXT
        )
      `);
    } else if (isPostgreSQL()) {
      await this.db.raw(`
        CREATE TABLE IF NOT EXISTS schema_versions (
          version VARCHAR(50) PRIMARY KEY,
          applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          description TEXT
        )
      `);
    }
  }

  /**
   * 获取当前版本
   */
  private async getCurrentVersion(): Promise<string | null> {
    const row = await this.db('schema_versions')
      .orderBy('applied_at', 'desc')
      .first();
    return row ? row.version : null;
  }

  /**
   * 记录迁移
   */
  private async recordMigration(version: string, description: string): Promise<void> {
    await this.db('schema_versions').insert({
      version,
      description,
    });
  }

  /**
   * 获取迁移列表
   */
  private getMigrations(): Migration[] {
    return [
      {
        version: '1.0.0',
        description: 'Initial schema - create all tables',
        up: this.migration_1_0_0.bind(this),
      },
    ];
  }

  /**
   * 1.0.0 初始迁移 - 创建所有表
   */
  private async migration_1_0_0(db: Knex): Promise<void> {
    if (isSQLite()) {
      await this.migration_1_0_0_sqlite(db);
    } else if (isPostgreSQL()) {
      await this.migration_1_0_0_postgres(db);
    }
  }

  /**
   * SQLite 1.0.0 迁移
   */
  private async migration_1_0_0_sqlite(db: Knex): Promise<void> {
    // 用户表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT UNIQUE,
        display_name TEXT,
        role TEXT NOT NULL CHECK (role IN ('admin', 'developer', 'viewer')),
        notification_preferences TEXT DEFAULT '{}',
        config TEXT DEFAULT '{}',
        last_login_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

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

    // 代理日志表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS agent_logs (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
        log_level TEXT NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
        message TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // 技能表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        description TEXT,
        source TEXT,
        content TEXT,
        config_schema TEXT,
        is_builtin INTEGER DEFAULT 0,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        enabled INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Git提交表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS commits (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
        commit_hash TEXT NOT NULL,
        parent_hashes TEXT,
        branch TEXT NOT NULL,
        message TEXT NOT NULL,
        author TEXT NOT NULL,
        author_email TEXT,
        files_changed TEXT DEFAULT '[]',
        insertions INTEGER DEFAULT 0,
        deletions INTEGER DEFAULT 0,
        is_rollback INTEGER DEFAULT 0,
        rolled_back_by_id TEXT REFERENCES commits(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

    // 创建索引
    await this.createIndexes_sqlite(db);
  }

  /**
   * PostgreSQL 1.0.0 迁移
   */
  private async migration_1_0_0_postgres(db: Knex): Promise<void> {
    // 启用扩展
    await db.raw(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await db.raw(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // 用户表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) UNIQUE,
        display_name VARCHAR(255),
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'developer', 'viewer')),
        notification_preferences JSONB DEFAULT '{}',
        config JSONB DEFAULT '{}',
        last_login_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // 项目表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        repository_url VARCHAR(500),
        default_branch VARCHAR(100) DEFAULT 'main',
        status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'archived', 'completed')),
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // 需求表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS requirements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        parsed_content JSONB,
        status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'analyzing', 'analyzed', 'rejected')),
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        risk_level VARCHAR(20),
        risk_notes TEXT,
        ai_model VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // 任务表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'waiting', 'completed', 'failed', 'skipped')),
        priority INTEGER DEFAULT 0,
        estimated_duration INTEGER,
        actual_duration INTEGER,
        agent_type VARCHAR(50),
        assignee VARCHAR(100),
        result JSONB,
        error_log TEXT,
        metadata JSONB DEFAULT '{}',
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // 任务依赖表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        depends_on_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        dependency_type VARCHAR(20) DEFAULT 'finish_to_start',
        CONSTRAINT unique_task_dependency UNIQUE (task_id, depends_on_id)
      )
    `);

    // 代理表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('PM', 'PO', 'Architect', 'Dev', 'QA', 'DBA')),
        status VARCHAR(20) NOT NULL CHECK (status IN ('idle', 'busy', 'offline')),
        capabilities JSONB DEFAULT '[]',
        config JSONB DEFAULT '{}',
        current_task_id UUID REFERENCES tasks(id),
        total_tasks INTEGER DEFAULT 0,
        success_rate DECIMAL(5,2),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // 代理日志表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS agent_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
        log_level VARCHAR(10) NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
        message TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // 技能表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS skills (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        version VARCHAR(50) NOT NULL,
        description TEXT,
        source VARCHAR(500),
        content TEXT,
        config_schema JSONB,
        is_builtin BOOLEAN DEFAULT FALSE,
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // Git提交表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS commits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
        commit_hash VARCHAR(40) NOT NULL,
        parent_hashes TEXT[],
        branch VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        author VARCHAR(100) NOT NULL,
        author_email VARCHAR(255),
        files_changed JSONB DEFAULT '[]',
        insertions INTEGER DEFAULT 0,
        deletions INTEGER DEFAULT 0,
        is_rollback BOOLEAN DEFAULT FALSE,
        rolled_back_by_id UUID REFERENCES commits(id),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // 通知记录表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        channel VARCHAR(50) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        title VARCHAR(500),
        content TEXT NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
        response JSONB,
        sent_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // 工作流表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS workflows (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
        progress DECIMAL(5,2) DEFAULT 0,
        config JSONB DEFAULT '{}',
        result JSONB,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // 工作流步骤表
    await db.raw(`
      CREATE TABLE IF NOT EXISTS workflow_steps (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        step_order INTEGER NOT NULL,
        name VARCHAR(200) NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
        result JSONB,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // 创建索引
    await this.createIndexes_postgres(db);
  }

  /**
   * 创建SQLite索引
   */
  private async createIndexes_sqlite(db: Knex): Promise<void> {
    // 项目相关索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_requirements_project ON requirements(project_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_requirement ON tasks(requirement_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_commits_project ON commits(project_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_commits_task ON commits(task_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_notifications_project ON notifications(project_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_notifications_task ON notifications(task_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_workflows_project ON workflows(project_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON workflow_steps(workflow_id)`);

    // 代理相关索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_agent_logs_task ON agent_logs(task_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_agents_current_task ON agents(current_task_id)`);

    // 业务查询索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority DESC)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee, status)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_commits_branch ON commits(branch)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_commits_author ON commits(author)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_commits_hash ON commits(commit_hash)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_commits_created ON commits(created_at DESC)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_agent_logs_level ON agent_logs(log_level)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON agent_logs(created_at DESC)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_created ON agent_logs(agent_id, created_at DESC)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_workflow_steps_status ON workflow_steps(status)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_order ON workflow_steps(workflow_id, step_order)`);
  }

  /**
   * 创建PostgreSQL索引
   */
  private async createIndexes_postgres(db: Knex): Promise<void> {
    // 项目相关索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_requirements_project ON requirements(project_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_requirement ON tasks(requirement_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_commits_project ON commits(project_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_commits_task ON commits(task_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_notifications_project ON notifications(project_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_notifications_task ON notifications(task_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_workflows_project ON workflows(project_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON workflow_steps(workflow_id)`);

    // 代理相关索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_agent_logs_task ON agent_logs(task_id)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_agents_current_task ON agents(current_task_id)`);

    // 业务查询索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority DESC)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee, status)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_commits_branch ON commits(branch)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_commits_author ON commits(author)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_commits_hash ON commits(commit_hash)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_commits_created ON commits(created_at DESC)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_agent_logs_level ON agent_logs(log_level)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON agent_logs(created_at DESC)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_created ON agent_logs(agent_id, created_at DESC)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_workflow_steps_status ON workflow_steps(status)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_order ON workflow_steps(workflow_id, step_order)`);

    // 全文搜索索引 (PostgreSQL)
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_requirements_content_fts ON requirements USING GIN (to_jsonb(content) jsonb_path_ops)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_description_fts ON tasks USING GIN (to_jsonb(description) jsonb_path_ops)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_agent_logs_message_fts ON agent_logs USING GIN (to_jsonb(message) jsonb_path_ops)`);
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_commits_message_fts ON commits USING GIN (to_jsonb(message) jsonb_path_ops)`);
  }
}

interface Migration {
  version: string;
  description: string;
  up: (db: Knex) => Promise<void>;
}

/**
 * 运行迁移
 */
export async function runMigrations(): Promise<void> {
  const manager = new MigrationManager();
  await manager.run();
}
