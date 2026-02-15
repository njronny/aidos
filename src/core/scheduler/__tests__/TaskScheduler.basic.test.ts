import { TaskScheduler } from '../TaskScheduler';

describe('TaskScheduler', () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(scheduler).toBeDefined();
    });
  });

  describe('scheduleTask', () => {
    it('should have scheduleTask method', () => {
      expect(typeof scheduler.scheduleTask).toBe('function');
    });
  });

  describe('cancelTask', () => {
    it('should have cancelTask method', () => {
      expect(typeof scheduler.cancelTask).toBe('function');
    });
  });

  describe('getTaskStatus', () => {
    it('should have getTaskStatus method', () => {
      expect(typeof scheduler.getTaskStatus).toBe('function');
    });
  });
});
