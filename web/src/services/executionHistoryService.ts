import type { ExecutionHistory } from '@/types/backend';

export interface DashboardStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  runningExecutions: number;
  successRate: number;
  avgDuration: number;
  totalCost: number;
  recentExecutions: ExecutionHistory[];
  executionsByWorkflow: Record<string, { name: string; count: number; successRate: number }>;
}

class ExecutionHistoryService {
  /**
   * Get all execution history for a workflow
   * TODO: Re-enable when execution history backend is ready
   */
  async getExecutionHistory(_workflowId: string): Promise<ExecutionHistory[]> {
    return [];
  }

  /**
   * TODO: Re-enable when execution history backend is ready
   */
  async getDashboardStats(_workflowIds?: string[], _workflowNames?: string[]): Promise<DashboardStats> {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      runningExecutions: 0,
      successRate: 0,
      avgDuration: 0,
      totalCost: 0,
      recentExecutions: [],
      executionsByWorkflow: {},
    };
  }
}

export const executionHistoryService = new ExecutionHistoryService();

