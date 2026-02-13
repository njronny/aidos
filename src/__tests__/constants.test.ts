/**
 * 配置常量单元测试
 */
import {
  TIMEOUTS,
  RETRIES,
  QUEUE,
  CACHE,
  LOG,
  SECURITY,
  WORKFLOW,
  SKILLS,
  PAGINATION,
  RATE_LIMIT,
  CONFIG,
} from '../config/constants';

describe('TIMEOUTS', () => {
  test('应该包含所有必需的超时配置', () => {
    expect(TIMEOUTS.CLI_DEFAULT).toBe(30000);
    expect(TIMEOUTS.SKILL_INSTALL).toBe(120000);
    expect(TIMEOUTS.SKILL_UPDATE_CHECK).toBe(60000);
    expect(TIMEOUTS.SKILL_UPDATE_ALL).toBe(180000);
    expect(TIMEOUTS.HTTP_DEFAULT).toBe(30000);
    expect(TIMEOUTS.WEBSOCKET).toBe(60000);
    expect(TIMEOUTS.DATABASE_QUERY).toBe(10000);
    expect(TIMEOUTS.FILE_OPERATION).toBe(5000);
  });

  test('超时值应该为正数', () => {
    Object.values(TIMEOUTS).forEach(timeout => {
      expect(timeout).toBeGreaterThan(0);
    });
  });
});

describe('RETRIES', () => {
  test('应该包含所有必需的重试配置', () => {
    expect(RETRIES.DEFAULT).toBe(3);
    expect(RETRIES.NETWORK).toBe(3);
    expect(RETRIES.SKILL_LOAD).toBe(2);
    expect(RETRIES.TRANSIENT).toBe(5);
    expect(RETRIES.DELAY_BASE).toBe(1000);
    expect(RETRIES.DELAY_MAX).toBe(10000);
    expect(RETRIES.DELAY_MULTIPLIER).toBe(2);
  });

  test('重试次数应该为正整数', () => {
    expect(Number.isInteger(RETRIES.DEFAULT)).toBe(true);
    expect(Number.isInteger(RETRIES.NETWORK)).toBe(true);
    expect(RETRIES.DEFAULT).toBeGreaterThan(0);
  });
});

describe('QUEUE', () => {
  test('应该包含所有必需的队列配置', () => {
    expect(QUEUE.MAX_CONCURRENT).toBe(10);
    expect(QUEUE.MAX_SIZE).toBe(100);
    expect(QUEUE.DEFAULT_PRIORITY).toBe(0);
    expect(QUEUE.HIGH_PRIORITY_THRESHOLD).toBe(80);
    expect(QUEUE.TASK_EXPIRY).toBe(300000);
    expect(QUEUE.TASK_TIMEOUT).toBe(120000);
  });

  test('MAX_CONCURRENT应该大于0', () => {
    expect(QUEUE.MAX_CONCURRENT).toBeGreaterThan(0);
  });
});

describe('CACHE', () => {
  test('应该包含所有必需的缓存配置', () => {
    expect(CACHE.DEFAULT_TTL).toBe(300);
    expect(CACHE.SKILL_TTL).toBe(3600);
    expect(CACHE.MAX_ENTRIES).toBe(1000);
    expect(CACHE.CLEANUP_INTERVAL).toBe(60000);
  });

  test('TTL值应该为正数', () => {
    expect(CACHE.DEFAULT_TTL).toBeGreaterThan(0);
    expect(CACHE.SKILL_TTL).toBeGreaterThan(0);
  });
});

describe('LOG', () => {
  test('应该包含日志级别', () => {
    expect(LOG.LEVELS.ERROR).toBe(0);
    expect(LOG.LEVELS.WARN).toBe(1);
    expect(LOG.LEVELS.INFO).toBe(2);
    expect(LOG.LEVELS.DEBUG).toBe(3);
    expect(LOG.LEVELS.TRACE).toBe(4);
  });

  test('日志级别应该递增', () => {
    const levels = [LOG.LEVELS.ERROR, LOG.LEVELS.WARN, LOG.LEVELS.INFO, LOG.LEVELS.DEBUG, LOG.LEVELS.TRACE];
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThan(levels[i - 1]);
    }
  });

  test('应该包含其他日志配置', () => {
    expect(LOG.DEFAULT_LEVEL).toBe('INFO');
    expect(LOG.RETENTION_DAYS).toBe(7);
    expect(LOG.MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
  });
});

