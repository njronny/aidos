/**
 * TeamCollaboration Tests - TDD
 * 
 * 测试团队协作功能
 */

import { TeamCollaboration, TeamMember, Project, Permission } from '../TeamCollaboration';

describe('TeamCollaboration', () => {
  let collaboration: TeamCollaboration;

  beforeEach(() => {
    collaboration = new TeamCollaboration();
  });

  describe('constructor', () => {
    it('should create collaboration system', () => {
      expect(collaboration).toBeDefined();
    });
  });

  describe('member management', () => {
    it('should add team member', () => {
      const member: TeamMember = {
        id: 'user-1',
        name: '张三',
        email: 'zhangsan@example.com',
        role: 'developer',
      };

      collaboration.addMember(member);
      
      const added = collaboration.getMember('user-1');
      expect(added?.id).toBe('user-1');
      expect(added?.name).toBe('张三');
    });

    it('should remove team member', () => {
      const member: TeamMember = {
        id: 'user-1',
        name: '张三',
        email: 'zhangsan@example.com',
        role: 'developer',
      };

      collaboration.addMember(member);
      collaboration.removeMember('user-1');
      
      expect(collaboration.getMember('user-1')).toBeUndefined();
    });

    it('should update member role', () => {
      const member: TeamMember = {
        id: 'user-1',
        name: '张三',
        email: 'zhangsan@example.com',
        role: 'developer',
      };

      collaboration.addMember(member);
      collaboration.updateMemberRole('user-1', 'lead');
      
      const updated = collaboration.getMember('user-1');
      expect(updated?.role).toBe('lead');
    });
  });

  describe('project management', () => {
    it('should create project', () => {
      const project: Project = {
        id: 'proj-1',
        name: 'AIDOS',
        description: 'AI开发系统',
        ownerId: 'user-1',
        members: ['user-1', 'user-2'],
        createdAt: Date.now(),
      };

      collaboration.createProject(project);
      
      expect(collaboration.getProject('proj-1')?.name).toBe('AIDOS');
    });

    it('should add member to project', () => {
      const project: Project = {
        id: 'proj-1',
        name: 'AIDOS',
        description: 'AI开发系统',
        ownerId: 'user-1',
        members: ['user-1'],
        createdAt: Date.now(),
      };

      collaboration.createProject(project);
      collaboration.addProjectMember('proj-1', 'user-2', 'developer');

      const proj = collaboration.getProject('proj-1');
      expect(proj?.members).toContain('user-2');
    });
  });

  describe('permissions', () => {
    it('should check permission', () => {
      const member: TeamMember = {
        id: 'user-1',
        name: '张三',
        email: 'zhangsan@example.com',
        role: 'developer',
      };

      collaboration.addMember(member);
      
      const hasPermission = collaboration.checkPermission('user-1', 'project:read');
      expect(typeof hasPermission).toBe('boolean');
    });

    it('should grant permission', () => {
      collaboration.grantPermission('user-1', 'project:admin');
      
      const hasPermission = collaboration.checkPermission('user-1', 'project:admin');
      expect(hasPermission).toBe(true);
    });

    it('should revoke permission', () => {
      collaboration.grantPermission('user-1', 'project:write');
      collaboration.revokePermission('user-1', 'project:write');
      
      const hasPermission = collaboration.checkPermission('user-1', 'project:write');
      expect(hasPermission).toBe(false);
    });
  });

  describe('activity tracking', () => {
    it('should log activity', () => {
      collaboration.logActivity({
        userId: 'user-1',
        action: 'project:create',
        targetId: 'proj-1',
        timestamp: Date.now(),
      });

      const activities = collaboration.getActivities('user-1');
      expect(activities.length).toBeGreaterThan(0);
    });

    it('should get user activities', () => {
      collaboration.logActivity({
        userId: 'user-1',
        action: 'code:commit',
        targetId: 'file-1',
        timestamp: Date.now(),
      });

      const activities = collaboration.getActivities('user-1');
      expect(activities.length).toBeGreaterThan(0);
    });
  });

  describe('notifications', () => {
    it('should send notification', () => {
      collaboration.sendNotification({
        userId: 'user-1',
        title: '任务完成',
        message: '您的任务已完成',
        type: 'info',
      });

      const notifications = collaboration.getNotifications('user-1');
      expect(notifications.length).toBe(1);
    });

    it('should mark notification as read', () => {
      collaboration.sendNotification({
        userId: 'user-1',
        title: 'Test',
        message: 'Test message',
        type: 'info',
      });

      collaboration.markNotificationRead('user-1', 0);
      
      const notifications = collaboration.getNotifications('user-1');
      expect(notifications[0]?.read).toBe(true);
    });
  });
});
