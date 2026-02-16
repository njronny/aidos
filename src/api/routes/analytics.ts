import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dataStore } from '../store';
import { Task, Project, Requirement } from '../types';

interface StatsQuery {
  startDate?: string;
  endDate?: string;
  agentId?: string;
}

// Schema 定义
const analyticsSchemas = {
  query: {
    querystring: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        agentId: { type: 'string' },
        projectId: { type: 'string' },
      },
    },
  },
};

export async function analyticsRoutes(fastify: FastifyInstance) {
  // GET /api/analytics/summary - 综合统计
  fastify.get('/analytics/summary', async (request, reply) => {
    const projects = await dataStore.getAllProjects();
    const requirements = await dataStore.getAllRequirements();
    const tasks = await dataStore.getAllTasks();
    const agents = await dataStore.getAllAgents();

    const completedTasks = tasks.filter(t => t.status === 'completed');
    const failedTasks = tasks.filter(t => t.status === 'failed');

    // 按日期统计任务完成情况
    const taskByDate = new Map<string, { completed: number; failed: number }>();
    completedTasks.forEach(t => {
      const date = new Date(t.updatedAt).toISOString().split('T')[0];
      const existing = taskByDate.get(date) || { completed: 0, failed: 0 };
      existing.completed++;
      taskByDate.set(date, existing);
    });
    failedTasks.forEach(t => {
      const date = new Date(t.updatedAt).toISOString().split('T')[0];
      const existing = taskByDate.get(date) || { completed: 0, failed: 0 };
      existing.failed++;
      taskByDate.set(date, existing);
    });

    // 代理效率排名
    const agentStats = agents.map(agent => {
      const agentTasks = tasks.filter(t => t.agentId === agent.id);
      const completed = agentTasks.filter(t => t.status === 'completed').length;
      const total = agentTasks.length;
      return {
        id: agent.id,
        name: agent.name,
        completed,
        total,
        efficiency: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    }).sort((a, b) => b.efficiency - a.efficiency);

    // 项目进度
    const projectProgress = projects.map(project => {
      const projectReqs = requirements.filter(r => r.projectId === project.id);
      const reqIds = projectReqs.map(r => r.id);
      const projectTasks = tasks.filter(t => reqIds.includes(t.requirementId));
      
      const completed = projectTasks.filter(t => t.status === 'completed').length;
      const total = projectTasks.length;
      
      return {
        id: project.id,
        name: project.name,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        completed,
        total,
      };
    });

    return {
      success: true,
      data: {
        overview: {
          projects: projects.length,
          requirements: requirements.length,
          tasks: tasks.length,
          agents: agents.length,
        },
        successRate: tasks.length > 0 
          ? Math.round((completedTasks.length / tasks.length) * 100) 
          : 0,
        taskByDate: Array.from(taskByDate.entries()).map(([date, stats]) => ({
          date,
          ...stats,
        })).sort((a, b) => a.date.localeCompare(b.date)).slice(-14),
        agentStats,
        projectProgress,
      },
    };
  });

  // GET /api/analytics/tasks - 任务趋势
  fastify.get('/analytics/tasks', async (request: FastifyRequest<{ Querystring: StatsQuery }>, reply) => {
    const { startDate, endDate } = request.query;

    let tasks = await dataStore.getAllTasks();
    
    if (startDate) {
      tasks = tasks.filter(t => new Date(t.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      tasks = tasks.filter(t => new Date(t.createdAt) <= new Date(endDate));
    }

    // 按状态分组
    const byStatus = {
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress' || t.status === 'assigned').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };

    // 按日期分组 (最近7天)
    const last7Days: Record<string, { created: number; completed: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days[dateStr] = { created: 0, completed: 0 };
    }

    tasks.forEach(t => {
      const date = new Date(t.createdAt).toISOString().split('T')[0];
      if (last7Days[date]) {
        last7Days[date].created++;
      }
      if (t.status === 'completed') {
        const updateDate = new Date(t.updatedAt).toISOString().split('T')[0];
        if (last7Days[updateDate]) {
          last7Days[updateDate].completed++;
        }
      }
    });

    return {
      success: true,
      data: {
        byStatus,
        trend: Object.entries(last7Days).map(([date, stats]) => ({ date, ...stats })),
      },
    };
  });

  // GET /api/analytics/performance - 性能指标
  fastify.get('/analytics/performance', async (request, reply) => {
    const tasks = await dataStore.getAllTasks();
    const agents = await dataStore.getAllAgents();

    // 计算平均任务完成时间
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.result);
    const avgTime = completedTasks.length > 0 
      ? Math.round(completedTasks.reduce((sum, t) => {
          const created = new Date(t.createdAt).getTime();
          const updated = new Date(t.updatedAt).getTime();
          return sum + (updated - created);
        }, 0) / completedTasks.length / 1000 / 60) // minutes
      : 0;

    // 代理负载
    const agentLoad = agents.map(agent => {
      const activeTasks = tasks.filter(t => t.agentId === agent.id && t.status === 'in_progress').length;
      const totalTasks = tasks.filter(t => t.agentId === agent.id).length;
      return {
        id: agent.id,
        name: agent.name,
        active: activeTasks,
        total: totalTasks,
        load: totalTasks > 0 ? Math.round((activeTasks / totalTasks) * 100) : 0,
      };
    });

    // 任务类型分布
    const tasksByTitle = new Map<string, number>();
    tasks.forEach(t => {
      const key = t.title.split(' ')[0] || '其他';
      tasksByTitle.set(key, (tasksByTitle.get(key) || 0) + 1);
    });

    return {
      success: true,
      data: {
        avgCompletionTime: avgTime,
        totalTasks: tasks.length,
        completedRate: tasks.length > 0 
          ? Math.round((completedTasks.length / tasks.length) * 100) 
          : 0,
        agentLoad,
        taskTypes: Array.from(tasksByTitle.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      },
    };
  });
}
