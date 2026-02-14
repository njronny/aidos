/**
 * AIDOS 开发示例 - 使用完整工作流
 */

import { createAIDOSWorkflow } from '../src/core/AIDOSWorkflow';

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         AIDOS - AI DevOps System                   ║
║         全自动软件开发系统                          ║
╚══════════════════════════════════════════════════════╝
  `);

  // 创建工作流
  const workflow = createAIDOSWorkflow({
    maxRetries: 3,
    // useRealOpenClaw: true, // 启用真实 OpenClaw 执行
  });

  // 运行工作流
  const result = await workflow.run('实现一个用户管理系统，包括用户注册、登录、权限验证');

  // 输出结果
  console.log('\n📋 执行结果:');
  console.log(`   项目ID: ${result.projectId}`);
  console.log(`   任务数: ${result.taskResults.length}`);
  console.log(`   成功率: ${result.taskResults.filter(r => r.success).length}/${result.taskResults.length}`);

  // 获取流程图
  const visualizer = workflow.getVisualizer();
  const tasks = result.taskResults.map(r => ({
    id: r.taskId,
    name: `Task ${r.taskId.slice(-4)}`,
    status: r.success ? 'completed' as const : 'failed' as const,
    dependencies: [] as string[],
  }));

  const mermaid = await visualizer.exportToMermaid(tasks);
  console.log('\n📊 流程图:');
  console.log(mermaid);

  // 获取仪表盘
  const dashboard = workflow.getDashboard();
  const dashData = await dashboard.generate();
  console.log('\n📈 统计:');
  console.log(`   总任务: ${dashData.overview.totalTasks}`);
  console.log(`   完成: ${dashData.overview.completedProjects}`);

  console.log('\n✅ AIDOS 开发完成！');
}

main().catch(console.error);
