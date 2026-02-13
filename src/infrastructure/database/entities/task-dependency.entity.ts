/**
 * 任务依赖实体
 */
export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnId: string;
  dependencyType: 'finish_to_start';
}

export interface CreateTaskDependencyInput {
  taskId: string;
  dependsOnId: string;
  dependencyType?: 'finish_to_start';
}
