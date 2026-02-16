import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 创建用户表
  const hasUsers = await knex.schema.hasTable('users');
  if (!hasUsers) {
    await knex.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('username').unique().notNullable();
      table.string('email').unique();
      table.string('password_hash').notNullable();
      table.string('role').defaultTo('user'); // admin, user, readonly
      table.string('status').defaultTo('active'); // active, inactive, suspended
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    
    // 创建索引
    await knex.schema.raw('CREATE INDEX idx_users_username ON users(username)');
    await knex.schema.raw('CREATE INDEX idx_users_status ON users(status)');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
