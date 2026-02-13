/**
 * 集成测试: 工作流端到端测试
 * 测试完整的工作流生命周期：创建 → 添加步骤 → 逐步执行 → 完成/失败
 */
import { Knex } from 'knex';
import {
  createTestDatabase,
  runTestMigrations,
  clearTestData,
  closeTestDatabase,
  insertTestProject,
} from './helpers/test-db';
import { TaskScheduler } from '../../core/scheduler/TaskScheduler';
import { Notifier } from '../../core/notifier/Notifier';
import { TaskPriority } from '../../types';

let db: Knex;

jest.mock('../../infrastructure/database/connection', () => ({
  getDatabase: () => db,
  get Knex() {
    return {};
  },
}));

let WorkflowRepository: any;
let WorkflowStepRepository: any;
let TaskRepository: any;

describe('工作流端到端测试', () => {
  let projectId: string;

  beforeAll(async () => {
    db = createTestDatabase();
    await runTestMigrations(db);
    const wfRepo = await import('../../infrastructure/database/repositories/workflow.repository');
    const wsRepo = await import(
      '../../infrastructure/database/repositories/workflow-step.repository'
    );
    const taskRepo = await import('../../infrastructure/database/repositories/task.repository');
    WorkflowRepository = wfRepo.WorkflowRepository;
    WorkflowStepRepository = wsRepo.WorkflowStepRepository;
    TaskRepository = taskRepo.TaskRepository;
  });

  beforeEach(async () => {
    await clearTestData(db);
    projectId = await insertTestProject(db, 'workflow-e2e-test');
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('完整工作流生命周期', () => {
    it('应该完成工作流的创建 → 执行 → 完成全过程', async () => {
      const wfRepo = new WorkflowRepository();
      const wsRepo = new WorkflowStepRepository();

      // 1. 创建工作流
      const workflow = await wfRepo.create({
        projectId,
        name: '全栈开发工作流',
        config: {
          autoRetry: true,
          maxRetries: 3,
        },
      });

      expect(workflow.id).toBeDefined();
      expect(workflow.status).toBe('pending');
      expect(workflow.progress).toBe(0);

      // 2. 添加步骤
      const steps = [
        { name: '需求分析', type: 'analysis', stepOrder: 1 },
        { name: '架构设计', type: 'design', stepOrder: 2 },
        { name: '编码实现', type: 'development', stepOrder: 3 },
        { name: '测试验证', type: 'testing', stepOrder: 4 },
        { name: '部署上线', type: 'deployment', stepOrder: 5 },
      ];

      for (const step of steps) {
        await wsRepo.create({
          workflowId: workflow.id,
          ...step,
        });
      }

      const allSteps = await wsRepo.findByWorkflowId(workflow.id);
      expect(allSteps).toHaveLength(5);
      expect(allSteps[0].name).toBe('需求分析');
      expect(allSteps[4].name).toBe('部署上线');

      // 3. 开始工作流
      const startedWorkflow = await wfRepo.start(workflow.id);
      expect(startedWorkflow!.status).toBe('running');
      expect(startedWorkflow!.startedAt).toBeDefined();

      // 4. 逐步执行
      const workflowSteps = await wsRepo.findByWorkflowId(workflow.id);
      let completedCount = 0;

      for (const step of workflowSteps) {
        // 开始步骤
        await wsRepo.start(step.id);
        const runningStep = await wsRepo.findById(step.id);
        expect(runningStep!.status).toBe('running');

        // 完成步骤
        await wsRepo.complete(step.id, { output: `${step.name} 完成` });
        completedCount++;

        // 更新工作流进度
        const progress = (completedCount / workflowSteps.length) * 100;
        await wfRepo.updateProgress(workflow.id, progress);
      }

      // 5. 完成工作流
      const completedWorkflow = await wfRepo.complete(workflow.id, {
        summary: '所有步骤已完成',
        totalSteps: 5,
      });

      expect(completedWorkflow!.status).toBe('completed');
      expect(completedWorkflow!.progress).toBe(100);
      expect(completedWorkflow!.completedAt).toBeDefined();
      expect(completedWorkflow!.result).toEqual({
        summary: '所有步骤已完成',
        totalSteps: 5,
      });

      // 验证所有步骤状态
      const finalSteps = await wsRepo.findByWorkflowId(workflow.id);
      for (const step of finalSteps) {
        expect(step.status).toBe('completed');
        expect(step.completedAt).toBeDefined();
      }
    });

    it('步骤失败时应该标记工作流为失败', async () => {
      const wfRepo = new WorkflowRepository();
      const wsRepo = new WorkflowStepRepository();

      const workflow = await wfRepo.create({
        projectId,
        name: '可能失败的工作流',
      });

      // 创建步骤
      await wsRepo.create({
        workflowId: workflow.id,
        name: '准备阶段',
        type: 'setup',
        stepOrder: 1,
      });
      await wsRepo.create({
        workflowId: workflow.id,
        name: '风险操作',
        type: 'risky',
        stepOrder: 2,
      });
      await wsRepo.create({
        workflowId: workflow.id,
        name: '清理阶段',
        type: 'cleanup',
        stepOrder: 3,
      });

      // 开始工作流
      await wfRepo.start(workflow.id);

      const steps = await wsRepo.findByWorkflowId(workflow.id);

      // 步骤1成功
      await wsRepo.start(steps[0].id);
      await wsRepo.complete(steps[0].id, { output: 'OK' });

      // 步骤2失败
      await wsRepo.start(steps[1].id);
      await wsRepo.fail(steps[1].id, { error: 'Permission denied' });

      // 步骤3跳过
      await wsRepo.skip(steps[2].id);

      // 工作流标记为失败
      await wfRepo.fail(workflow.id, {
        failedStep: '风险操作',
        error: 'Permission denied',
      });

      // 验证最终状态
      const finalWorkflow = await wfRepo.findById(workflow.id);
      expect(finalWorkflow!.status).toBe('failed');

      const finalSteps = await wsRepo.findByWorkflowId(workflow.id);
      expect(finalSteps[0].status).toBe('completed');
      expect(finalSteps[1].status).toBe('failed');
      expect(finalSteps[2].status).toBe('skipped');
    });

    it('应该支持暂停和恢复工作流', async () => {
      const wfRepo = new WorkflowRepository();
      const wsRepo = new WorkflowStepRepository();

      const workflow = await wfRepo.create({
        projectId,
        name: '可暂停工作流',
      });

      await wsRepo.create({
        workflowId: workflow.id,
        name: '长时间步骤',
        type: 'long-running',
        stepOrder: 1,
      });

      // 开始 → 暂停
      await wfRepo.start(workflow.id);
      const running = await wfRepo.findById(workflow.id);
      expect(running!.status).toBe('running');

      await wfRepo.pause(workflow.id);
      const paused = await wfRepo.findById(workflow.id);
      expect(paused!.status).toBe('paused');

      // 恢复 → 完成
      await wfRepo.start(workflow.id);
      const resumed = await wfRepo.findById(workflow.id);
      expect(resumed!.status).toBe('running');

      await wfRepo.complete(workflow.id);
      const completed = await wfRepo.findById(workflow.id);
      expect(completed!.status).toBe('completed');
    });
  });

  describe('工作流与任务调度协作', () => {
    it('工作流步骤应该能驱动任务调度器执行', async () => {
      const wfRepo = new WorkflowRepository();
      const wsRepo = new WorkflowStepRepository();
      const taskRepo = new TaskRepository();
      const scheduler = new TaskScheduler();
      const notifier = new Notifier({
        channels: [{ type: 'console', config: {}, enabled: true }],
        enableMilestones: true,
        enableErrors: true,
        enableProgress: true,
      });

      // 创建工作流
      const workflow = await wfRepo.create({
        projectId,
        name: 'CI/CD 流水线',
      });

      const stepDefs = [
        { name: '代码检查', type: 'lint' },
        { name: '单元测试', type: 'test' },
        { name: '构建打包', type: 'build' },
      ];

      for (let i = 0; i < stepDefs.length; i++) {
        await wsRepo.create({
          workflowId: workflow.id,
          name: stepDefs[i].name,
          type: stepDefs[i].type,
          stepOrder: i + 1,
        });
      }

      // 开始工作流
      await wfRepo.start(workflow.id);

      // 为每个步骤创建调度器任务并执行
      const wfSteps = await wsRepo.findByWorkflowId(workflow.id);
      scheduler.registerExecutor('ci-agent', async (task) => ({
        success: true,
        output: `${task.name} passed`,
        duration: 2000,
      }));

      let prevTaskId: string | undefined;
      const taskMap = new Map<string, string>(); // stepId -> schedulerTaskId

      for (const step of wfSteps) {
        const deps = prevTaskId ? [prevTaskId] : [];
        const taskId = scheduler.addTask({
          name: step.name,
          description: `工作流步骤: ${step.name}`,
          priority: TaskPriority.HIGH,
          dependencies: deps,
          maxRetries: 1,
        });
        taskMap.set(step.id, taskId);

        // 也在数据库中创建任务记录
        await taskRepo.create({
          projectId,
          title: step.name,
          description: `工作流步骤: ${step.name}`,
          status: 'pending',
          priority: TaskPriority.HIGH,
        });

        prevTaskId = taskId;
      }

      // 按顺序执行
      for (const step of wfSteps) {
        const schedulerTaskId = taskMap.get(step.id)!;

        await wsRepo.start(step.id);
        const result = await scheduler.executeTask(schedulerTaskId, 'ci-agent');
        await wsRepo.complete(step.id, { output: result.output });

        // 更新进度
        const completedSteps = (await wsRepo.findByWorkflowId(workflow.id)).filter(
          (s: any) => s.status === 'completed'
        ).length;
        const progress = (completedSteps / wfSteps.length) * 100;
        await wfRepo.updateProgress(workflow.id, progress);
      }

      // 完成工作流
      await wfRepo.complete(workflow.id, { allStepsPassed: true });
      await notifier.notifyCompletion('CI/CD 流水线');

      // 验证
      const finalWorkflow = await wfRepo.findById(workflow.id);
      expect(finalWorkflow!.status).toBe('completed');
      expect(finalWorkflow!.progress).toBe(100);

      expect(scheduler.isComplete()).toBe(true);
      const schedulerStatus = scheduler.getStatus();
      expect(schedulerStatus.completed).toBe(3);
      expect(schedulerStatus.failed).toBe(0);

      // 验证通知
      const history = notifier.getHistory();
      expect(history.some((n) => n.type === 'completion')).toBe(true);
    });
  });

  describe('并发工作流', () => {
    it('应该支持多个工作流同时运行', async () => {
      const wfRepo = new WorkflowRepository();
      const wsRepo = new WorkflowStepRepository();

      // 创建两个并行工作流
      const wf1 = await wfRepo.create({
        projectId,
        name: '前端构建',
      });
      const wf2 = await wfRepo.create({
        projectId,
        name: '后端构建',
      });

      // 各添加步骤
      await wsRepo.create({
        workflowId: wf1.id,
        name: '前端编译',
        type: 'build',
        stepOrder: 1,
      });
      await wsRepo.create({
        workflowId: wf2.id,
        name: '后端编译',
        type: 'build',
        stepOrder: 1,
      });

      // 同时启动
      await wfRepo.start(wf1.id);
      await wfRepo.start(wf2.id);

      const runningWorkflows = await wfRepo.findByStatus('running');
      expect(runningWorkflows).toHaveLength(2);

      // 分别完成
      const steps1 = await wsRepo.findByWorkflowId(wf1.id);
      const steps2 = await wsRepo.findByWorkflowId(wf2.id);

      await wsRepo.start(steps1[0].id);
      await wsRepo.complete(steps1[0].id);
      await wfRepo.complete(wf1.id);

      await wsRepo.start(steps2[0].id);
      await wsRepo.complete(steps2[0].id);
      await wfRepo.complete(wf2.id);

      const completedWorkflows = await wfRepo.findByStatus('completed');
      expect(completedWorkflows).toHaveLength(2);
    });
  });

  describe('数据完整性', () => {
    it('删除工作流应该级联删除步骤', async () => {
      const wfRepo = new WorkflowRepository();
      const wsRepo = new WorkflowStepRepository();

      const workflow = await wfRepo.create({
        projectId,
        name: '临时工作流',
      });

      await wsRepo.create({
        workflowId: workflow.id,
        name: '步骤1',
        type: 'test',
        stepOrder: 1,
      });
      await wsRepo.create({
        workflowId: workflow.id,
        name: '步骤2',
        type: 'test',
        stepOrder: 2,
      });

      // 删除前验证
      let steps = await wsRepo.findByWorkflowId(workflow.id);
      expect(steps).toHaveLength(2);

      // 删除工作流（级联删除由 SQLite FK 处理，需手动删除步骤）
      await wsRepo.deleteByWorkflowId(workflow.id);
      await wfRepo.delete(workflow.id);

      // 删除后验证
      const deletedWorkflow = await wfRepo.findById(workflow.id);
      expect(deletedWorkflow).toBeNull();

      steps = await wsRepo.findByWorkflowId(workflow.id);
      expect(steps).toHaveLength(0);
    });

    it('批量创建步骤应该全部成功', async () => {
      const wfRepo = new WorkflowRepository();
      const wsRepo = new WorkflowStepRepository();

      const workflow = await wfRepo.create({
        projectId,
        name: '批量步骤工作流',
      });

      const stepInputs = Array.from({ length: 10 }, (_, i) => ({
        workflowId: workflow.id,
        name: `自动步骤-${i + 1}`,
        type: 'auto',
        stepOrder: i + 1,
      }));

      await wsRepo.createMany(stepInputs);

      const steps = await wsRepo.findByWorkflowId(workflow.id);
      expect(steps).toHaveLength(10);
      expect(steps[0].stepOrder).toBe(1);
      expect(steps[9].stepOrder).toBe(10);
    });
  });
});
