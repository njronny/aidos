// 国际化模块

export type Locale = 'en' | 'zh-CN';

const translations: Record<Locale, Record<string, string>> = {
  'en': {
    // Common
    'common.success': 'Success',
    'common.error': 'Error',
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    
    // Auth
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.invalid': 'Invalid username or password',
    'auth.token_expired': 'Token expired, please login again',
    
    // Projects
    'project.create': 'Create Project',
    'project.name': 'Project Name',
    'project.description': 'Description',
    'project.status': 'Status',
    'project.no_projects': 'No projects yet',
    
    // Tasks
    'task.create': 'Create Task',
    'task.title': 'Task Title',
    'task.status': 'Status',
    'task.pending': 'Pending',
    'task.in_progress': 'In Progress',
    'task.completed': 'Completed',
    'task.failed': 'Failed',
  },
  
  'zh-CN': {
    // Common
    'common.success': '成功',
    'common.error': '错误',
    'common.loading': '加载中...',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.create': '创建',
    'common.search': '搜索',
    
    // Auth
    'auth.login': '登录',
    'auth.logout': '登出',
    'auth.username': '用户名',
    'auth.password': '密码',
    'auth.invalid': '用户名或密码错误',
    'auth.token_expired': 'Token已过期，请重新登录',
    
    // Projects
    'project.create': '创建项目',
    'project.name': '项目名称',
    'project.description': '描述',
    'project.status': '状态',
    'project.no_projects': '暂无项目',
    
    // Tasks
    'task.create': '创建任务',
    'task.title': '任务标题',
    'task.status': '状态',
    'task.pending': '待处理',
    'task.in_progress': '进行中',
    'task.completed': '已完成',
    'task.failed': '失败',
  },
};

// 获取当前语言
let currentLocale: Locale = 'zh-CN';

// 初始化语言设置
export function initI18n(locale?: Locale) {
  if (locale && translations[locale]) {
    currentLocale = locale;
  } else {
    // 从请求头检测语言
    const browserLocale = navigator.language || (navigator as any).userLanguage;
    if (browserLocale.startsWith('en')) {
      currentLocale = 'en';
    }
  }
}

// 翻译函数
export function t(key: string, params?: Record<string, string>): string {
  let text = translations[currentLocale][key] || translations['en'][key] || key;
  
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
  }
  
  return text;
}

// 获取当前语言
export function getLocale(): Locale {
  return currentLocale;
}

// 设置语言
export function setLocale(locale: Locale) {
  currentLocale = locale;
}

// 导出所有支持的语言
export const supportedLocales: Locale[] = ['en', 'zh-CN'];
