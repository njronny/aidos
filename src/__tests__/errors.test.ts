/**
 * 错误处理工具单元测试
 */
import {
  AppError,
  ConfigError,
  SkillLoadError,
  JSONParseError,
  SecurityError,
  NetworkError,
  TimeoutError,
  FileSystemError,
  ValidationError,
  GeneralError,
  safeJSONParse,
  createErrorHandler,
} from '../utils/errors';

describe('AppError基类测试', () => {
  // AppError是抽象类，我们通过其子类来测试基本功能
  
  test('ConfigError应该正确设置基本属性', () => {
    const error = new ConfigError('测试错误', { extra: 'data' });
    
    expect(error.message).toBe('测试错误');
    expect(error.code).toBe('CONFIG_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.details).toEqual({ extra: 'data' });
    expect(error.timestamp).toBeInstanceOf(Date);
    expect(error.name).toBe('ConfigError');
  });

  test('子类实例应该有正确的继承关系', () => {
    const error = new ConfigError('测试');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  test('ConfigError应该继承AppError', () => {
    const error = new ConfigError('配置错误', { key: 'test' });
    
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('CONFIG_ERROR');
    expect(error.statusCode).toBe(500);
  });

  test('SkillLoadError应该包含skillId', () => {
    const error = new SkillLoadError('加载失败', 'skill-123', { path: '/test' });
    
    expect(error).toBeInstanceOf(AppError);
    expect(error.skillId).toBe('skill-123');
    expect(error.code).toBe('SKILL_LOAD_ERROR');
  });

  test('JSONParseError应该包含原始内容信息', () => {
    const content = '{"invalid": json}';
    const error = new JSONParseError('解析失败', content, 15);
    
    expect(error).toBeInstanceOf(AppError);
    expect(error.rawContent).toBe('{"invalid": json}');
    expect(error.position).toBe(15);
    expect(error.code).toBe('JSON_PARSE_ERROR');
  });

  test('SecurityError应该包含blockedOperation', () => {
    const error = new SecurityError('操作被阻止', 'exec:shell');
    
    expect(error).toBeInstanceOf(AppError);
    expect(error.blockedOperation).toBe('exec:shell');
    expect(error.code).toBe('SECURITY_ERROR');
    expect(error.statusCode).toBe(403);
  });

  test('NetworkError应该包含网络信息', () => {
    const error = new NetworkError('请求失败', 'https://api.test', 500);
    
    expect(error).toBeInstanceOf(AppError);
    expect(error.url).toBe('https://api.test');
    expect(error.statusCode).toBe(500);
  });

  test('TimeoutError应该包含超时信息', () => {
    const error = new TimeoutError('操作超时', 5000, 'api_call');
    
    expect(error).toBeInstanceOf(AppError);
    expect(error.timeout).toBe(5000);
    expect(error.operation).toBe('api_call');
  });

  test('FileSystemError应该包含路径信息', () => {
    const error = new FileSystemError('文件不存在', '/path/to/file', 'read');
    
    expect(error).toBeInstanceOf(AppError);
    expect(error.path).toBe('/path/to/file');
    expect(error.operation).toBe('read');
  });

  test('ValidationError应该包含字段信息', () => {
    const error = new ValidationError('字段验证失败', 'email');
    
    expect(error).toBeInstanceOf(AppError);
    expect(error.field).toBe('email');
    expect(error.statusCode).toBe(400);
  });

  test('错误类的toJSON()应该返回正确的JSON结构', () => {
    const error = new ConfigError('测试', { extra: 1 });
    const json = error.toJSON();
    
    expect(json.name).toBe('ConfigError');
    expect(json.message).toBe('测试');
    expect(json.code).toBe('CONFIG_ERROR');
    expect(json.statusCode).toBe(500);
    expect(json.details).toEqual({ extra: 1 });
    expect(json.timestamp).toBeDefined();
  });
});

describe('safeJSONParse', () => {
  test('应该成功解析有效JSON', () => {
    const json = '{"name": "test", "value": 123}';
    const result = safeJSONParse(json);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'test', value: 123 });
    }
  });

  test('应该成功解析JSON数组', () => {
    const json = '[1, 2, 3, "test"]';
    const result = safeJSONParse<string[]>(json);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([1, 2, 3, 'test']);
    }
  });

  test('应该正确处理无效JSON', () => {
    const json = '{invalid json}';
    const result = safeJSONParse(json, { fallback: true });
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(JSONParseError);
      expect(result.error.code).toBe('JSON_PARSE_ERROR');
    }
  });

  test('应该抛出JSONParseError当没有fallback', () => {
    const json = '{broken';
    
    expect(() => safeJSONParse(json)).toThrow(JSONParseError);
  });

  test('应该正确处理空字符串', () => {
    const result = safeJSONParse('', { default: true });
    
    expect(result.success).toBe(false);
  });

  test('应该正确处理特殊JSON值', () => {
    expect(safeJSONParse('null').success).toBe(true);
    expect(safeJSONParse('true').success).toBe(true);
    expect(safeJSONParse('"string"').success).toBe(true);
    expect(safeJSONParse('123').success).toBe(true);
  });
});

describe('createErrorHandler', () => {
  test('createErrorHandler应该包装AppError', () => {
    const handler = createErrorHandler('处理错误');
    const configError = new ConfigError('test');
    
    const result = handler(configError);
    
    expect(result).toBe(configError);
  });

  test('应该包装普通Error', () => {
    const handler = createErrorHandler('处理错误');
    const error = new Error('普通错误');
    
    const result = handler(error);
    
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('普通错误');
  });

  test('应该包装SyntaxError为JSONParseError', () => {
    const handler = createErrorHandler();
    const error = new SyntaxError('Unexpected token');
    
    const result = handler(error);
    
    expect(result).toBeInstanceOf(JSONParseError);
  });

  test('应该处理非Error对象', () => {
    const handler = createErrorHandler('默认错误');
    
    const result = handler('string error');
    
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('默认错误');
  });
});
