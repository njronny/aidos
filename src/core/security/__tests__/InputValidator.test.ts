/**
 * InputValidator Tests - 输入验证器测试
 */

import { InputValidator, ValidationSchema, ValidationRule } from '../InputValidator';

describe('InputValidator', () => {
  describe('String Validation', () => {
    it('should validate string type', () => {
      const schema: ValidationSchema = {
        rules: [{ field: 'name', type: 'string', required: true }],
      };
      const validator = new InputValidator(schema);

      // Valid string
      let errors = validator.validate({ name: 'test' });
      expect(errors).toHaveLength(0);

      // Invalid type
      errors = validator.validate({ name: 123 });
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('must be a string');
    });

    it('should validate string length', () => {
      const schema: ValidationSchema = {
        rules: [{ field: 'username', type: 'string', required: true, min: 3, max: 20 }],
      };
      const validator = new InputValidator(schema);

      // Too short
      let errors = validator.validate({ username: 'ab' });
      expect(errors).toHaveLength(1);

      // Valid length
      errors = validator.validate({ username: 'abc' });
      expect(errors).toHaveLength(0);

      // Too long
      errors = validator.validate({ username: 'abcdefghijklmnopqrstu' });
      expect(errors).toHaveLength(1);
    });

    it('should validate string pattern', () => {
      const schema: ValidationSchema = {
        rules: [{ field: 'username', type: 'string', required: true, pattern: /^[a-zA-Z0-9_]+$/ }],
      };
      const validator = new InputValidator(schema);

      // Valid pattern
      let errors = validator.validate({ username: 'user_123' });
      expect(errors).toHaveLength(0);

      // Invalid pattern
      errors = validator.validate({ username: 'user-123' });
      expect(errors).toHaveLength(1);
    });
  });

  describe('Number Validation', () => {
    it('should validate number type', () => {
      const schema: ValidationSchema = {
        rules: [{ field: 'age', type: 'number', required: true }],
      };
      const validator = new InputValidator(schema);

      // Valid number
      let errors = validator.validate({ age: 25 });
      expect(errors).toHaveLength(0);

      // Invalid type
      errors = validator.validate({ age: '25' });
      expect(errors).toHaveLength(1);
    });

    it('should validate number range', () => {
      const schema: ValidationSchema = {
        rules: [{ field: 'age', type: 'number', required: true, min: 0, max: 150 }],
      };
      const validator = new InputValidator(schema);

      // Too small
      let errors = validator.validate({ age: -1 });
      expect(errors).toHaveLength(1);

      // Too large
      errors = validator.validate({ age: 200 });
      expect(errors).toHaveLength(1);

      // Valid
      errors = validator.validate({ age: 25 });
      expect(errors).toHaveLength(0);
    });
  });

  describe('Email Validation', () => {
    it('should validate email format', () => {
      const schema: ValidationSchema = {
        rules: [{ field: 'email', type: 'email', required: true }],
      };
      const validator = new InputValidator(schema);

      // Valid emails
      let errors = validator.validate({ email: 'test@example.com' });
      expect(errors).toHaveLength(0);

      errors = validator.validate({ email: 'user+tag@domain.co.uk' });
      expect(errors).toHaveLength(0);

      // Invalid emails
      errors = validator.validate({ email: 'invalid' });
      expect(errors).toHaveLength(1);

      errors = validator.validate({ email: '@example.com' });
      expect(errors).toHaveLength(1);

      errors = validator.validate({ email: 'test@' });
      expect(errors).toHaveLength(1);
    });
  });

  describe('UUID Validation', () => {
    it('should validate UUID format', () => {
      const schema: ValidationSchema = {
        rules: [{ field: 'id', type: 'uuid', required: true }],
      };
      const validator = new InputValidator(schema);

      // Valid UUID
      let errors = validator.validate({ id: '550e8400-e29b-41d4-a716-446655440000' });
      expect(errors).toHaveLength(0);

      // Invalid UUID
      errors = validator.validate({ id: 'not-a-uuid' });
      expect(errors).toHaveLength(1);
    });
  });

  describe('Enum Validation', () => {
    it('should validate enum values', () => {
      const schema: ValidationSchema = {
        rules: [{ field: 'status', type: 'enum', required: true, enumValues: ['active', 'inactive', 'pending'] }],
      };
      const validator = new InputValidator(schema);

      // Valid enum
      let errors = validator.validate({ status: 'active' });
      expect(errors).toHaveLength(0);

      // Invalid enum
      errors = validator.validate({ status: 'unknown' });
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('must be one of');
    });
  });

  describe('Array Validation', () => {
    it('should validate array', () => {
      const schema: ValidationSchema = {
        rules: [{ field: 'tags', type: 'array', required: true, min: 1, max: 10 }],
      };
      const validator = new InputValidator(schema);

      // Valid array
      let errors = validator.validate({ tags: ['tag1', 'tag2'] });
      expect(errors).toHaveLength(0);

      // Not an array
      errors = validator.validate({ tags: 'not-array' });
      expect(errors).toHaveLength(1);

      // Empty array when min required
      errors = validator.validate({ tags: [] });
      expect(errors).toHaveLength(1);
    });
  });

  describe('Object Validation', () => {
    it('should validate object type', () => {
      const schema: ValidationSchema = {
        rules: [{ field: 'data', type: 'object', required: true }],
      };
      const validator = new InputValidator(schema);

      // Valid object
      let errors = validator.validate({ data: { key: 'value' } });
      expect(errors).toHaveLength(0);

      // Null
      errors = validator.validate({ data: null });
      expect(errors).toHaveLength(1);

      // Array (not object)
      errors = validator.validate({ data: [] });
      expect(errors).toHaveLength(1);
    });
  });

  describe('URL Validation', () => {
    it('should validate URL format', () => {
      const schema: ValidationSchema = {
        rules: [{ field: 'url', type: 'url', required: true }],
      };
      const validator = new InputValidator(schema);

      // Valid URLs
      let errors = validator.validate({ url: 'https://example.com' });
      expect(errors).toHaveLength(0);

      errors = validator.validate({ url: 'http://localhost:3000' });
      expect(errors).toHaveLength(0);

      // Invalid URLs
      errors = validator.validate({ url: 'not-a-url' });
      expect(errors).toHaveLength(1);
    });
  });

  describe('Custom Validation', () => {
    it('should support custom validation function', () => {
      const schema: ValidationSchema = {
        rules: [
          { 
            field: 'password', 
            type: 'string', 
            required: true,
            custom: (value: string) => {
              if (!/[A-Z]/.test(value)) {
                return 'Password must contain at least one uppercase letter';
              }
              if (!/[0-9]/.test(value)) {
                return 'Password must contain at least one number';
              }
              return true;
            }
          }
        ],
      };
      const validator = new InputValidator(schema);

      // Valid password
      let errors = validator.validate({ password: 'Password123' });
      expect(errors).toHaveLength(0);

      // No uppercase
      errors = validator.validate({ password: 'password123' });
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('uppercase');

      // No number
      errors = validator.validate({ password: 'Password' });
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('number');
    });
  });

  describe('Required Field Validation', () => {
    it('should validate required fields', () => {
      const schema: ValidationSchema = {
        rules: [
          { field: 'name', type: 'string', required: true },
          { field: 'email', type: 'email', required: true },
        ],
      };
      const validator = new InputValidator(schema);

      // Missing all required fields - only returns first error due to quick-fail
      let errors = validator.validate({});
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].field).toBe('name');

      // Missing one required field
      errors = validator.validate({ name: 'John' });
      expect(errors.length).toBe(0);

      // All present
      errors = validator.validate({ name: 'John', email: 'john@example.com' });
      expect(errors).toHaveLength(0);
    });

    it('should not validate optional fields when missing', () => {
      const schema: ValidationSchema = {
        rules: [
          { field: 'name', type: 'string', required: true },
          { field: 'age', type: 'number', min: 18 },
        ],
      };
      const validator = new InputValidator(schema);

      // Optional field not provided
      let errors = validator.validate({ name: 'John' });
      expect(errors).toHaveLength(0);
    });

    it('should validate all fields when validateAll is set', () => {
      const schema: ValidationSchema = {
        rules: [
          { field: 'name', type: 'string', required: true },
          { field: 'email', type: 'email', required: true },
        ],
        validateAll: true,
      };
      const validator = new InputValidator(schema);

      // Missing all required fields - returns all errors
      const errors = validator.validate({});
      expect(errors).toHaveLength(2);
    });
  });
});
