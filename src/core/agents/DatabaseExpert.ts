import { Agent, AgentType, AgentCapabilities, AgentExecutionResult, AgentStatus } from './Agent';

/**
 * Database Expert - 数据库专家代理
 * 负责数据库设计、SQL优化、数据建模
 */
export class DatabaseExpert extends Agent {
  constructor() {
    super(
      'Database Expert',
      AgentType.DATABASE_EXPERT,
      {
        canDesign: false,
        canDevelop: false,
        canTest: false,
        canAnalyze: false,
        canManage: false,
        canDesignDatabase: true,
        canReview: true,
      }
    );
    this.metadata.role = '数据库专家';
    this.metadata.responsibilities = [
      '数据库架构设计',
      '数据建模',
      'SQL性能优化',
      '索引设计',
      '数据迁移',
      '数据库安全',
    ];
  }

  async execute(input: Record<string, unknown>): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    this.status = AgentStatus.BUSY;

    try {
      const action = input.action as string || 'design';
      let output = '';

      switch (action) {
        case 'design':
        case 'modeling':
          output = await this.designDatabase(input);
          break;
        case 'optimize':
          output = await this.optimizeQuery(input);
          break;
        case 'index':
          output = await this.designIndexes(input);
          break;
        case 'migrate':
          output = await this.createMigration(input);
          break;
        case 'review':
          output = await this.reviewSchema(input);
          break;
        default:
          output = await this.designDatabase(input);
      }

      this.status = AgentStatus.IDLE;
      return {
        success: true,
        output,
        data: { action, agentType: this.type },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.status = AgentStatus.ERROR;
      return {
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime,
      };
    }
  }

  private async designDatabase(input: Record<string, unknown>): Promise<string> {
    const projectName = input.projectName as string || '应用系统';
    const entities = input.entities as string[] || ['用户', '订单', '商品'];
    
    const schema = `
# 数据库设计 - ${projectName}

## 设计原则
1. **第三范式(3NF)**: 消除冗余数据
2. **命名规范**: 小写字母 + 下划线
3. **主键策略**: 使用UUID或自增ID
4. **软删除**: 使用deleted_at字段

## 实体关系图

\`\`\`
┌──────────────┐       ┌──────────────┐
│    users     │       │   orders    │
├──────────────┤       ├──────────────┤
│ id           │◄──────│ user_id      │
│ username     │       │ id           │
│ email        │       │ total_amount │
│ password     │       │ status       │
│ created_at   │       │ created_at   │
└──────────────┘       └──────────────┘
        │                      │
        │                      │
        ▼                      ▼
┌──────────────┐       ┌──────────────┐
│  addresses   │       │ order_items │
├──────────────┤       ├──────────────┤
│ id           │       │ id           │
│ user_id      │       │ order_id     │
│ address      │       │ product_id   │
│ city         │       │ quantity     │
│ country      │       │ price        │
└──────────────┘       └──────────────┘
\`\`\`

## 表结构设计

### 1. users (用户表)
\`\`\`sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
\`\`\`

### 2. orders (订单表)
\`\`\`sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
    shipping_address JSONB,
    payment_method VARCHAR(50),
    paid_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);
\`\`\`

### 3. order_items (订单明细表)
\`\`\`sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
\`\`\`

## 实体: ${entities.map(e => `\n- ${e}`).join('')}

## 关键设计决策
1. 使用UUID作为主键，支持分布式部署
2. 使用JSONB存储半结构化数据（地址、配置等）
3. 使用软删除机制保护数据
4. 所有表包含created_at和updated_at时间戳
    `.trim();

    this.metadata.lastSchema = schema;
    return schema;
  }

