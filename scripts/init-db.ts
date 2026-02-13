/**
 * 数据库初始化脚本
 * 运行迁移并添加初始数据
 */
import { initializeDatabase, closeDatabase } from '../src/infrastructure/database';
import { ProjectRepository } from '../src/infrastructure/database/repositories/project.repository';
import { RequirementRepository } from '../src/infrastructure/database/repositories/requirement.repository';
import { TaskRepository } from '../src/infrastructure/database/repositories/task.repository';
import { AgentRepository } from '../src/infrastructure/database/repositories/agent.repository';
import { v4 as uuidv4 } from 'uuid';

async function seedData() {
  console.log('Seeding initial data...');

  const projectRepo = new ProjectRepository();
  const requirementRepo = new RequirementRepository();
  const taskRepo = new TaskRepository();
  const agentRepo = new AgentRepository();

  // 创建示例项目
  const project = await projectRepo.create({
    name: 'Aidos系统',
    description: 'AI开发系统演示项目',
    status: 'active',
  });
  console.log('Created project:', project.name);

  // 创建示例需求
  const requirement = await requirementRepo.create({
    projectId: project.id,
    title: '用户登录功能',
    content: '实现基于JWT的用户认证系统，包括登录、注册、token刷新等功能',
    priority: 'high',
    status: 'pending',
  });
  console.log('Created requirement:', requirement.title);

  // 创建示例任务
  const task = await taskRepo.create({
    projectId: project.id,
    requirementId: requirement.id,
    title: '实现登录API',
    description: '创建登录和注册接口',
    status: 'pending',
    priority: 1,
  });
  console.log('Created task:', task.title);

  // 创建示例代理
  const agent = await agentRepo.create({
    name: '开发代理',
    role: 'Dev',
    status: 'idle',
    capabilities: ['code_generation', 'code_review', 'refactoring'],
  });
  console.log('Created agent:', agent.name);

  // 创建更多示例数据
  const agent2 = await agentRepo.create({
    name: '测试代理',
    role: 'QA',
    status: 'idle',
    capabilities: ['test_generation', 'test_execution'],
  });
  console.log('Created agent:', agent2.name);

  const agent3 = await agentRepo.create({
    name: '架构师代理',
    role: 'Architect',
    status: 'idle',
    capabilities: ['system_design', 'code_review'],
  });
  console.log('Created agent:', agent3.name);

  console.log('\n✅ Database seeded successfully!');
}

async function main() {
  try {
    // 初始化数据库（运行迁移）
    await initializeDatabase();
    console.log('Database migrations completed\n');

    // 添加初始数据
    await seedData();

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

main();
