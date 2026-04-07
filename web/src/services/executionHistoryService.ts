import type { ExecutionHistory } from '@/types/backend';
import { BaseApiService } from './baseApiService';

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

const EMPTY_DASHBOARD_STATS: DashboardStats = {
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

class ExecutionHistoryService extends BaseApiService {
  async getExecutionHistory(workflowId: string): Promise<ExecutionHistory[]> {
    const response = await this.get<ExecutionHistory[]>(
      `/api/execution-history/workflow/${workflowId}`
    );
    return response.data;
  }

  async getDashboardStats(workflows?: Record<string, string>): Promise<DashboardStats> {
    try {
      const params = new URLSearchParams();
      if (workflows && Object.keys(workflows).length > 0) {
        params.set('workflows', JSON.stringify(workflows));
      }
      const query = params.toString();
      const response = await this.get<Record<string, unknown>>(
        `/api/execution-history/dashboard-stats${query ? `?${query}` : ''}`
      );
      const data = response.data;
      return {
        totalExecutions: (data.total_executions as number) ?? 0,
        successfulExecutions: (data.successful_executions as number) ?? 0,
        failedExecutions: (data.failed_executions as number) ?? 0,
        runningExecutions: (data.running_executions as number) ?? 0,
        successRate: (data.success_rate as number) ?? 0,
        avgDuration: (data.avg_duration as number) ?? 0,
        totalCost: 0,
        recentExecutions: (data.recent_executions as ExecutionHistory[]) ?? [],
        executionsByWorkflow: (data.executions_by_workflow as DashboardStats['executionsByWorkflow']) ?? {},
      };
    } catch {
      return EMPTY_DASHBOARD_STATS;
    }
  }
}

export const executionHistoryService = new ExecutionHistoryService();
