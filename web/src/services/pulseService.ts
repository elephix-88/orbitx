import { BaseApiService } from './baseApiService';

// ---------------------------------------------------------------------------
// Pulse response types
// ---------------------------------------------------------------------------

export interface PulseMetricRow {
  label: string;
  value: string | number;
  change_percent?: number;
  trend?: 'up' | 'down' | 'flat';
}

export interface PulseItem {
  name: string;
  metric: string;
  value: string | number;
  change_percent?: number;
}

export interface PulseAnomaly {
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface PulseRecommendation {
  text: string;
  priority: 'low' | 'medium' | 'high';
}

export interface PulseResponse {
  verdict: string;
  metrics_table: PulseMetricRow[];
  winners: PulseItem[];
  losers: PulseItem[];
  anomalies: PulseAnomaly[];
  recommendations: PulseRecommendation[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class PulseService extends BaseApiService {
  async previewPulse(workflowId: string): Promise<PulseResponse> {
    const response = await this.post<PulseResponse>(
      `/api/workflows/${encodeURIComponent(workflowId)}/pulse/preview`
    );
    return response.data;
  }
}

export const pulseService = new PulseService();
