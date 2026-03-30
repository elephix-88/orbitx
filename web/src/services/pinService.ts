import { BaseApiService } from './baseApiService';
import type { ColumnInfo, PreviewResponse } from './previewService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PinNodeRequest {
  data: Record<string, unknown>[];
  columns: ColumnInfo[];
}

export interface PinnedNodeEntry {
  data: Record<string, unknown>[];
  columns: ColumnInfo[];
  pinned_at: number;
}

/**
 * Map of node_instance_id (as string) → pinned entry.
 * Matches the shape returned by GET /api/workflows/{id}/pinned-data.
 */
export type PinnedDataMap = Record<string, PinnedNodeEntry>;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class PinService extends BaseApiService {
  /**
   * Pin the node's current preview data.
   * Calls PUT /api/workflows/{workflowId}/nodes/{nodeInstanceId}/pin
   */
  async pinNode(
    workflowId: string,
    nodeInstanceId: number,
    preview: PreviewResponse
  ): Promise<void> {
    const body: PinNodeRequest = {
      data: preview.data,
      columns: preview.columns,
    };
    await this.put<unknown>(
      `/api/workflows/${encodeURIComponent(workflowId)}/nodes/${nodeInstanceId}/pin`,
      body,
      { retries: 0 }
    );
  }

  /**
   * Remove a pinned entry for a node.
   * Calls DELETE /api/workflows/{workflowId}/nodes/{nodeInstanceId}/pin
   * Returns true if the pin was removed, false if it wasn't found (404).
   */
  async unpinNode(workflowId: string, nodeInstanceId: number): Promise<boolean> {
    try {
      await this.delete<unknown>(
        `/api/workflows/${encodeURIComponent(workflowId)}/nodes/${nodeInstanceId}/pin`,
        { retries: 0 }
      );
      return true;
    } catch (error) {
      // 404 = pin not found — treat as success (idempotent unpin)
      if (
        error !== null &&
        typeof error === 'object' &&
        'status' in error &&
        (error as { status: number }).status === 404
      ) {
        return true;
      }
      throw error;
    }
  }

  /**
   * Fetch all pinned data for a workflow.
   * Calls GET /api/workflows/{workflowId}/pinned-data
   */
  async getPinnedData(workflowId: string): Promise<PinnedDataMap> {
    const response = await this.get<{ pinned: PinnedDataMap }>(
      `/api/workflows/${encodeURIComponent(workflowId)}/pinned-data`
    );
    // The backend wraps the map in { pinned: {...} }
    return response.data.pinned ?? (response.data as unknown as PinnedDataMap);
  }
}

export const pinService = new PinService();
