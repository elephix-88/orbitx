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

export interface UpstreamNodeRequest {
  node_type: string;
  node_category: string;
  parameters: Record<string, unknown>;
}

export interface PreviewNodeRequest {
  node_type: string;
  node_category: string;
  parameters: Record<string, unknown>;
  upstream_nodes: UpstreamNodeRequest[];
}

class PreviewService extends BaseApiService {
  async previewNode(request: PreviewNodeRequest): Promise<PreviewResponse> {
    const response = await this.post<PreviewResponse>(
      '/api/workflows/preview-node',
      request,
      { timeout: 60000, retries: 0 }
    );
    return response.data;
  }
}

export const previewService = new PreviewService();
