import { BaseApiService } from './baseApiService';

// ---------------------------------------------------------------------------
// Types — shapes delivered by F4-BE-1
// ---------------------------------------------------------------------------

/**
 * One row in the execution history list.
 * Returned by GET /api/execution-history/workflow/{workflow_id}/executions
 */
export interface ExecutionSummary {
 execution_id: string;
 status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
 start_time: number;
 end_time: number | null;
 duration: number | null;
 triggered_by: string;
 /** Name of the first failed node, or null when the execution succeeded. */
 failed_node: string | null;
}

/**
 * Per-node execution step data.
 * Part of ExecutionDetail.steps (keyed by node_instance_id as string).
 */
export interface ExecutionStepDetail {
 node_instance_id: string;
 node_id: string;
 node_type: string;
 status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
 start_time: number | null;
 end_time: number | null;
 error: string | null;
 error_trace: string | null;
 message: string | null;
 row_count: number;
}

/**
 * Full execution record returned by the detail endpoint.
 * GET /api/execution-history/workflow/{workflow_id}/executions/{execution_id}
 */
export interface ExecutionDetail {
 execution_id: string;
 workflow_id: string;
 workflow_name: string;
 status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
 triggered_by: string;
 start_time: number;
 end_time: number | null;
 duration: number | null;
 /** Keyed by node_instance_id as string. */
 steps: Record<string, ExecutionStepDetail>;
 error: string | null;
 failed_node: string | null;
}

/**
 * Response from POST .../retry
 */
export interface RetryResponse {
 execution_id: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class ExecutionDebugService extends BaseApiService {
 async listExecutions(workflowId: string): Promise<ExecutionSummary[]> {
 const response = await this.get<ExecutionSummary[]>(
 `/api/execution-history/workflow/${workflowId}/executions`
 );
 return response.data;
 }

 async getExecutionDetail(workflowId: string, executionId: string): Promise<ExecutionDetail> {
 const response = await this.get<ExecutionDetail>(
 `/api/execution-history/workflow/${workflowId}/executions/${executionId}`
 );
 return response.data;
 }

 async retryExecution(workflowId: string, executionId: string): Promise<RetryResponse> {
 const response = await this.post<RetryResponse>(
 `/api/execution-history/workflow/${workflowId}/executions/${executionId}/retry`,
 {}
 );
 return response.data;
 }
}

export const executionDebugService = new ExecutionDebugService();
