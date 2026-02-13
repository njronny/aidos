/**
 * 集成测试: 多模块协作
 * 测试 RequirementAnalyzer → TaskScheduler → Notifier 模块之间的协作
 */
import { TaskScheduler } from '../../core/scheduler/TaskScheduler';
import { RequirementAnalyzer } from '../../core/analyzer/RequirementAnalyzer';
import { Notifier } from '../../core/notifier/Notifier';
import { TaskPriority, TaskResult, SchedulerEvent } from '../../types';

describe('多模块协作集成测试', () => {
  let scheduler: TaskScheduler;
  let analyzer: RequirementAnalyzer;
  let notifier: Notifier;

  beforeEach(() => {
    scheduler = new TaskScheduler({ maxConcurrentTasks: 5 });
    analyzer = new RequirementAnalyzer();
    notifier = new Notifier({
      channels: [{ type: 'console', config: {}, enabled: true }],
      enableMilestones: true,
      enableErrors: true,
      enableProgress: true,
    });
  });

  describe('需求分析 → 任务调度', () => {
    it('需求分析器的输出应该能正确转化为调度器任务', async () => {
      const requirementText = `
        系统需要支持用户注册和登录功能
        系统需要提供RESTful API接口
        系统需要支持数据库持久化
      `;

      const analysisResult = await analyzer.analyze(requirementText);

      // 验证分析结果
      expect(analysisResult.requirements.length).toBeGreaterThan(0);
      expect(analysisResult.tasks.length).toBeGreaterThan(0);

      // 将分析结果中的任务添加到调度器
      const taskIds: string[] = [];
      const taskNameToId = new Map<string, string>();

      for (const taskTemplate of analysisResult.tasks) {
        // 解析依赖（模板中的依赖是名称，调度器需要ID）
        const dependencies: string[] = [];
        for (const depName of taskTemplate.dependencies) {
          const depId = taskNameToId.get(depName);
          if (depId) {
            dependencies.push(depId);
          }
        }

        const taskId = scheduler.addTask({
          name: taskTemplate.name,
          description: taskTemplate.description,
          priority: TaskPriority.NORMAL,
          dependencies,
          maxRetries: 2,
        });

        taskIds.push(taskId);
        taskNameToId.set(taskTemplate.name, taskId);
      }

      // 验证调度器中的任务
      const status = scheduler.getStatus();
      expect(status.total).toBe(analysisResult.tasks.length);
      expect(status.pending).toBe(analysisResult.tasks.length);

      // 验证有可运行的任务
      const runnableTasks = scheduler.getRunnableTasks();
      expect(runnableTasks.length).toBeGreaterThan(0);
    });

    it('分析复杂度为complex时应该有风险信息', async () => {
      // 创建复杂需求
      const lines: string[] = [];
      for (let i = 0; i < 12; i++) {
        lines.push(`系统需要支持功能模块${i}`);
      }
      const complexRequirement = lines.join('\n');

      const result = await analyzer.analyze(complexRequirement);

      expect(result.requirements.length).toBeGreaterThan(0);
      // 对于多需求，应该有集成风险
      if (result.requirements.length > 10) {
        expect(result.risks.length).toBeGreaterThan(0);
      }
    });
  });

  describe('任务调度 → 通知系统', () => {
    it('任务完成时应该触发通知', async () => {
      const notifySpy = jest.spyOn(notifier, 'notifyMilestone');
      const notifyProgressSpy = jest.spyOn(notifier, 'notifyProgress');

      // 添加任务
      const taskId = scheduler.addTask({
        name: '核心功能开发',
        description: '开发核心业务逻辑',
        priority: TaskPriority.HIGH,
        dependencies: [],
        maxRetries: 1,
      });

      // 监听调度器事件并触发通知
      scheduler.onEvent(async (event: SchedulerEvent) => {
        if (event.type === 'task_completed') {
          await notifier.notifyMilestone(
            `任务完成: ${event.taskId}`,
            '核心功能开发完成'
          );
        }
      });

      // 注册执行器并执行
      scheduler.registerExecutor('dev-agent', async () => ({
        success: true,
        output: 'Feature implemented',
        duration: 3000,
      }));

      await scheduler.executeTask(taskId, 'dev-agent');

      // 验证通知被触发
      expect(notifySpy).toHaveBeenCalledTimes(1);
      expect(notifySpy).toHaveBeenCalledWith(
        expect.stringContaining('任务完成'),
        '核心功能开发完成'
      );
    });

    it('任务失败时应该触发错误通知', async () => {
      const notifyErrorSpy = jest.spyOn(notifier, 'notifyError');

      const taskId = scheduler.addTask({
        name: '部署服务',
        description: '部署到生产环境',
        priority: TaskPriority.CRITICAL,
        dependencies: [],
        maxRetries: 0,
      });

      scheduler.onEvent(async (event: SchedulerEvent) => {
        if (event.type === 'task_failed') {
          await notifier.notifyError('任务执行失败', '部署服务');
        }
      });

      scheduler.registerExecutor('deploy-agent', async () => {
        throw new Error('Deployment failed: timeout');
      });

      try {
        await scheduler.executeTask(taskId, 'deploy-agent');
      } catch {
        // expected
      }

      expect(notifyErrorSpy).toHaveBeenCalledWith('任务执行失败', '部署服务');
    });

    it('进度更新应正确反映调度器状态', async () => {
      const scheduler = new TaskScheduler({ maxConcurrentTasks: 5 });
      const notifyProgressSpy = jest.spyOn(notifier, 'notifyProgress');

      // 创建多个任务
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        ids.push(
          scheduler.addTask({
            name: `任务-${i}`,
            description: `任务描述 ${i}`,
            priority: TaskPriority.NORMAL,
            dependencies: [],
            maxRetries: 0,
          })
        );
      }

      // 成功执行器
      scheduler.registerExecutor('agent', async () => ({
        success: true,
        output: 'done',
      }));

      // 逐个执行并发送进度通知
      for (let i = 0; i < ids.length; i++) {
        await scheduler.executeTask(ids[i], 'agent');
        const status = scheduler.getStatus();
        await notifier.notifyProgress(status.completed, status.total, `任务-${i}`);
      }

      expect(notifyProgressSpy).toHaveBeenCalledTimes(3);
      // 最后一次调用：3/3 完成
      expect(notifyProgressSpy).toHaveBeenLastCalledWith(3, 3, '任务-2');
    });
  });

  describe('全链路: 需求 → 调度 → 执行 → 通知', () => {
    it('应该完成从需求分析到通知的完整链路', async () => {
      const events: string[] = [];

      // 1. 需求分析
      const result = await analyzer.analyze('系统需要支持用户认证功能');
      events.push('analysis_complete');

      expect(result.requirements.length).toBeGreaterThan(0);

      // 2. 创建任务
      const taskNameToId = new Map<string, string>();
      for (const taskTemplate of result.tasks) {
        const deps: string[] = [];
        for (const depName of taskTemplate.dependencies) {
          const depId = taskNameToId.get(depName);
          if (depId) deps.push(depId);
        }

        const id = scheduler.addTask({
          name: taskTemplate.name,
          description: taskTemplate.description,
          priority: TaskPriority.NORMAL,
          dependencies: deps,
          maxRetries: 1,
        });
        taskNameToId.set(taskTemplate.name, id);
      }
      events.push('tasks_created');

      // 3. 设置事件处理
      scheduler.onEvent(async (event) => {
        if (event.type === 'task_completed') {
          events.push(`task_completed:${event.taskId}`);
          await notifier.notifyProgress(
            scheduler.getStatus().completed,
            scheduler.getStatus().total
          );
        }
      });

      // 4. 注册执行器
      scheduler.registerExecutor('auto-agent', async (task) => ({
        success: true,
        output: `Completed: ${task.name}`,
        duration: 1000,
      }));

      // 5. 按执行顺序执行任务
      const executionOrder = scheduler.getExecutionOrder();
      for (const taskId of executionOrder) {
        const task = scheduler.getTask(taskId);
        if (task) {
          try {
            await scheduler.executeTask(taskId, 'auto-agent');
          } catch {
            // Skip blocked/failed tasks
          }
        }
      }
      events.push('execution_complete');

      // 6. 发送完成通知
      await notifier.notifyCompletion('用户认证功能');
      events.push('notification_sent');

      // 验证完整链路
      expect(events).toContain('analysis_complete');
      expect(events).toContain('tasks_created');
      expect(events).toContain('execution_complete');
      expect(events).toContain('notification_sent');

      // 验证所有任务完成
      expect(scheduler.isComplete()).toBe(true);

      // 验证通知历史
      const history = notifier.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('错误传播与恢复', () => {
    it('某个模块异常不应导致整个链路崩溃', async () => {
      // 分析正常
      const result = await analyzer.analyze('系统需要支持文件上传功能');

      // 创建任务
      const taskId = scheduler.addTask({
        name: '文件上传',
        description: '实现文件上传功能',
        priority: TaskPriority.NORMAL,
        dependencies: [],
        maxRetries: 1,
      });

      // 第一次执行失败
      let attempt = 0;
      scheduler.registerExecutor('flaky-agent', async () => {
        attempt++;
        if (attempt === 1) {
          throw new Error('Temporary failure');
        }
        return { success: true, output: 'Retry succeeded' };
      });

      try {
        await scheduler.executeTask(taskId, 'flaky-agent');
      } catch {
        // 首次失败，发送错误通知
        const errorResults = await notifier.notifyError('任务暂时失败', '文件上传');
        expect(errorResults.length).toBeGreaterThan(0);
      }

      // 调度器状态仍然可查
      const status = scheduler.getStatus();
      expect(status.total).toBe(1);
    });
  });
});
