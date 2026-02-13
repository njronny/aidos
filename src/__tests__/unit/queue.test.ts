// Mock implementations
const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  close: jest.fn().mockResolvedValue(undefined),
  getJobCounts: jest.fn().mockResolvedValue({
    waiting: 0,
    active: 1,
    completed: 5,
    failed: 0,
    delayed: 0,
  }),
};

const mockWorker = {
  close: jest.fn().mockResolvedValue(undefined),
};

// Mock BullMQ
jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => mockQueue),
    Worker: jest.fn().mockImplementation(() => mockWorker),
  };
});

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
  }));
});

import { QueueService, QUEUE_NAMES } from '../../core/queue/QueueService';
import { TaskQueue, TaskJobData } from '../../core/queue/TaskQueue';
import { TaskPriority, TaskStatus } from '../../types';

describe('QueueService', () => {
  let queueService: QueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    queueService = new QueueService({
      host: 'localhost',
      port: 6379,
    });
  });

  afterEach(async () => {
    await queueService.close();
  });

  describe('constructor', () => {
    it('should create queue service with default options', () => {
      const service = new QueueService();
      expect(service).toBeDefined();
    });

    it('should accept custom redis options', () => {
      const service = new QueueService({
        host: 'custom-host',
        port: 6380,
        db: 1,
      });
      expect(service).toBeDefined();
    });
  });

  describe('getQueue', () => {
    it('should create and return a queue', () => {
      const queue = queueService.getQueue('test-queue');
      expect(queue).toBeDefined();
    });

    it('should return same queue for same name', () => {
      const queue1 = queueService.getQueue('test-queue');
      const queue2 = queueService.getQueue('test-queue');
      expect(queue1).toBe(queue2);
    });
  });

  describe('addJob', () => {
    it('should add a job to the queue', async () => {
      const jobId = await queueService.addJob(
        QUEUE_NAMES.TASK_QUEUE,
        'test-job',
        { data: 'test' }
      );
      expect(jobId).toBe('job-123');
    });
  });

  describe('addDelayedJob', () => {
    it('should add a delayed job', async () => {
      const jobId = await queueService.addDelayedJob(
        QUEUE_NAMES.TASK_QUEUE,
        'delayed-job',
        { data: 'test' },
        5000
      );
      expect(jobId).toBe('job-123');
    });
  });

  describe('addJobWithRetry', () => {
    it('should add a job with retry configuration', async () => {
      const jobId = await queueService.addJobWithRetry(
        QUEUE_NAMES.TASK_QUEUE,
        'retry-job',
        { data: 'test' },
        3,
        { type: 'exponential', delay: 1000 }
      );
      expect(jobId).toBe('job-123');
    });
  });

  describe('getJobCounts', () => {
    it('should return job counts', async () => {
      const counts = await queueService.getJobCounts(QUEUE_NAMES.TASK_QUEUE);
      expect(counts).toEqual({
        waiting: 0,
        active: 1,
        completed: 5,
        failed: 0,
        delayed: 0,
      });
    });
  });

  describe('isHealthy', () => {
    it('should have isHealthy method', () => {
      expect(typeof queueService.isHealthy).toBe('function');
    });
  });
});

describe('TaskQueue', () => {
  let taskQueue: TaskQueue;

  beforeEach(async () => {
    jest.clearAllMocks();
    taskQueue = new TaskQueue({
      concurrency: 2,
      defaultTimeout: 60000,
      defaultRetries: 3,
    });
    await taskQueue.initialize();
  });

  afterEach(async () => {
    await taskQueue.close();
  });

  describe('constructor', () => {
    it('should create task queue with default config', () => {
      const queue = new TaskQueue();
      expect(queue).toBeDefined();
    });

    it('should accept custom config', () => {
      const queue = new TaskQueue({
        concurrency: 10,
        defaultTimeout: 120000,
        defaultRetries: 5,
      });
      expect(queue).toBeDefined();
    });
  });

  describe('registerProcessor', () => {
    it('should register a task processor', () => {
      const processor = jest.fn().mockResolvedValue({ success: true });
      taskQueue.registerProcessor('test-agent', processor);
    });
  });

  describe('addTask', () => {
    it('should add a task to the queue', async () => {
      const processor = jest.fn().mockResolvedValue({ success: true });
      taskQueue.registerProcessor('test-agent', processor);

      const jobId = await taskQueue.addTask(
        'task-1',
        'Test Task',
        'test-agent',
        { data: 'test' }
      );
      expect(jobId).toBe('job-123');
    });

    it('should add task with priority', async () => {
      const processor = jest.fn().mockResolvedValue({ success: true });
      taskQueue.registerProcessor('test-agent', processor);

      const jobId = await taskQueue.addTask(
        'task-1',
        'High Priority Task',
        'test-agent',
        { data: 'test' },
        { priority: TaskPriority.HIGH }
      );
      expect(jobId).toBe('job-123');
    });
  });

  describe('addDelayedTask', () => {
    it('should add a delayed task', async () => {
      const processor = jest.fn().mockResolvedValue({ success: true });
      taskQueue.registerProcessor('test-agent', processor);

      const jobId = await taskQueue.addDelayedTask(
        'task-1',
        'Delayed Task',
        'test-agent',
        { data: 'test' },
        5000
      );
      expect(jobId).toBe('job-123');
    });
  });

  describe('addTaskWithRetry', () => {
    it('should add a task with retry configuration', async () => {
      const processor = jest.fn().mockResolvedValue({ success: true });
      taskQueue.registerProcessor('test-agent', processor);

      const jobId = await taskQueue.addTaskWithRetry(
        'task-1',
        'Retry Task',
        'test-agent',
        { data: 'test' },
        5,
        2000
      );
      expect(jobId).toBe('job-123');
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      const stats = await taskQueue.getStats();
      expect(stats).toEqual({
        waiting: 0,
        active: 1,
        completed: 5,
        failed: 0,
        delayed: 0,
      });
    });
  });

  describe('isHealthy', () => {
    it('should have isHealthy method', () => {
      expect(typeof taskQueue.isHealthy).toBe('function');
    });
  });
});

describe('TaskPriority', () => {
  it('should have correct priority values', () => {
    expect(TaskPriority.LOW).toBe(0);
    expect(TaskPriority.NORMAL).toBe(1);
    expect(TaskPriority.HIGH).toBe(2);
    expect(TaskPriority.CRITICAL).toBe(3);
  });
});

describe('QUEUE_NAMES', () => {
  it('should have correct queue names', () => {
    expect(QUEUE_NAMES.TASK_QUEUE).toBe('aidos:tasks');
    expect(QUEUE_NAMES.SCHEDULER_QUEUE).toBe('aidos:scheduler');
  });
});
