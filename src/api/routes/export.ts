import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dataStore } from '../store';

interface ExportQuery {
  format?: 'json' | 'csv';
  type?: 'tasks' | 'projects' | 'requirements';
  status?: string;
}

export async function exportRoutes(fastify: FastifyInstance) {
  // GET /api/export - 导出数据
  fastify.get('/export', async (request: FastifyRequest<{ Querystring: ExportQuery }>, reply) => {
    const { format = 'json', type = 'tasks', status } = request.query;

    let data: any[] = [];

    switch (type) {
      case 'projects':
        data = await dataStore.getAllProjects();
        break;
      case 'requirements':
        data = await dataStore.getAllRequirements();
        if (status) {
          data = data.filter((r: any) => r.status === status);
        }
        break;
      case 'tasks':
      default:
        data = await dataStore.getAllTasks();
        if (status) {
          data = data.filter((t: any) => t.status === status);
        }
        break;
    }

    // JSON format
    if (format === 'json') {
      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="${type}_${Date.now()}.json"`);
      return { success: true, data, total: data.length, exportedAt: new Date().toISOString() };
    }

    // CSV format
    if (format === 'csv' && data.length > 0) {
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      
      for (const row of data) {
        const values = headers.map(header => {
          const val = row[header];
          const escaped = String(val ?? '').replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
      }

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="${type}_${Date.now()}.csv"`);
      return csvRows.join('\n');
    }

    return { success: false, error: 'No data to export' };
  });

  // GET /api/export/projects - 导出项目
  fastify.get('/export/projects', async (request: FastifyRequest<{ Querystring: { format?: 'json' | 'csv' } }>, reply) => {
    const { format = 'json' } = request.query;
    const projects = await dataStore.getAllProjects();

    if (format === 'csv') {
      const headers = ['id', 'name', 'description', 'status', 'createdAt', 'updatedAt'];
      const rows = [headers.join(',')];
      
      for (const p of projects) {
        const vals = headers.map(h => `"${String(p[h as keyof typeof p] ?? '').replace(/"/g, '""')}"`);
        rows.push(vals.join(','));
      }
      
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="projects.csv"');
      return rows.join('\n');
    }

    return { success: true, data: projects };
  });

  // GET /api/export/tasks - 导出任务
  fastify.get('/export/tasks', async (request: FastifyRequest<{ Querystring: { format?: 'json' | 'csv'; status?: string } }>, reply) => {
    const { format = 'json', status } = request.query;
    let tasks = await dataStore.getAllTasks();
    
    if (status) {
      tasks = tasks.filter((t: any) => t.status === status);
    }

    if (format === 'csv') {
      const headers = ['id', 'title', 'description', 'status', 'priority', 'agentId', 'result', 'createdAt', 'updatedAt'];
      const rows = [headers.join(',')];
      
      for (const t of tasks) {
        const vals = headers.map(h => {
          const val = h === 'result' ? '' : String(t[h as keyof typeof t] ?? '');
          return `"${val.replace(/"/g, '""')}"`;
        });
        rows.push(vals.join(','));
      }
      
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="tasks.csv"');
      return rows.join('\n');
    }

    return { success: true, data: tasks };
  });
}
