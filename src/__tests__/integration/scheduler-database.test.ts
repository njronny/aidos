/**
 * 集成测试: 任务调度器与数据库集成
 * 测试 TaskScheduler 的调度结果通过 Repository 正确持久化到数据库
 */
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import {
  createTestDatabase,
  runTestMigrations,
  clearTestData,
  closeTestDatabase,
  insertTestProject,
} from './helpers/test-db';
import { TaskScheduler } from '../../core/scheduler/TaskScheduler';
import { TaskPriority, TaskResult } from '../../types';

// 模拟 getDatabase 使之返回测试数据库
let db: Knex;

jest.mock('../../infrastructure/database/connection', () => ({
  getDatabase: () => db,
  get Knex() {
    return {};
  },
}));

// 动态导入以确保 mock 生效
let TaskRepository: any;
let WorkflowRepository: any;
let WorkflowStepRepository: any;

describe('TaskScheduler + Database 集成测试', () => {
  let projectId: string;

  beforeAll(async () => {
    db = createTestDatabase();
    await runTestMigrations(db);
    // 在 mock 生效后动态导入
    const taskRepo = await import('../../infrastructure/database/repositories/task.repository');
    const wfRepo = await import('../../infrastructure/database/repositories/workflow.repository');
    const wsRepo = await import(
      '../../infrastructure/database/repositories/workflow-step.repository'
    );
    TaskRepository = taskRepo.TaskRepository;
    WorkflowRepository = wfRepo.WorkflowRepository;
    WorkflowStepRepository = wsRepo.WorkflowStepRepository;
  });

  beforeEach(async () => {
    await clearTestData(db);
    projectId = await insertTestProject(db, 'scheduler-test');
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('调度任务并持久化', () => {
    it('应该将调度器产生的任务持久化到数据库', async () => {
      const scheduler = new TaskScheduler({ maxConcurrentTasks: 3 });
      const taskRepo = new TaskRepository();

      // 在调度器中创建任务
      const taskId1 = scheduler.addTask({
        name: '数据库设计',
        description: '设计数据库表结构',
        priority: TaskPriority.HIGH,
        dependencies: [],
        maxRetries: 2,
      });

      const taskId2 = scheduler.addTask({
        name: 'API开发',
        description: '开发 REST API',
        priority: TaskPriority.NORMAL,
        dependencies: [taskId1],
        maxRetries: 3,
      });

      // 将调度器任务持久化到数据库
      const schedulerTasks = scheduler.getAllTasks();
      for (const task of schedulerTasks) {
        await taskRepo.create({
          projectId,
          title: task.name,
          description: task.description,
          status: 'pending',
          priority: task.priority,
          metadata: { schedulerTaskId: task.id },
        });
      }

      // 验证数据库中存在对应记录
      const dbTasks = await taskRepo.findByProjectId(projectId);
      expect(dbTasks).toHaveLength(2);
      expect(dbTasks.map((t: any) => t.title)).toContain('数据库设计');
      expect(dbTasks.map((t: any) => t.title)).toContain('API开发');
    });

    it('执行任务后应该正确更新数据库状态', async () => {
      const scheduler = new TaskScheduler();
      const taskRepo = new TaskRepository();

      // 创建调度器任务
      const taskId = scheduler.addTask({
        name: '编译检查',
        description: 'TypeScript 编译',
        priority: TaskPriority.NORMAL,
        dependencies: [],
        maxRetries: 1,
      });

      // 持久化到数据库
      const dbTask = await taskRepo.create({
        projectId,
        title: '编译检查',
        description: 'TypeScript 编译',
        status: 'pending',
        priority: TaskPriority.NORMAL,
        metadata: { schedulerTaskId: taskId },
      });

      // 注册执行器并执行任务
      scheduler.registerExecutor('dev-agent', async () => ({
        success: true,
        output: 'Compilation successful',
        duration: 5000,
      }));

      const result = await scheduler.executeTask(taskId, 'dev-agent');

      // 同步状态到数据库
      await taskRepo.update(dbTask.id, {
        status: 'completed',
        result: { success: result.success, output: result.output },
        completedAt: new Date(),
        actualDuration: result.duration,
      });

      // 验证
      const updatedTask = await taskRepo.findById(dbTask.id);
      expect(updatedTask).not.toBeNull();
      expect(updatedTask!.status).toBe('completed');
      expect(updatedTask!.result).toEqual({
        success: true,
        output: 'Compilation successful',
      });
    });

    it('任务失败时应该记录错误到数据库', async () => {
      const scheduler = new TaskScheduler();
      const taskRepo = new TaskRepository();

      const taskId = scheduler.addTask({
        name: '部署任务',
        description: '部署到生产环境',
        priority: TaskPriority.CRITICAL,
        dependencies: [],
        maxRetries: 0, // 不重试
      });

      const dbTask = await taskRepo.create({
        projectId,
        title: '部署任务',
        description: '部署到生产环境',
        status: 'pending',
        priority: TaskPriority.CRITICAL,
      });

      // 注册失败的执行器
      scheduler.registerExecutor('deploy-agent', async () => {
        throw new Error('Connection refused');
      });

      // 执行并捕获失败
      try {
        await scheduler.executeTask(taskId, 'deploy-agent');
      } catch (error) {
        await taskRepo.update(dbTask.id, {
          status: 'failed',
          errorLog: (error as Error).message,
          completedAt: new Date(),
        });
      }

      const failedTask = await taskRepo.findById(dbTask.id);
      expect(failedTask!.status).toBe('failed');
      expect(failedTask!.errorLog).toBe('Connection refused');
    });
  });

  describe('调度器状态与数据库一致性', () => {
    it('调度器中的任务数量应与数据库保持一致', async () => {
      const scheduler = new TaskScheduler();
      const taskRepo = new TaskRepository();
      const taskCount = 5;

      for (let i = 0; i < taskCount; i++) {
        const taskId = scheduler.addTask({
          name: `任务-${i}`,
          description: `第${i}个任务`,
          priority: TaskPriority.NORMAL,
          dependencies: [],
          maxRetries: 1,
        });

        await taskRepo.create({
          projectId,
          title: `任务-${i}`,
          description: `第${i}个任务`,
          status: 'pending',
          metadata: { schedulerTaskId: taskId },
        });
      }

      const schedulerStatus = scheduler.getStatus();
      const dbTasks = await taskRepo.findByProjectId(projectId);

      expect(schedulerStatus.total).toBe(taskCount);
      expect(dbTasks).toHaveLength(taskCount);
    });

    it('按状态查询数据库应返回正确结果', async () => {
      const taskRepo = new TaskRepository();

      // 创建不同状态的任务
      await taskRepo.create({
        projectId,
        title: '已完成任务',
        status: 'completed',
      });
      await taskRepo.create({
        projectId,
        title: '运行中任务',
        status: 'running',
      });
      await taskRepo.create({
        projectId,
        title: '待处理任务',
        status: 'pending',
      });

      const completedTasks = await taskRepo.findByStatus('completed');
      const runningTasks = await taskRepo.findByStatus('running');
      const pendingTasks = await taskRepo.findByStatus('pending');

      expect(completedTasks).toHaveLength(1);
      expect(runningTasks).toHaveLength(1);
      expect(pendingTasks).toHaveLength(1);
    });
  });

  describe('依赖链与数据库', () => {
    it('应该正确存储和查询任务依赖关系', async () => {
      const scheduler = new TaskScheduler();

      const id1 = scheduler.addTask({
        name: '基础设施',
        description: '搭建基础设施',
        priority: TaskPriority.HIGH,
        dependencies: [],
        maxRetries: 1,
      });

      const id2 = scheduler.addTask({
        name: '后端开发',
        description: '开发后端服务',
        priority: TaskPriority.NORMAL,
        dependencies: [id1],
        maxRetries: 1,
      });

      const id3 = scheduler.addTask({
        name: '前端开发',
        description: '开发前端页面',
        priority: TaskPriority.NORMAL,
        dependencies: [id1],
        maxRetries: 1,
      });

      const _id4 = scheduler.addTask({
        name: '集成测试',
        description: '端到端集成测试',
        priority: TaskPriority.HIGH,
        dependencies: [id2, id3],
        maxRetries: 1,
      });

      // 验证可运行任务仅为无依赖的任务
      const runnableTasks = scheduler.getRunnableTasks();
      expect(runnableTasks).toHaveLength(1);
      expect(runnableTasks[0].name).toBe('基础设施');

      // 验证执行顺序
      const executionOrder = scheduler.getExecutionOrder();
      expect(executionOrder).toHaveLength(4);
      // 基础设施应该在后端/前端之前
      const infraIdx = executionOrder.indexOf(id1);
      const backendIdx = executionOrder.indexOf(id2);
      const frontendIdx = executionOrder.indexOf(id3);
      expect(infraIdx).toBeLessThan(backendIdx);
      expect(infraIdx).toBeLessThan(frontendIdx);

      // 将依赖关系写入数据库
      const taskRepo = new TaskRepository();
      const dbTasks: Record<string, string> = {};

      for (const task of scheduler.getAllTasks()) {
        const dbTask = await taskRepo.create({
          projectId,
          title: task.name,
          description: task.description,
          status: 'pending',
          priority: task.priority,
        });
        dbTasks[task.id] = dbTask.id;
      }

      // 写入依赖关系
      await db('task_dependencies').insert({
        id: uuidv4(),
        task_id: dbTasks[id2],
        depends_on_id: dbTasks[id1],
      });
      await db('task_dependencies').insert({
        id: uuidv4(),
        task_id: dbTasks[id3],
        depends_on_id: dbTasks[id1],
      });

      // 验证依赖关系
      const deps = await db('task_dependencies')
        .where({ depends_on_id: dbTasks[id1] })
        .select('task_id');
      expect(deps).toHaveLength(2);
    });
  });
});
