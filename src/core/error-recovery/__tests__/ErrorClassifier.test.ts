import { ErrorClassifier, ErrorType } from '../ErrorClassifier';

describe('ErrorClassifier', () => {
  let classifier: ErrorClassifier;

  beforeEach(() => {
    classifier = new ErrorClassifier();
  });

  describe('classify', () => {
    it('should classify syntax error', () => {
      const result = classifier.classify('SyntaxError: unexpected token');
      expect(result.type).toBe(ErrorType.SYNTAX);
    });

    it('should classify reference error', () => {
      const result = classifier.classify('ReferenceError: x is not defined');
      expect(result.type).toBe(ErrorType.REFERENCE);
    });

    it('should classify network error', () => {
      const result = classifier.classify('ECONNREFUSED connection refused');
      expect(result.type).toBe(ErrorType.NETWORK);
    });

    it('should classify timeout error', () => {
      const result = classifier.classify('TimeoutError: request timeout');
      expect(result.type).toBe(ErrorType.TIMEOUT);
    });
  });

  describe('canAutoFix', () => {
    it('should return true for syntax errors', () => {
      expect(classifier.canAutoFix(ErrorType.SYNTAX)).toBe(true);
    });

    it('should return false for unknown errors', () => {
      expect(classifier.canAutoFix('unknown' as ErrorType)).toBe(false);
    });
  });
});
