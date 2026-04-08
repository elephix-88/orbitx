import { useEffect, useRef } from 'react';
import { API_CONFIG } from '@/config/env';
import type { ExecutionHistory } from '@/types/backend';

const TERMINAL_STATUSES = new Set(['SUCCESS', 'FAILED']);

interface UseExecutionStreamOptions {
  workflowId: string | null;
  enabled: boolean;
  onMessage: (execution: ExecutionHistory) => void;
}

/**
 * Subscribe to real-time execution updates via native EventSource (SSE).
 *
 * Auth is handled by the HttpOnly cookie set at login — EventSource sends
 * cookies automatically. The backend uses sse-starlette with MongoDB change
 * streams for true push-based updates with automatic keep-alive pings.
 */
export function useExecutionStream({ workflowId, enabled, onMessage }: UseExecutionStreamOptions) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!workflowId || !enabled) {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      return;
    }

    const url = `${API_CONFIG.BASE_URL}/api/workflows/${workflowId}/execution-stream`;
    const source = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = source;

    source.onmessage = (event) => {
      if (!event.data || event.data === '{}') return;

      try {
        const execution = JSON.parse(event.data) as ExecutionHistory;
        onMessageRef.current(execution);

        if (TERMINAL_STATUSES.has(execution.status)) {
          source.close();
        }
      } catch {
        // Skip malformed JSON
      }
    };

    source.onerror = () => {
      // Connection lost or server closed the stream.
      // EventSource auto-reconnects by default; close explicitly
      // since we only need it for one execution lifecycle.
      source.close();
    };

    return () => {
      source.close();
      eventSourceRef.current = null;
    };
  }, [workflowId, enabled]);
}
