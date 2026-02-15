import { Notifier } from '../Notifier';

describe('Notifier', () => {
  let notifier: Notifier;

  beforeEach(() => {
    notifier = new Notifier();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(notifier).toBeDefined();
    });
  });

  describe('notify', () => {
    it('should have notify method', () => {
      expect(typeof notifier.notify).toBe('function');
    });
  });

  describe('notifyCompletion', () => {
    it('should have notifyCompletion method', () => {
      expect(typeof notifier.notifyCompletion).toBe('function');
    });
  });

  describe('notifyError', () => {
    it('should have notifyError method', () => {
      expect(typeof notifier.notifyError).toBe('function');
    });
  });
});
