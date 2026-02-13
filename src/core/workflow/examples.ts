/**
 * Workflow Example - 工作流示例
 * 展示如何使用工作流引擎和任务执行器
 */
import { WorkflowEngine, WorkflowService, getWorkflowService } from './index';
import { TaskExecutor } from '../executor';
import { Notifier } from '../notifier';
import { Requirement } from '../../api/types';
import { TaskPriority, TaskStatus } from '../../types';

/**
 * 示例1: 使用WorkflowEngine手动处理需求
 */
async function example1_WorkflowEngine() {
  console.log('=== Example 1: WorkflowEngine ===');

  const notifier = new Notifier();
  const engine = new WorkflowEngine({}, notifier);

  // 创建示例需求
  const requirement: Requirement = {
    id: 'req-001',
    projectId: 'proj-001',
    title: '用户管理系统',
    description: '实现完整的用户管理系统，包括用户注册、登录、信息修改等功能',
    priority: 'high',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 处理需求，自动创建任务
  const workflow = await engine.processRequirement(requirement);

  console.log('Workflow created:', {
    id: workflow.id,
    name: workflow.name,
    taskCount: workflow.tasks.length,
    tasks: workflow.tasks.map((t) => ({
      name: t.name,
      priority: TaskPriority[t.priority],
    })),
  });

  return workflow;
}

/**
 * 示例2: 使用TaskExecutor执行任务
 */
async function example2_TaskExecutor() {
  console.log('\n=== Example 2: TaskExecutor ===');

  const executor = new TaskExecutor({
    enableGitCommit: true,
    enableCodeGeneration: true,
  });

  // 创建模拟任务
  const mockTask = {
    id: 'task-001',
    name: '实现用户登录API',
    description: '创建用户登录接口，支持JWT认证',
    status: TaskStatus.PENDING,
    priority: TaskPriority.HIGH,
    dependencies: [],
    createdAt: new Date(),
    retries: 0,
    maxRetries: 3,
  };

  // 执行任务
  const result = await executor.execute(mockTask);

  console.log('Task execution result:', {
    success: result.success,
    duration: result.duration,
    output: result.output?.substring(0, 100) + '...',
  });

  return result;
}

/**
 * 示例3: 使用WorkflowService全流程处理
 */
async function example3_WorkflowService() {
  console.log('\n=== Example 3: WorkflowService ===');

  // 获取服务实例（单例）
  const service = getWorkflowService();

  // 创建示例需求
  const requirement: Requirement = {
    id: 'req-002',
    projectId: 'proj-001',
    title: '订单管理功能',
    description: '实现订单创建、查询、取消等API接口',
    priority: 'medium',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 全流程处理：需求 -> 任务拆分 -> 自动执行
  const workflow = await service.processRequirement(requirement);

  console.log('Full workflow result:', {
    workflowId: workflow.id,
    status: workflow.status,
    taskCount: workflow.tasks.length,
    completedTasks: workflow.tasks.filter((t) => t.status === 'completed').length,
  });

  return workflow;
}

/**
 * 示例4: 处理多种类型需求
 */
async function example4_MultipleRequirementTypes() {
  console.log('\n=== Example 4: Multiple Requirement Types ===');

  const service = getWorkflowService();

  const requirements: Requirement[] = [
    {
      id: 'req-003',
      projectId: 'proj-001',
      title: '数据统计API',
      description: '提供用户数据统计分析的RESTful API接口',
      priority: 'high',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'req-004',
      projectId: 'proj-001',
      title: '前端界面开发',
      description: '开发用户管理的前端界面，使用React框架',
      priority: 'medium',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'req-005',
      projectId: 'proj-001',
      title: '单元测试编写',
      description: '为关键业务逻辑编写单元测试用例',
      priority: 'low',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // 串行处理多个需求
  for (const req of requirements) {
    const workflow = await service.processRequirement(req);
    console.log(`- ${req.title}: ${workflow.tasks.length} tasks created`);
  }

  // 查看服务状态
  console.log('\nService Status:');
  console.log('- Workflows:', service.getWorkflowStatus());
  console.log('- Executors:', service.getExecutorStatus());

  return requirements.length;
}

/**
 * 运行所有示例
 */
async function runExamples() {
  console.log('🚀 Starting Workflow Examples...\n');

  try {
    await example1_WorkflowEngine();
    await example2_TaskExecutor();
    await example3_WorkflowService();
    await example4_MultipleRequirementTypes();

    console.log('\n✅ All examples completed!');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
  }
}

// Export examples for use in tests or CLI
export {
  example1_WorkflowEngine,
  example2_TaskExecutor,
  example3_WorkflowService,
  example4_MultipleRequirementTypes,
  runExamples,
};

// Run if executed directly
if (require.main === module) {
  runExamples();
}
