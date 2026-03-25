import { fetchClient } from '@/lib/fetchClient';
import { ExecutionHistory } from '@/types/backend';

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

interface BackendDashboardStats {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  running_executions: number;
  success_rate: number;
  avg_duration: number;
  recent_executions: ExecutionHistory[];
  executions_by_workflow: Record<string, { name: string; count: number; success_rate: number }>;
}

class ExecutionHistoryService {
  /**
   * Get all execution history for a workflow
   * Auth headers and 401 handling are managed by fetchClient
   */
  async getExecutionHistory(workflowId: string): Promise<ExecutionHistory[]> {
    const response = await fetchClient(
      `/api/execution-history/workflow/${encodeURIComponent(workflowId)}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch execution history: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get dashboard stats from the backend (single API call)
   * This replaces the N+1 query pattern with a single aggregated endpoint
   *
   * @param workflowIds Optional array of workflow IDs
   * @param workflowNames Optional array of workflow names (same order as IDs)
   *                      If both provided, backend skips workflow DB query entirely
   */
  async getDashboardStats(workflowIds?: string[], workflowNames?: string[]): Promise<DashboardStats> {
    try {
      const params = new URLSearchParams();
      if (workflowIds?.length) {
        params.set('workflow_ids', workflowIds.join(','));
        if (workflowNames?.length === workflowIds.length) {
          params.set('workflow_names', workflowNames.join(','));
        }
      }
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await fetchClient(`/api/execution-history/dashboard-stats${queryString}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
      }

      const data: BackendDashboardStats = await response.json();

      // Transform snake_case response to camelCase
      const executionsByWorkflow: Record<string, { name: string; count: number; successRate: number }> = {};
      for (const [key, value] of Object.entries(data.executions_by_workflow)) {
        executionsByWorkflow[key] = {
          name: value.name,
          count: value.count,
          successRate: value.success_rate,
        };
      }

      // Calculate total cost from recent executions
      const totalCost = data.recent_executions.reduce(
        (sum, exec) => sum + (exec.cost_usd || 0),
        0
      );

      return {
        totalExecutions: data.total_executions,
        successfulExecutions: data.successful_executions,
        failedExecutions: data.failed_executions,
        runningExecutions: data.running_executions,
        successRate: data.success_rate,
        avgDuration: data.avg_duration,
        totalCost,
        recentExecutions: data.recent_executions,
        executionsByWorkflow,
      };
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
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
}

export const executionHistoryService = new ExecutionHistoryService();

