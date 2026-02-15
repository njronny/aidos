/**
 * API Routes Basic Tests
 * 
 * These tests verify the basic API functionality
 */

describe('API Routes', () => {
  describe('Auth Module', () => {
    it('should have authMiddleware exported', async () => {
      const { authMiddleware } = await import('../middleware/auth');
      expect(typeof authMiddleware).toBe('function');
    });

    it('should have optionalAuthMiddleware exported', async () => {
      const { optionalAuthMiddleware } = await import('../middleware/auth');
      expect(typeof optionalAuthMiddleware).toBe('function');
    });
  });

  describe('WebSocket Module', () => {
    it('should have wsManager exported', async () => {
      const { wsManager } = await import('../websocket');
      expect(wsManager).toBeDefined();
      expect(typeof wsManager.broadcast).toBe('function');
      expect(typeof wsManager.pushTaskUpdate).toBe('function');
    });
  });

  describe('Data Store', () => {
    it('should have dataStore exported', async () => {
      const { dataStore } = await import('../store');
      expect(dataStore).toBeDefined();
      expect(typeof dataStore.getAllProjects).toBe('function');
      expect(typeof dataStore.getProjectById).toBe('function');
      expect(typeof dataStore.createProject).toBe('function');
    });
  });
});
