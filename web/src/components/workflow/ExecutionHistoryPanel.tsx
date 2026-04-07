import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  History,
  X,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  executionDebugService,
  type ExecutionSummary,
  type ExecutionDetail,
} from '@/services/executionDebugService';
import { useNotification } from '@/hooks/useNotification';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(timestampSeconds: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestampSeconds;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

type StatusBadgeProps = { status: ExecutionSummary['status'] };

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'SUCCESS':
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 border border-success/20 rounded-md px-1.5 py-0.5">
          <CheckCircle2 size={9} />
          OK
        </span>
      );
    case 'FAILED':
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-error bg-error/10 border border-error/20 rounded-md px-1.5 py-0.5">
          <XCircle size={9} />
          FAILED
        </span>
      );
    case 'RUNNING':
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-warning bg-warning/10 border border-warning/20 rounded-md px-1.5 py-0.5">
          <Loader2 size={9} className="animate-spin" />
          RUNNING
        </span>
      );
    case 'PENDING':
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-text-tertiary bg-neutral-700/40 border border-neutral-700 rounded-md px-1.5 py-0.5">
          <Clock size={9} />
          PENDING
        </span>
      );
  }
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExecutionHistoryPanelProps {
  workflowId: string | null | undefined;
  isOpen: boolean;
  onClose: () => void;
  /** Called when user clicks an execution row to inspect it on the canvas. */
  onLoadExecution: (_detail: ExecutionDetail) => void;
  /** The execution_id of the currently active debug execution (if any). */
  activeExecutionId?: string | null;
  onRetry?: (_executionId: string) => void;
  isRetrying?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ExecutionHistoryPanel: React.FC<ExecutionHistoryPanelProps> = ({
  workflowId,
  isOpen,
  onClose,
  onLoadExecution,
  activeExecutionId,
  onRetry,
  isRetrying = false,
}) => {
  const { notify } = useNotification();
  const [executions, setExecutions] = useState<ExecutionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    if (!workflowId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await executionDebugService.listExecutions(workflowId);
      // Newest first — backend should return them sorted, but ensure it here
      const sorted = [...list].sort((a, b) => b.start_time - a.start_time);
      setExecutions(sorted);
    } catch {
      setError('Could not load execution history.');
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    if (isOpen) fetchList();
  }, [isOpen, fetchList]);

  const handleSelectExecution = useCallback(
    async (executionId: string) => {
      if (!workflowId) return;
      setLoadingDetailId(executionId);
      try {
        const detail = await executionDebugService.getExecutionDetail(workflowId, executionId);
        onLoadExecution(detail);
      } catch {
        notify.error('Failed to load execution', 'Could not fetch execution detail.');
      } finally {
        setLoadingDetailId(null);
      }
    },
    [workflowId, onLoadExecution, notify]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'absolute top-0 right-0 h-full z-30',
            'w-[320px] flex flex-col',
            'bg-surface-primary border-l border-border',
            'shadow-[-4px_0_20px_rgba(0,0,0,0.3)]'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-semibold text-text-primary">Execution History</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchList}
                disabled={loading}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors disabled:opacity-40"
                title="Refresh list"
              >
                <RefreshCw size={13} className={cn(loading && 'animate-spin')} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
                title="Close"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {loading && executions.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center h-32 px-4 text-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <p className="text-xs text-text-secondary">{error}</p>
                <button
                  onClick={fetchList}
                  className="text-xs text-primary-400 hover:text-primary-300 underline"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && executions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 px-4 text-center gap-2">
                <History className="w-6 h-6 text-text-tertiary" />
                <p className="text-sm text-text-secondary">No executions yet</p>
                <p className="text-xs text-text-tertiary">
                  Run this workflow to see its history here.
                </p>
              </div>
            )}

            {executions.length > 0 && (
              <ul className="divide-y divide-border">
                {executions.map((exec) => {
                  const isActive = exec.execution_id === activeExecutionId;
                  const isLoadingThis = loadingDetailId === exec.execution_id;

                  return (
                    <li key={exec.execution_id}>
                      <button
                        onClick={() => handleSelectExecution(exec.execution_id)}
                        disabled={isLoadingThis}
                        className={cn(
                          'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors',
                          'hover:bg-surface-secondary',
                          isActive && 'bg-primary-400/10 border-l-2 border-primary-400'
                        )}
                      >
                        {/* Status icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {isLoadingThis ? (
                            <Loader2 size={14} className="animate-spin text-text-tertiary" />
                          ) : exec.status === 'SUCCESS' ? (
                            <CheckCircle2 size={14} className="text-success" />
                          ) : exec.status === 'FAILED' ? (
                            <XCircle size={14} className="text-error" />
                          ) : exec.status === 'RUNNING' ? (
                            <Loader2 size={14} className="animate-spin text-warning" />
                          ) : (
                            <Clock size={14} className="text-text-tertiary" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <StatusBadge status={exec.status} />
                            <span className="text-[10px] text-text-tertiary flex-shrink-0">
                              {formatRelativeTime(exec.start_time)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-text-tertiary">
                            <span className="flex items-center gap-0.5">
                              <Clock size={9} />
                              {formatDuration(exec.duration)}
                            </span>
                            <span className="capitalize">
                              {exec.triggered_by === 'manual' ? 'Manual' : 'Scheduled'}
                            </span>
                          </div>

                          {exec.failed_node && (
                            <p className="mt-1 text-[10px] text-error/80 truncate flex items-center gap-1">
                              <XCircle size={9} className="flex-shrink-0" />
                              Failed at: {exec.failed_node}
                            </p>
                          )}
                        </div>

                        <ChevronRight size={12} className="text-text-tertiary flex-shrink-0 mt-1" />
                      </button>

                      {/* Inline retry button for failed executions */}
                      {isActive && exec.status === 'FAILED' && onRetry && (
                        <div className="px-4 pb-3 pl-[52px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetry(exec.execution_id);
                            }}
                            disabled={isRetrying}
                            className={cn(
                              'flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-md transition-colors',
                              'bg-amber-900/30 border border-amber-700/50 text-amber-300',
                              'hover:bg-amber-900/50 disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                          >
                            {isRetrying ? (
                              <Loader2 size={9} className="animate-spin" />
                            ) : (
                              <RotateCcw size={9} />
                            )}
                            Retry with same data
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExecutionHistoryPanel;
