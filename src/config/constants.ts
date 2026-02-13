/**
 * Aidos 配置常量
 * 提取Magic Numbers为可维护的配置
 */

/**
 * 超时配置 (毫秒)
 */
export const TIMEOUTS = {
  /** CLI命令默认超时 */
  CLI_DEFAULT: 30000,
  
  /** 技能安装超时 */
  SKILL_INSTALL: 120000,
  
  /** 技能更新检查超时 */
  SKILL_UPDATE_CHECK: 60000,
  
  /** 技能批量更新超时 */
  SKILL_UPDATE_ALL: 180000,
  
  /** HTTP请求默认超时 */
  HTTP_DEFAULT: 30000,
  
  /** WebSocket超时 */
  WEBSOCKET: 60000,
  
  /** 数据库查询超时 */
  DATABASE_QUERY: 10000,
  
  /** 文件操作超时 */
  FILE_OPERATION: 5000,
} as const;

/**
 * 重试配置
 */
export const RETRIES = {
  /** 默认重试次数 */
  DEFAULT: 3,
  
  /** 网络请求重试次数 */
  NETWORK: 3,
  
  /** 技能加载重试次数 */
  SKILL_LOAD: 2,
  
  /** 瞬时重试次数 */
  TRANSIENT: 5,
  
  /** 重试延迟基数 (毫秒) */
  DELAY_BASE: 1000,
  
  /** 最大重试延迟 (毫秒) */
  DELAY_MAX: 10000,
  
  /** 重试延迟倍数 */
  DELAY_MULTIPLIER: 2,
} as const;

/**
 * 队列配置
 */
export const QUEUE = {
  /** 最大并发任务数 */
  MAX_CONCURRENT: 10,
  
  /** 队列最大长度 */
  MAX_SIZE: 100,
  
  /** 任务默认优先级 */
  DEFAULT_PRIORITY: 0,
  
  /** 高优先级阈值 */
  HIGH_PRIORITY_THRESHOLD: 80,
  
  /** 任务过期时间 (毫秒) */
  TASK_EXPIRY: 300000, // 5分钟
  
  /** 任务处理超时 (毫秒) */
  TASK_TIMEOUT: 120000, // 2分钟
} as const;

/**
 * 缓存配置
 */
export const CACHE = {
  /** 缓存默认TTL (秒) */
  DEFAULT_TTL: 300,
  
  /** 技能缓存TTL (秒) */
  SKILL_TTL: 3600,
  
  /** 最大缓存条目数 */
  MAX_ENTRIES: 1000,
  
  /** 缓存清理间隔 (毫秒) */
  CLEANUP_INTERVAL: 60000,
} as const;

/**
 * 日志配置
 */
export const LOG = {
  /** 日志级别 */
  LEVELS: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4,
  } as const,
  
  /** 默认日志级别 */
  DEFAULT_LEVEL: 'INFO',
  
  /** 日志保留天数 */
  RETENTION_DAYS: 7,
  
  /** 日志文件最大大小 (字节) */
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * 安全配置
 */
export const SECURITY = {
  /** 最大请求体大小 (字节) */
  MAX_REQUEST_BODY: 10 * 1024 * 1024, // 10MB
  
  /** API密钥最小长度 */
  API_KEY_MIN_LENGTH: 32,
  
  /** 会话超时 (秒) */
  SESSION_TIMEOUT: 3600,
  
  /** 密码最小长度 */
  PASSWORD_MIN_LENGTH: 8,
  
  /** 密码哈希轮数 */
  BCRYPT_ROUNDS: 10,
} as const;

/**
 * 工作流配置
 */
export const WORKFLOW = {
  /** 最大并行工作流数 */
  MAX_PARALLEL: 5,
  
  /** 工作流步骤超时 (毫秒) */
  STEP_TIMEOUT: 60000,
  
  /** 工作流总超时 (毫秒) */
  TOTAL_TIMEOUT: 300000,
  
  /** 最大重试次数 */
  MAX_RETRIES: 3,
} as const;

/**
 * 技能配置
 */
export const SKILLS = {
  /** 技能目录名称 */
  DIR_NAME: 'skills',
  
  /** 全局技能目录 */
  GLOBAL_DIR: '.config/skills',
  
  /** manifest文件名 */
  MANIFEST_FILE: 'skill.json',
  
  /** 入口文件名 */
  ENTRY_FILE: 'index.js',
  
  /** 最大标签数 */
  MAX_TAGS: 10,
  
  /** 描述最大长度 */
  MAX_DESCRIPTION_LENGTH: 500,
} as const;

/**
 * 分页配置
 */
export const PAGINATION = {
  /** 默认页大小 */
  DEFAULT_PAGE_SIZE: 20,
  
  /** 最大页大小 */
  MAX_PAGE_SIZE: 100,
  
  /** 页码从1开始 */
  PAGE_STARTS_AT: 1,
} as const;

/**
 * 速率限制配置
 */
export const RATE_LIMIT = {
  /** 默认限制次数 */
  DEFAULT_LIMIT: 100,
  
  /** 默认时间窗口 (秒) */
  DEFAULT_WINDOW: 60,
  
  /** 认证API限制 */
  AUTH_LIMIT: 10,
  
  /** 认证时间窗口 (秒) */
  AUTH_WINDOW: 60,
} as const;

/**
 * 导出所有配置为单一对象
 */
export const CONFIG = {
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
} as const;

export type TimeoutKeys = keyof typeof TIMEOUTS;
export type RetryKeys = keyof typeof RETRIES;
export type QueueKeys = keyof typeof QUEUE;
