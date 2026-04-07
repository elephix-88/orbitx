import { BaseApiService } from './baseApiService';

export interface ColumnInfo {
  name: string;
  data_type: string;
}

export interface PreviewResponse {
  data: Record<string, unknown>[];
  columns: ColumnInfo[];
  row_count: number;
}

class PreviewService extends BaseApiService {
  async previewNode(workflowId: string, nodeInstanceId: number): Promise<PreviewResponse> {
    // Use fetchClient directly because BaseApiService.parseSuccessResponse
    // unwraps json.data — but our response shape IS { data, columns, row_count }
    // where "data" is the preview rows, not a wrapper. Direct fetch avoids the conflict.
    const { fetchClient } = await import('@/lib/fetchClient');
    const response = await fetchClient(
      `/api/workflows/${workflowId}/nodes/${nodeInstanceId}/preview`,
      { method: 'POST', baseUrl: this.baseUrl }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Preview failed' }));
      throw new Error(error.detail || `Preview failed (${response.status})`);
    }
    return response.json();
  }
}

export const previewService = new PreviewService();
