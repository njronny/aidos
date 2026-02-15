import { GitOps } from '../GitOps';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('GitOps', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gitops-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  });

  describe('commit', () => {
    it('should return false for empty commit when not initialized', async () => {
      const gitOps = new GitOps({ repoPath: testDir });
      const result = await gitOps.commit('Empty commit');
      expect(result.success).toBe(false);
    }, 10000);
  });
});
