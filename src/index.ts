/**
 * AIDOS - AI DevOps System
 * Main entry point
 */

import { TaskScheduler, TaskPriority } from './core/scheduler';

// Demo: Create scheduler and add tasks
async function main() {
  console.log('🤖 AIDOS - AI DevOps System Starting...\n');

  const scheduler = new TaskScheduler({
    maxConcurrentTasks: 3,
    taskTimeout: 60000,
    enableParallelExecution: true
  });

  // Register event handler
  scheduler.onEvent(event => {
    const time = event.timestamp.toISOString();
    switch (event.type) {
      case 'task_started':
        console.log(`[${time}] ▶ Task ${event.taskId} started`);
        break;
      case 'task_completed':
        console.log(`[${time}] ✅ Task ${event.taskId} completed`);
        break;
      case 'task_failed':
        console.log(`[${time}] ❌ Task ${event.taskId} failed`);
        break;
      case 'task_blocked':
        console.log(`[${time}] 🚫 Task ${event.taskId} blocked`);
        break;
    }
  });

  // Register a demo executor
  scheduler.registerExecutor('demo-agent', async (task) => {
    console.log(`   Executing: ${task.name}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      output: `Task ${task.id} completed`,
      duration: 500
    };
  });

  // Add demo tasks
  const task1Id = scheduler.addTask({
    name: 'Setup Project Structure',
    description: 'Create initial project directories and config files',
    priority: TaskPriority.HIGH,
    dependencies: [],
    maxRetries: 2
  });

  const task2Id = scheduler.addTask({
    name: 'Implement Analyzer',
    description: 'Build the requirement analyzer component',
    priority: TaskPriority.HIGH,
    dependencies: [task1Id],
    maxRetries: 2
  });

  const task3Id = scheduler.addTask({
    name: 'Implement Scheduler',
    description: 'Build the task scheduler engine',
    priority: TaskPriority.HIGH,
    dependencies: [task1Id],
    maxRetries: 2
  });

  // Note: task4Id depends on task2Id and task3Id, will run after them
  scheduler.addTask({
    name: 'Integration Tests',
    description: 'Run integration tests on all components',
    priority: TaskPriority.NORMAL,
    dependencies: [task2Id, task3Id],
    maxRetries: 3
  });

  console.log('📋 Added 4 tasks to scheduler');
  console.log(`   Execution order: ${scheduler.getExecutionOrder().join(' → ')}\n`);

  // Get runnable tasks
  const runnable = scheduler.getRunnableTasks();
  console.log(`▶ Running ${runnable.length} initial tasks (no dependencies)\n`);

  // Execute initial tasks
  for (const task of runnable) {
    try {
      await scheduler.executeTask(task.id, 'demo-agent');
    } catch (error) {
      console.error(`Error executing task ${task.id}:`, error);
    }
  }

  // Check status
  const status = scheduler.getStatus();
  console.log(`\n📊 Scheduler Status:`);
  console.log(`   Total: ${status.total}`);
  console.log(`   Pending: ${status.pending}`);
  console.log(`   Running: ${status.running}`);
  console.log(`   Completed: ${status.completed}`);
  console.log(`   Failed: ${status.failed}`);

  console.log('\n✨ AIDOS Demo Complete');
}

main().catch(console.error);
