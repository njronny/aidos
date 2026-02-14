/**
 * TeamCollaboration - Team Collaboration System
 * 
 * 团队协作系统
 * - 成员管理
 * - 项目管理
 * - 权限控制
 * - 活动追踪
 * - 通知系统
 */

export type MemberRole = 'owner' | 'lead' | 'developer' | 'qa' | 'viewer';
export type Permission = 'project:read' | 'project:write' | 'project:admin' | 'task:assign' | 'code:commit';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  avatar?: string;
  joinedAt?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: string[];
  createdAt: number;
}

export interface Activity {
  userId: string;
  action: string;
  targetId: string;
  timestamp: number;
  details?: Record<string, any>;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: number;
}

export class TeamCollaboration {
  private members: Map<string, TeamMember> = new Map();
  private projects: Map<string, Project> = new Map();
  private permissions: Map<string, Set<Permission>> = new Map();
  private activities: Activity[] = [];
  private notifications: Map<string, Notification[]> = new Map();

  constructor() {
    // Initialize
  }

  /**
   * 添加成员
   */
  addMember(member: TeamMember): void {
    if (this.members.has(member.id)) {
      throw new Error(`Member ${member.id} already exists`);
    }
    this.members.set(member.id, { ...member, joinedAt: Date.now() });
  }

  /**
   * 获取成员
   */
  getMember(id: string): TeamMember | undefined {
    return this.members.get(id);
  }

  /**
   * 获取所有成员
   */
  getMembers(): TeamMember[] {
    return Array.from(this.members.values());
  }

  /**
   * 移除成员
   */
  removeMember(id: string): void {
    this.members.delete(id);
    this.permissions.delete(id);
  }

  /**
   * 更新成员角色
   */
  updateMemberRole(id: string, role: MemberRole): void {
    const member = this.members.get(id);
    if (member) {
      member.role = role;
    }
  }

  /**
   * 创建项目
   */
  createProject(project: Project): void {
    if (this.projects.has(project.id)) {
      throw new Error(`Project ${project.id} already exists`);
    }
    this.projects.set(project.id, { ...project, createdAt: Date.now() });
  }

  /**
   * 获取项目
   */
  getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  /**
   * 获取所有项目
   */
  getProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  /**
   * 添加项目成员
   */
  addProjectMember(projectId: string, userId: string, role: MemberRole): void {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    if (!project.members.includes(userId)) {
      project.members.push(userId);
    }
    // Auto-grant basic permission
    this.grantPermission(userId, 'project:read');
  }

  /**
   * 检查权限
   */
  checkPermission(userId: string, permission: Permission): boolean {
    const userPerms = this.permissions.get(userId);
    if (!userPerms) return false;
    return userPerms.has(permission);
  }

  /**
   * 授予权限
   */
  grantPermission(userId: string, permission: Permission): void {
    if (!this.permissions.has(userId)) {
      this.permissions.set(userId, new Set());
    }
    this.permissions.get(userId)!.add(permission);
  }

  /**
   * 撤销权限
   */
  revokePermission(userId: string, permission: Permission): void {
    const userPerms = this.permissions.get(userId);
    if (userPerms) {
      userPerms.delete(permission);
    }
  }

  /**
   * 记录活动
   */
  logActivity(activity: Activity): void {
    this.activities.push(activity);
    // Keep only last 1000 activities
    if (this.activities.length > 1000) {
      this.activities = this.activities.slice(-1000);
    }
  }

  /**
   * 获取用户活动
   */
  getActivities(userId: string): Activity[] {
    return this.activities.filter(a => a.userId === userId);
  }

  /**
   * 获取所有活动
   */
  getAllActivities(): Activity[] {
    return [...this.activities];
  }

  /**
   * 发送通知
   */
  sendNotification(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>): void {
    const notifications = this.notifications.get(notification.userId) || [];
    notifications.push({
      ...notification,
      id: `notif-${notifications.length}`,
      read: false,
      createdAt: Date.now(),
    });
    this.notifications.set(notification.userId, notifications);
  }

  /**
   * 获取通知
   */
  getNotifications(userId: string): Notification[] {
    return this.notifications.get(userId) || [];
  }

  /**
   * 标记通知已读
   */
  markNotificationRead(userId: string, index: number): void {
    const notifications = this.notifications.get(userId);
    if (notifications && notifications[index]) {
      notifications[index].read = true;
    }
  }

  /**
   * 获取未读通知数
   */
  getUnreadCount(userId: string): number {
    const notifications = this.notifications.get(userId) || [];
    return notifications.filter(n => !n.read).length;
  }

  /**
   * 获取团队统计
   */
  getTeamStats(): {
    totalMembers: number;
    totalProjects: number;
    totalActivities: number;
  } {
    return {
      totalMembers: this.members.size,
      totalProjects: this.projects.size,
      totalActivities: this.activities.length,
    };
  }
}

export default TeamCollaboration;
