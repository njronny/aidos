import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CodeQualityService, codeQualityService } from '../../core/quality/CodeQualityService';

interface QualityQuery {
  type?: 'lint' | 'types' | 'security' | 'unused' | 'full';
}

export async function qualityRoutes(fastify: FastifyInstance) {
  const service: CodeQualityService = (fastify as any).codeQualityService || codeQualityService;

  // GET /api/quality/check - 代码质量检查
  fastify.get('/quality/check', async (request: FastifyRequest<{ Querystring: QualityQuery }>, reply) => {
    const { type = 'full' } = request.query;

    try {
      let report;

      switch (type) {
        case 'lint':
          const lintIssues = await service.runLint();
          report = {
            timestamp: new Date(),
            issues: lintIssues,
            summary: {
              errors: lintIssues.filter(i => i.severity === 'error').length,
              warnings: lintIssues.filter(i => i.severity === 'warning').length,
              info: lintIssues.filter(i => i.severity === 'info').length,
              score: Math.max(0, 100 - lintIssues.filter(i => i.severity === 'error').length * 10),
            },
            passed: lintIssues.filter(i => i.severity === 'error').length === 0,
          };
          break;

        case 'types':
          const typeIssues = await service.runTypeCheck();
          report = {
            timestamp: new Date(),
            issues: typeIssues,
            summary: {
              errors: typeIssues.length,
              warnings: 0,
              info: 0,
              score: Math.max(0, 100 - typeIssues.length * 10),
            },
            passed: typeIssues.length === 0,
          };
          break;

        case 'security':
          const securityIssues = await service.runSecurityScan();
          report = {
            timestamp: new Date(),
            issues: securityIssues,
            summary: {
              errors: securityIssues.length,
              warnings: 0,
              info: 0,
              score: Math.max(0, 100 - securityIssues.length * 20),
            },
            passed: securityIssues.length === 0,
          };
          break;

        case 'unused':
          const unusedIssues = await service.checkUnusedCode();
          report = {
            timestamp: new Date(),
            issues: unusedIssues,
            summary: {
              errors: 0,
              warnings: unusedIssues.length,
              info: 0,
              score: Math.max(0, 100 - unusedIssues.length * 2),
            },
            passed: true,
          };
          break;

        case 'full':
        default:
          report = await service.runFullCheck();
          break;
      }

      return {
        success: true,
        data: report,
      };
    } catch (error: any) {
      console.error('[Quality] Check failed:', error);
      return {
        success: false,
        error: error.message || 'Quality check failed',
      };
    }
  });

  // GET /api/quality/summary - 质量摘要
  fastify.get('/quality/summary', async (request, reply) => {
    try {
      const report = await service.runFullCheck();
      
      return {
        success: true,
        data: {
          passed: report.passed,
          score: report.summary.score,
          issues: {
            errors: report.summary.errors,
            warnings: report.summary.warnings,
            info: report.summary.info,
          },
          timestamp: report.timestamp,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });
}
