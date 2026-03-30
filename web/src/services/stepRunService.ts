import { BaseApiService } from './baseApiService';
import type { ColumnInfo } from './previewService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StepRunRequest {
  auto_pin: boolean;
}

/**
 * Response from POST /api/workflows/{workflowId}/nodes/{nodeInstanceId}/step-run.
 * The endpoint always returns HTTP 200. If the node errored, error_message is set.
 */
export interface StepRunResponse {
  data: Record<string, unknown>[];
  columns: ColumnInfo[];
  row_count: number;
  node_output: Record<string, unknown>;
  error_message: string | null;
  traceback: string | null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class StepRunService extends BaseApiService {
  /**
   * Execute a single node in isolation.
   * Calls POST /api/workflows/{workflowId}/nodes/{nodeInstanceId}/step-run
   * Always resolves (HTTP 200). Check response.error_message for node-level errors.
   */
  async stepRunNode(
    workflowId: string,
    nodeInstanceId: number,
    autoPinResult: boolean
  ): Promise<StepRunResponse> {
    const body: StepRunRequest = { auto_pin: autoPinResult };
    const response = await this.post<StepRunResponse>(
      `/api/workflows/${encodeURIComponent(workflowId)}/nodes/${nodeInstanceId}/step-run`,
      body,
      { retries: 0 }
    );
    return response.data;
  }
}

export const stepRunService = new StepRunService();
