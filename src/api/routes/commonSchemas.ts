import { FastifyInstance } from 'fastify';

// Schema 定义
const schemas = {
  feedback: {
    create: {
      body: {
        type: 'object',
        required: ['type', 'content'],
        properties: {
          type: { type: 'string', enum: ['bug', 'feature', 'improvement', 'other'] },
          content: { type: 'string', minLength: 1, maxLength: 5000 },
          projectId: { type: 'string' },
        },
      },
    },
  },
  templates: {
    create: {
      body: {
        type: 'object',
        required: ['name', 'content'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          content: { type: 'string', minLength: 1 },
          category: { type: 'string' },
        },
      },
    },
  },
  batch: {
    body: {
      type: 'object',
      required: ['operation', 'ids'],
      properties: {
        operation: { type: 'string', enum: ['delete', 'update', 'archive'] },
        ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
        data: { type: 'object' },
      },
    },
  },
  export: {
    querystring: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['json', 'csv', 'markdown'], default: 'json' },
        type: { type: 'string', enum: ['projects', 'tasks', 'requirements', 'all'] },
      },
    },
  },
};

export { schemas };
