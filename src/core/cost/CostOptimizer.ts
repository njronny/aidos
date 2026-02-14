/**
 * CostOptimizer - 成本优化引擎
 */

export interface ResourceUsage {
  cpu: number;     // percentage
  memory: number;  // percentage
  storage: number; // percentage
}

export interface CostAnalysis {
  cost: number;
  recommendations: string[];
}

export class CostOptimizer {
  private readonly CPU_COST_PER_PERCENT = 0.01;
  private readonly MEM_COST_PER_PERCENT = 0.005;
  private readonly STORAGE_COST_PER_PERCENT = 0.001;

  /**
   * 分析资源使用并估算成本
   */
  async analyze(usage: ResourceUsage): Promise<CostAnalysis> {
    const cost = (
      usage.cpu * this.CPU_COST_PER_PERCENT +
      usage.memory * this.MEM_COST_PER_PERCENT +
      usage.storage * this.STORAGE_COST_PER_PERCENT
    );

    const recommendations = this.getRecommendations(usage);

    return { cost: Math.round(cost * 100) / 100, recommendations };
  }

  /**
   * 获取优化建议
   */
  getRecommendations(usage: ResourceUsage): string[] {
    const recommendations: string[] = [];

    if (usage.cpu < 20) {
      recommendations.push('CPU使用率过低，建议减少实例数量');
    }
    if (usage.memory < 30) {
      recommendations.push('内存使用率过低，可以降低实例规格');
    }
    if (usage.storage > 80) {
      recommendations.push('存储使用率过高，建议清理或扩容');
    }
    if (recommendations.length === 0) {
      recommendations.push('资源使用合理，无需优化');
    }

    return recommendations;
  }
}

export const costOptimizer = new CostOptimizer();
