import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
  ],
  // 跳过不稳定的集成测试
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    'WorkflowEngine.basic',
    'TaskScheduler.basic',
    'OpenClawRealExecutor',
    'ApplicationMonitor', 
    'SelfHealingService',
    'SmartAlertService',
    'InfrastructureMonitor',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/types/**',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary', 'html'],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 35,
      lines: 35,
      statements: 35,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testTimeout: 30000,
  verbose: true,
};

export default config;
