/**
 * AIDOS 开发示例
 * 
 * 演示如何使用 AIDOS 开发一个简单需求
 */

import { OpenClawExecutor, OpenClawTask } from '../src/core/openclaw-integration/OpenClawExecutor';
import { TaskDistributor } from '../src/core/openclaw-integration/TaskDistributor';
import { ErrorClassifier } from '../src/core/error-recovery/ErrorClassifier';
import { FixStrategyEngine } from '../src/core/error-recovery/FixStrategyEngine';
import { AutoRetry } from '../src/core/error-recovery/AutoRetry';
import { ProjectRepository } from '../src/core/persistence/ProjectRepository';
import { TaskRepository } from '../src/core/persistence/TaskRepository';
import { Dashboard } from '../src/core/visualization/Dashboard';
import { FlowVisualizer } from '../src/core/visualization/FlowVisualizer';

async function developRequirement() {
  console.log('🤖 AIDOS 开发流程演示\n');
  console.log('='.repeat(50));

  // 1. 创建项目
  console.log('\n📦 步骤1: 创建项目');
  const projectRepo = new ProjectRepository();
  const project = await projectRepo.create({
    name: '用户管理系统',
    description: '实现用户注册、登录、权限管理',
  });
  console.log(`✅ 项目创建: ${project.name} (ID: ${project.id})`);

  // 2. 创建任务
  console.log('\n📋 步骤2: 拆分任务');
  const taskRepo = new TaskRepository();
  
  const task1 = await taskRepo.create({
    projectId: project.id,
    name: '实现用户注册功能',
    type: 'development',
    description: '包括用户名、密码、邮箱验证',
  });
  
  const task2 = await taskRepo.create({
    projectId: project.id,
    name: '编写单元测试',
    type: 'testing',
    description: '覆盖注册功能的正常和异常场景',
    dependencies: [task1.id],
  });

  const task3 = await taskRepo.create({
    projectId: project.id,
    name: 'Git 提交代码',
    type: 'development',
    description: '提交代码到仓库',
    dependencies: [task2.id],
  });

  console.log(`✅ 创建任务: ${task1.name}`);
  console.log(`✅ 创建任务: ${task2.name}`);
  console.log(`✅ 创建任务: ${task3.name}`);

  // 3. 执行任务 - 使用 OpenClaw
  console.log('\n🚀 步骤3: 执行任务 (调用 OpenClaw)');
  const distributor = new TaskDistributor();

  // 任务1: 生成代码
  console.log('\n--- 任务1: 生成用户注册代码 ---');
  const result1 = await distributor.distribute({
    id: task1.id,
    prompt: '实现一个用户注册函数，需要验证用户名（3-20字符）、密码（至少6位）、邮箱格式',
    agentType: 'developer',
  });

  if (result1.success) {
    console.log('✅ 代码生成成功');
    console.log('📝 生成代码:');
    console.log(result1.output.substring(0, 200) + '...');
    await taskRepo.updateStatus(task1.id, 'completed');
  } else {
    console.log('❌ 代码生成失败:', result1.error);
    await taskRepo.updateStatus(task1.id, 'failed');
  }

  // 任务2: 生成测试
  console.log('\n--- 任务2: 生成单元测试 ---');
  const result2 = await distributor.distribute({
    id: task2.id,
    prompt: '为用户注册函数编写 Jest 单元测试',
    agentType: 'qa',
  });

  if (result2.success) {
    console.log('✅ 测试生成成功');
    console.log('📝 生成测试:');
    console.log(result2.output.substring(0, 200) + '...');
    await taskRepo.updateStatus(task2.id, 'completed');
  }

  // 4. 错误处理演示
  console.log('\n🛡️ 步骤4: 错误分类与修复');
  const classifier = new ErrorClassifier();
  const fixEngine = new FixStrategyEngine();

  const testError = 'SyntaxError: Unexpected token at line 10';
  const classified = classifier.classify(testError);
  console.log(`🔍 错误分类: ${classified.type} (严重程度: ${classified.severity})`);

  const strategy = fixEngine.generateStrategy(classified.type, testError);
  console.log(`📋 修复策略: ${strategy.actions.map((a: any) => a.description).join(' → ')}`);
  console.log(`📊 置信度: ${(strategy.confidence * 100).toFixed(0)}%`);

  // 5. 重试机制演示
  console.log('\n🔄 步骤5: 自动重试演示');
  const retry = new AutoRetry();
  let attempts = 0;
  
  const retryResult = await retry.execute(
    async () => {
      attempts++;
      if (attempts < 2) throw new Error('Network error');
      return 'Operation successful!';
    },
    { maxRetries: 3, delay: 100 }
  );

  console.log(`✅ 重试结果: ${retryResult.success ? '成功' : '失败'}`);
  console.log(`🔢 重试次数: ${retryResult.attempts}`);

  // 6. 可视化 - 生成流程图
  console.log('\n📊 步骤6: 生成流程图');
  const tasks = await taskRepo.getByProject(project.id);
  const taskInputs = tasks.map(t => ({
    id: t.id,
    name: t.name,
    status: t.status,
    dependencies: t.dependencies || [],
  }));
  const visualizer = new FlowVisualizer();
  
  const flow = await visualizer.generateFlow(taskInputs);
  console.log(`✅ 流程图: ${flow.nodes.length} 节点, ${flow.edges.length} 边`);

  const mermaid = await visualizer.exportToMermaid(taskInputs);
  console.log('\n📝 Mermaid 流程图:');
  console.log(mermaid);

  // 7. 仪表盘
  console.log('\n📈 步骤7: 项目仪表盘');
  const dashboard = new Dashboard();
  const dashData = await dashboard.generate();
  
  console.log(`📦 项目数: ${dashData.overview.activeProjects}`);
  console.log(`📋 任务数: ${dashData.overview.totalTasks}`);

  const alerts = await dashboard.getAlerts();
  console.log(`⚠️  告警数: ${alerts.length}`);

  console.log('\n' + '='.repeat(50));
  console.log('🎉 开发流程演示完成！');
}

// 运行示例
developRequirement().catch(console.error);