describe('SECURITY', () => {
  test('应该包含所有安全配置', () => {
    expect(SECURITY.MAX_REQUEST_BODY).toBe(10 * 1024 * 1024);
    expect(SECURITY.API_KEY_MIN_LENGTH).toBe(32);
    expect(SECURITY.SESSION_TIMEOUT).toBe(3600);
    expect(SECURITY.PASSWORD_MIN_LENGTH).toBe(8);
    expect(SECURITY.BCRYPT_ROUNDS).toBe(10);
  });

  test('BCRYPT_ROUNDS应该合理', () => {
    expect(SECURITY.BCRYPT_ROUNDS).toBeGreaterThanOrEqual(8);
    expect(SECURITY.BCRYPT_ROUNDS).toBeLessThanOrEqual(15);
  });
});

describe('WORKFLOW', () => {
  test('应该包含工作流配置', () => {
    expect(WORKFLOW.MAX_PARALLEL).toBe(5);
    expect(WORKFLOW.STEP_TIMEOUT).toBe(60000);
    expect(WORKFLOW.TOTAL_TIMEOUT).toBe(300000);
    expect(WORKFLOW.MAX_RETRIES).toBe(3);
  });

  test('TOTAL_TIMEOUT应该大于STEP_TIMEOUT', () => {
    expect(WORKFLOW.TOTAL_TIMEOUT).toBeGreaterThan(WORKFLOW.STEP_TIMEOUT);
  });
});

describe('SKILLS', () => {
  test('应该包含技能配置', () => {
    expect(SKILLS.DIR_NAME).toBe('skills');
    expect(SKILLS.GLOBAL_DIR).toBe('.config/skills');
    expect(SKILLS.MANIFEST_FILE).toBe('skill.json');
    expect(SKILLS.ENTRY_FILE).toBe('index.js');
    expect(SKILLS.MAX_TAGS).toBe(10);
    expect(SKILLS.MAX_DESCRIPTION_LENGTH).toBe(500);
  });
});

describe('PAGINATION', () => {
  test('应该包含分页配置', () => {
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(20);
    expect(PAGINATION.MAX_PAGE_SIZE).toBe(100);
    expect(PAGINATION.PAGE_STARTS_AT).toBe(1);
  });

  test('DEFAULT_PAGE_SIZE应该小于MAX_PAGE_SIZE', () => {
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBeLessThan(PAGINATION.MAX_PAGE_SIZE);
  });
});

describe('RATE_LIMIT', () => {
  test('应该包含速率限制配置', () => {
    expect(RATE_LIMIT.DEFAULT_LIMIT).toBe(100);
    expect(RATE_LIMIT.DEFAULT_WINDOW).toBe(60);
    expect(RATE_LIMIT.AUTH_LIMIT).toBe(10);
    expect(RATE_LIMIT.AUTH_WINDOW).toBe(60);
  });

  test('AUTH_LIMIT应该小于DEFAULT_LIMIT', () => {
    expect(RATE_LIMIT.AUTH_LIMIT).toBeLessThan(RATE_LIMIT.DEFAULT_LIMIT);
  });
});

describe('CONFIG', () => {
  test('应该导出所有配置组', () => {
    expect(CONFIG.TIMEOUTS).toBe(TIMEOUTS);
    expect(CONFIG.RETRIES).toBe(RETRIES);
    expect(CONFIG.QUEUE).toBe(QUEUE);
    expect(CONFIG.CACHE).toBe(CACHE);
    expect(CONFIG.LOG).toBe(LOG);
    expect(CONFIG.SECURITY).toBe(SECURITY);
    expect(CONFIG.WORKFLOW).toBe(WORKFLOW);
    expect(CONFIG.SKILLS).toBe(SKILLS);
    expect(CONFIG.PAGINATION).toBe(PAGINATION);
    expect(CONFIG.RATE_LIMIT).toBe(RATE_LIMIT);
  });
});
