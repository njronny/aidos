import { InputValidator, ValidationSchema, ValidationRule } from '../InputValidator';

describe('InputValidator', () => {
  describe('constructor', () => {
    it('should create instance with schema', () => {
      const schema: ValidationSchema = { rules: [] };
      const validator = new InputValidator(schema);
      expect(validator).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should return empty array for valid data', () => {
      const schema: ValidationSchema = { 
        rules: [
          { field: 'name', type: 'string', required: true }
        ] 
      };
      const validator = new InputValidator(schema);
      const errors = validator.validate({ name: 'test' });
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBe(0);
    });

    it('should return errors for missing required field', () => {
      const schema: ValidationSchema = { 
        rules: [
          { field: 'name', type: 'string', required: true }
        ] 
      };
      const validator = new InputValidator(schema);
      const errors = validator.validate({});
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate email format', () => {
      const schema: ValidationSchema = { 
        rules: [
          { field: 'email', type: 'email' }
        ] 
      };
      const validator = new InputValidator(schema);
      const errors = validator.validate({ email: 'invalid' });
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
