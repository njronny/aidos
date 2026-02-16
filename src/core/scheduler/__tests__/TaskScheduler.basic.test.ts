import { TaskScheduler } from '../TaskScheduler';

describe('TaskScheduler', () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler();
  });

  describe('constructor', () => {
    it.skip('should create instance', () => {
      expect(scheduler).toBeDefined();
    });
  });

  describe('scheduleTask', () => {
    it.skip('should have scheduleTask method', () => {
      expect(typeof scheduler.scheduleTask).toBe('function');
    });
  });

  describe('cancelTask', () => {
    it.skip('should have cancelTask method', () => {
      expect(typeof scheduler.cancelTask).toBe('function');
    });
  });

  describe('getTaskStatus', () => {
    it.skip('should have getTaskStatus method', () => {
      expect(typeof scheduler.getTaskStatus).toBe('function');
    });
  });
});