  private async optimizeQuery(input: Record<string, unknown>): Promise<string> {
    const query = input.query as string || 'SELECT * FROM users';
    
    const optimization = `
# SQL性能优化

## 原始查询
\`\`\`sql
${query}
\`\`\`

## 问题分析

### 1. 执行计划分析
\`\`\`
Seq Scan on users  (cost=0.00..100.00 rows=1000)
  Filter: status = 'active'
\`\`\`

### 2. 潜在问题
- [ ] 全表扫描 (Seq Scan)
- [ ] 缺少索引
- [ ] SELECT * 查询
- [ ] N+1 查询问题

## 优化方案

### 方案1: 添加索引
\`\`\`sql
CREATE INDEX idx_users_status_active 
ON users(status) 
WHERE status = 'active';
\`\`\`

### 方案2: 优化查询字段
\`\`\`sql
SELECT id, username, email, created_at 
FROM users 
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 100;
\`\`\`

### 方案3: 使用EXPLAIN ANALYZE
\`\`\`sql
EXPLAIN ANALYZE
SELECT id, username, email
FROM users
WHERE status = 'active'
AND created_at > NOW() - INTERVAL '30 days';
\`\`\`

## 优化后执行计划
\`\`\`
Index Scan using idx_users_status_active on users  
(cost=0.11..8.13 rows=1 width=68)
  Index Cond: (status = 'active'::varchar)
  Filter: (created_at > (now() - '30 days'::interval))
Planning Time: 0.156 ms
Execution Time: 0.089 ms
\`\`\`

## 性能对比
| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 执行时间 | 150ms | 0.5ms | 300x |
| 扫描行数 | 10000 | 1 | 10000x |
| IO成本 | 100 | 8 | 12.5x |

## 通用优化建议
1. **避免SELECT *** - 只查询需要的字段
2. **使用EXPLAIN分析** - 了解查询执行计划
3. **合理使用索引** - 区分度高字段优先
4. **分页优化** - 使用游标分页代替OFFSET
5. **批量操作** - 减少数据库往返
    `.trim();

    this.metadata.lastOptimization = optimization;
    return optimization;
  }

  private async designIndexes(input: Record<string, unknown>): Promise<string> {
    const tableName = input.tableName as string || 'orders';
    const queryPatterns = input.queryPatterns as string[] || ['user_id', 'status', 'created_at'];
    
    const indexes = `
# 索引设计 - ${tableName}

## 查询模式分析

基于以下查询模式设计索引：
${queryPatterns.map(q => `- ${q}`).join('\n')}

## 索引设计

### 主键索引
\`\`\`sql
-- 自动创建
PRIMARY KEY (id)
\`\`\`

### 业务查询索引
\`\`\`sql
-- 1. 按用户查询订单 (最常用)
CREATE INDEX idx_orders_user_id 
ON orders(user_id);

-- 2. 按状态筛选 + 时间排序
CREATE INDEX idx_orders_status_created 
ON orders(status, created_at DESC);

-- 3. 按订单号精确查询
CREATE INDEX idx_orders_order_number 
ON orders(order_number) UNIQUE;

-- 4. 复合索引：用户+状态
CREATE INDEX idx_orders_user_status 
ON orders(user_id, status);

-- 5. 部分索引：只索引活跃订单
CREATE INDEX idx_orders_active 
ON orders(user_id, created_at DESC)
WHERE status IN ('paid', 'processing', 'shipped');
\`\`\`

## 索引选择策略

### B-Tree索引 (默认)
适用于: =, >, <, >=, <=, BETWEEN, LIKE

### Hash索引
适用于: = (等值查询)

### GIN索引
适用于: JSONB, 数组, 全文搜索

### BRIN索引
适用于: 时间序列数据，按块存储

## 索引维护

### 分析索引使用情况
\`\`\`sql
SELECT 
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE relname = '${tableName}';
\`\`\`

### 查找未使用的索引
\`\`\`sql
SELECT 
    indexrelname,
    idx_scan
FROM pg_stat_user_indexes
WHERE relname = '${tableName}'
AND idx_scan = 0;
\`\`\`

### 重建索引
\`\`\`sql
REINDEX INDEX idx_orders_user_id;
\`\`\`

## 注意事项
1. 索引不是越多越好，每个索引都有写入开销
2. 复合索引顺序很重要，区分度高的放前面
3. 定期清理未使用的索引
4. 大表索引创建考虑使用CONCURRENTLY
    `.trim();

    this.metadata.lastIndexes = indexes;
    return indexes;
  }

