import { API_CONFIG } from '@/config/env';
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
  private baseUrl = API_CONFIG.BASE_URL;

  async getExecutionHistory(workflowId: string): Promise<ExecutionHistory[]> {
    const response = await fetch(
      `${this.baseUrl}/api/execution-history/workflow/${workflowId}`,
      { credentials: 'include' }
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch execution history (${response.status})`);
    }
    return response.json();
  }

  async getDashboardStats(workflows?: Record<string, string>): Promise<DashboardStats> {
    const params = new URLSearchParams();
    if (workflows && Object.keys(workflows).length > 0) {
      params.set('workflows', JSON.stringify(workflows));
    }
    const query = params.toString();
    const response = await fetch(
      `${this.baseUrl}/api/execution-history/dashboard-stats${query ? `?${query}` : ''}`,
      { credentials: 'include' }
    );
    if (!response.ok) {
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
    const data = await response.json();
    return {
      totalExecutions: data.total_executions ?? 0,
      successfulExecutions: data.successful_executions ?? 0,
      failedExecutions: data.failed_executions ?? 0,
      runningExecutions: data.running_executions ?? 0,
      successRate: data.success_rate ?? 0,
      avgDuration: data.avg_duration ?? 0,
      totalCost: 0,
      recentExecutions: data.recent_executions ?? [],
      executionsByWorkflow: data.executions_by_workflow ?? {},
    };
  }
}

export const executionHistoryService = new ExecutionHistoryService();

