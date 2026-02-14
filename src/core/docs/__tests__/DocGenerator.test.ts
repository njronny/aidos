/**
 * DocGenerator 文档自动生成 - TDD 测试
 */

import { DocGenerator, DocType } from '../DocGenerator';

describe('DocGenerator', () => {
  let generator: DocGenerator;

  beforeEach(() => {
    generator = new DocGenerator();
  });

  describe('generateAPIDocs', () => {
    it('should generate API documentation', async () => {
      const apiCode = `
        /**
         * Get user by ID
         */
        @Get('/users/:id')
        async getUser(id: string): Promise<User> {
          return User.find(id);
        }
      `;
      
      const docs = await generator.generateAPIDocs(apiCode);
      
      expect(docs).toHaveProperty('endpoints');
      expect(docs.endpoints.length).toBeGreaterThan(0);
    });
  });

  describe('generateChangelog', () => {
    it('should generate changelog from commits', async () => {
      const commits = [
        { hash: 'abc123', message: 'feat: add user API', author: 'dev', date: '2026-01-01' },
        { hash: 'def456', message: 'fix: resolve bug', author: 'dev', date: '2026-01-02' },
      ];
      
      const changelog = generator.generateChangelog(commits);
      
      expect(changelog).toContain('Features');
      expect(changelog).toContain('Bug Fixes');
    });
  });

  describe('generateREADME', () => {
    it('should generate README from project info', async () => {
      const info = {
        name: 'my-project',
        description: 'A test project',
        techStack: ['Node.js', 'TypeScript'],
      };
      
      const readme = generator.generateREADME(info);
      
      expect(readme).toContain('my-project');
      expect(readme).toContain('Node.js');
    });
  });
});
