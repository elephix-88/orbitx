import { BaseApiService } from './baseApiService';
import type { ColumnInfo } from './previewService';

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
 * Per-node execution step data, including the stored output rows.
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
  /** Up to 1000 stored rows from the node's output. */
  output_rows: Record<string, unknown>[];
  /** Columns for the stored output rows. */
  output_columns: ColumnInfo[];
  /** Total row count before the 1000-row cap. */
  output_row_count: number;
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

// TODO: Re-enable when execution history backend is ready
class ExecutionDebugService extends BaseApiService {
  async listExecutions(_workflowId: string): Promise<ExecutionSummary[]> {
    return [];
  }

  async getExecutionDetail(_workflowId: string, _executionId: string): Promise<ExecutionDetail> {
    throw new Error('Execution history is temporarily disabled');
  }

  async retryExecution(_workflowId: string, _executionId: string): Promise<RetryResponse> {
    throw new Error('Execution history is temporarily disabled');
  }
}

export const executionDebugService = new ExecutionDebugService();
