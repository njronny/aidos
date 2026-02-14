/**
 * ErrorClassifier Tests - TDD
 * 
 * 测试错误分类器
 */

import { ErrorClassifier, ErrorType, ClassifiedError } from '../ErrorClassifier';

describe('ErrorClassifier', () => {
  let classifier: ErrorClassifier;

  beforeEach(() => {
    classifier = new ErrorClassifier();
  });

  describe('classify', () => {
    it('should classify syntax error', () => {
      const error = 'SyntaxError: Unexpected token';
      
      const result = classifier.classify(error);

      expect(result.type).toBe(ErrorType.SYNTAX);
    });

    it('should classify type error', () => {
      const error = 'TypeError: Cannot read property of undefined';
      
      const result = classifier.classify(error);

      expect(result.type).toBe(ErrorType.TYPE);
    });

    it('should classify reference error', () => {
      const error = 'ReferenceError: xxx is not defined';
      
      const result = classifier.classify(error);

      expect(result.type).toBe(ErrorType.REFERENCE);
    });

    it('should classify network error', () => {
      const error = 'Error: connect ECONNREFUSED';
      
      const result = classifier.classify(error);

      expect(result.type).toBe(ErrorType.NETWORK);
    });

    it('should classify timeout error', () => {
      const error = 'Error: timeout of 5000ms exceeded';
      
      const result = classifier.classify(error);

      expect(result.type).toBe(ErrorType.TIMEOUT);
    });

    it('should classify git error', () => {
      const error = 'error: failed to push some refs';
      
      const result = classifier.classify(error);

      expect(result.type).toBe(ErrorType.GIT);
    });

    it('should classify test failure', () => {
      const error = 'FAIL __tests__/example.test.ts';
      
      const result = classifier.classify(error);

      expect(result.type).toBe(ErrorType.TEST);
    });

    it('should default to unknown', () => {
      const error = 'Some random error';
      
      const result = classifier.classify(error);

      expect(result.type).toBe(ErrorType.UNKNOWN);
    });
  });

  describe('severity', () => {
    it('should assign high severity to syntax error', () => {
      const result = classifier.classify('SyntaxError');
      
      expect(result.severity).toBe('high');
    });

    it('should assign medium severity to network error', () => {
      const result = classifier.classify('ECONNREFUSED');
      
      expect(result.severity).toBe('medium');
    });
  });
});

describe('ClassifiedError', () => {
  it('should create valid classified error', () => {
    const error: ClassifiedError = {
      original: 'SyntaxError',
      type: ErrorType.SYNTAX,
      severity: 'high',
      message: 'SyntaxError',
    };

    expect(error.type).toBe(ErrorType.SYNTAX);
  });
});