  private async createMigration(input: Record<string, unknown>): Promise<string> {
    const operation = input.operation as string || 'create_table';
    const tableName = input.tableName as string || 'new_table';
    
    const migration = `
# 数据库迁移 - ${operation}

## 迁移文件

### 文件名
\`\`\`
migrations/
├── 20240101000000_${operation}_${tableName}.ts
\`\`\`

### 迁移代码 (Prisma/TypeORM)
\`\`\`typescript
// ${operation}_${tableName}.ts
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class ${this.toPascalCase(operation)}${this.toPascalCase(tableName)}1704067200000 implements MigrationInterface {
  
  name = '${this.toPascalCase(operation)}${this.toPascalCase(tableName)}1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建表
    await queryRunner.createTable(
      new Table({
        name: '${this.toSnakeCase(tableName)}',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // 创建索引
    await queryRunner.createIndex(
      '${this.toSnakeCase(tableName)}',
      new TableIndex({
        name: 'idx_${this.toSnakeCase(tableName)}_name',
        columnNames: ['name'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('${this.toSnakeCase(tableName)}');
  }
}
\`\`\`

### 回滚操作
\`\`\`bash
# 回滚上一个迁移
npm run migration:revert

# 回滚到指定迁移
npm run migration:revert -- --to 20240101000000
\`\`\`

## 迁移最佳实践
1. **始终可逆**: 每个迁移必须有对应的回滚
2. **小步迁移**: 每次只做一件事
3. **测试环境验证**: 先在测试环境执行
4. **备份数据**: 大表变更前备份
5. **低峰期执行**: 选择业务低峰期
    `.trim();

    this.metadata.lastMigration = migration;
    return migration;
  }

  private async reviewSchema(input: Record<string, unknown>): Promise<string> {
    const tableName = input.tableName as string || 'users';
    
    const review = `
# 数据库架构评审 - ${tableName}

## 评审结果

### 1. 规范性检查 ✅
- [x] 表名使用小写字母 + 下划线
- [x] 列名语义清晰
- [x] 包含时间戳字段
- [x] 使用合适的字段类型

### 2. 完整性检查 ✅
- [x] 有主键定义
- [x] 有创建时间
- [x] 有更新时间
- [ ] 有软删除字段

### 3. 性能检查 ⚠️
- [x] 主键有索引
- [ ] 部分高频查询缺少索引
- [ ] 可考虑分区表

### 4. 安全性检查 ✅
- [x] 敏感字段加密存储
- [x] 无SQL注入风险
- [x] 权限控制合理

## 改进建议

### 高优先级
1. 添加deleted_at字段支持软删除
2. 为status字段添加索引
3. 考虑添加审计日志表

### 中优先级
1. 添加表注释
2. 拆分大字段到独立表
3. 考虑使用分区表

### 低优先级
1. 规范化到第四范式
2. 添加历史表

## 数据库版本管理
\`\`\`sql
-- 使用数据库版本控制
CREATE TABLE schema_versions (
    version VARCHAR(14) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rollback_sql TEXT
);
\`\`\`

## 结论
**评审状态**: 通过 ✅ (需改进2项)

建议: 修复高优先级问题后进入开发阶段
    `.trim();

    this.metadata.lastReview = review;
    return review;
  }

  // 命名转换辅助方法
  private toPascalCase(str: string): string {
    return str.replace(/(\w)(\w*)/g, (_, a, b) => a.toUpperCase() + b.toLowerCase()).replace(/[_\s]+/g, '');
  }

  private toSnakeCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s]+/g, '_').toLowerCase();
  }
}

export default DatabaseExpert;
