import { Agent, AgentType, AgentCapabilities, AgentExecutionResult, AgentStatus } from './Agent';

/**
 * Project Manager - 项目经理代理
 * 负责项目规划、任务分配、进度跟踪
 */
export class ProjectManager extends Agent {
  constructor() {
    super(
      'Project Manager',
      AgentType.PROJECT_MANAGER,
      {
        canDesign: false,
        canDevelop: false,
        canTest: false,
        canAnalyze: true,
        canManage: true,
        canDesignDatabase: false,
        canReview: false,
      }
    );
    this.metadata.role = '项目经理';
    this.metadata.responsibilities = [
      '项目规划与进度管理',
      '任务分配与协调',
      '资源调度',
      '风险识别与管理',
      '团队协作沟通',
    ];
  }

  async execute(input: Record<string, unknown>): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    this.status = AgentStatus.BUSY;

    try {
      const action = input.action as string || 'manage';
      let output = '';

      switch (action) {
        case 'plan':
          output = await this.createProjectPlan(input);
          break;
        case 'assign':
          output = await this.assignTasks(input);
          break;
        case 'track':
          output = await this.trackProgress(input);
          break;
        case 'coordinate':
          output = await this.coordinateTeam(input);
          break;
        default:
          output = await this.manage(input);
      }

      this.status = AgentStatus.IDLE;
      return {
        success: true,
        output,
        data: { action, agentType: this.type },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.status = AgentStatus.ERROR;
      return {
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime,
      };
    }
  }

  private async createProjectPlan(input: Record<string, unknown>): Promise<string> {
    const requirement = input.requirement as string || '未指定需求';
    const estimatedDays = input.estimatedDays as number || 30;
    
    const plan = `
# 项目计划

## 需求: ${requirement}

## 时间规划
- 需求分析阶段: 第1-3天
- 架构设计阶段: 第4-7天  
- 开发实现阶段: 第8-${estimatedDays - 5}天
- 测试验收阶段: ${estimatedDays - 4}-${estimatedDays - 1}天
- 部署上线阶段: 第${estimatedDays}天

## 里程碑
1. [ ] 需求文档确认 (Day 3)
2. [ ] 架构设计完成 (Day 7)
3. [ ] 核心功能开发完成 (Day ${estimatedDays - 10})
4. [ ] 测试通过 (Day ${estimatedDays - 1})
5. [ ] 正式上线 (Day ${estimatedDays})

## 风险评估
- 技术风险: 中
- 进度风险: 中
- 资源风险: 低
    `.trim();

    this.metadata.lastPlan = plan;
    return plan;
  }

  private async assignTasks(input: Record<string, unknown>): Promise<string> {
    const tasks = input.tasks as string[] || [];
    const teamMembers = input.teamMembers as string[] || ['开发团队', '测试团队'];
    
    const assignments = tasks.map((task, index) => {
      const assignee = teamMembers[index % teamMembers.length];
      return `- ${task} -> ${assignee}`;
    }).join('\n');

    const result = `# 任务分配\n\n${assignments}`;
    this.metadata.lastAssignments = assignments;
    return result;
  }

  private async trackProgress(input: Record<string, unknown>): Promise<string> {
    const completed = input.completed as number || 0;
    const total = input.total as number || 10;
    const percentage = Math.round((completed / total) * 100);
    
    const progress = `
# 进度跟踪

## 总体进度: ${percentage}%
- 已完成: ${completed} / ${total}
- 剩余任务: ${total - completed}

## 状态
${percentage < 30 ? '🟡 进行中' : percentage < 70 ? '🟢 进展良好' : '🔵 即将完成'}
    `.trim();

    return progress;
  }

  private async coordinateTeam(input: Record<string, unknown>): Promise<string> {
    const teams = input.teams as string[] || [];
    const message = input.message as string || '协调会议';
    
    return `# 团队协调\n\n**会议**: ${message}\n**参与团队**:\n${teams.map(t => `- ${t}`).join('\n')}\n\n协调完成，团队已进入下一阶段工作。`;
  }

  private async manage(input: Record<string, unknown>): Promise<string> {
    return `# 项目管理\n\n正在管理项目: ${input.requirement || '未指定'}\n\n项目管理活动已完成。`;
  }
}

export default ProjectManager;
