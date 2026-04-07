import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Eye,
  RefreshCw,
  AlertTriangle,
  Table2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Columns3,
  Rows3,
  Play,
  Pin,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/store/workflowStore';
import { getNodeSpec } from '@/workflow/registry';
import { previewService, type PreviewResponse } from '@/services/previewService';
import { getUpstreamChain } from '@/utils/upstreamChain';
import { Skeleton } from '@/components/shared/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import type { StepRunResponse } from '@/services/stepRunService';

type PreviewPanelProps = {
  nodeId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Called when a preview succeeds — used to cache the result for the Pin button. */
  onPreviewSuccess?: (_nodeId: string, _result: PreviewResponse) => void;
  /**
   * 'preview' — shows a full refresh button; fetches via previewService (default).
   * 'step-run' — result was pushed in via stepRunResult; no internal fetch is done.
   * 'debug' — data was pushed in via debugResult; no internal fetch is done.
   */
  source?: 'preview' | 'step-run' | 'debug';
  /** When source='step-run', the result from the step-run endpoint. */
  stepRunResult?: StepRunResponse | null;
  /** Whether the auto-pin checkbox should be shown (step-run mode only). */
  canAutoPin?: boolean;
  /** Whether auto-pin is currently checked. */
  autoPinChecked?: boolean;
  /** Called when the user toggles the auto-pin checkbox. */
  onAutoPinChange?: (_checked: boolean) => void;
  /**
   * When source='debug', the stored execution rows for this node.
   * Passed directly in — no network call made.
   */
  debugResult?: PreviewResponse | null;
};

type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: PreviewResponse }
  | { status: 'error'; message: string };

const DATA_TYPE_STYLES: Record<string, string> = {
  string: 'bg-neutral-700/60 text-neutral-300',
  float: 'bg-blue-900/40 text-blue-300',
  float64: 'bg-blue-900/40 text-blue-300',
  double: 'bg-blue-900/40 text-blue-300',
  integer: 'bg-emerald-900/40 text-emerald-300',
  int: 'bg-emerald-900/40 text-emerald-300',
  int64: 'bg-emerald-900/40 text-emerald-300',
  date: 'bg-purple-900/40 text-purple-300',
  datetime: 'bg-purple-900/40 text-purple-300',
  timestamp: 'bg-purple-900/40 text-purple-300',
  boolean: 'bg-amber-900/40 text-amber-300',
  bool: 'bg-amber-900/40 text-amber-300',
};

function getDataTypeBadgeClass(dataType: string): string {
  const normalized = dataType.toLowerCase();
  return DATA_TYPE_STYLES[normalized] ?? 'bg-neutral-700/60 text-neutral-400';
}

function formatCellValue(value: unknown, dataType: string): string {
  if (value === null || value === undefined) return '--';

  const normalized = dataType.toLowerCase();

  // Numeric formatting
  if (['float', 'float64', 'double'].includes(normalized) && typeof value === 'number') {
    return value.toFixed(2);
  }
  if (['integer', 'int', 'int64'].includes(normalized) && typeof value === 'number') {
    return value.toLocaleString();
  }

  // Date formatting
  if (['date', 'datetime', 'timestamp'].includes(normalized) && typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return normalized === 'date'
        ? parsed.toLocaleDateString()
        : parsed.toLocaleString();
    }
  }

  // Boolean
  if (['boolean', 'bool'].includes(normalized)) {
    return String(value);
  }

  return String(value);
}

// Loading skeleton for the table
const TableSkeleton: React.FC = () => (
  <div className="p-4 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton variant="rectangular" width={120} height={20} />
      <Skeleton variant="rectangular" width={80} height={20} />
    </div>
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" width={140} height={32} />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: 8 }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-2">
          {Array.from({ length: 5 }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="rectangular" width={140} height={28} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// Data table rendering
const DataTable: React.FC<{ preview: PreviewResponse }> = ({ preview }) => {
  if (!preview.data || !preview.columns || preview.row_count === 0 || preview.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface-secondary flex items-center justify-center mb-4">
          <Table2 className="w-6 h-6 text-text-tertiary" />
        </div>
        <p className="text-sm font-medium text-text-secondary mb-1">No data</p>
        <p className="text-xs text-text-tertiary">
          This node returned 0 rows for the current configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[calc(100%-1px)]">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-surface-secondary">
            <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary border-b border-border w-10">
              #
            </th>
            {preview.columns.map((column) => (
              <th
                key={column.name}
                className="px-3 py-2 text-left border-b border-border whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-primary">
                    {column.name}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                      getDataTypeBadgeClass(column.data_type)
                    )}
                  >
                    {column.data_type}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                'border-b border-border/50 hover:bg-surface-secondary/50 transition-colors',
                rowIndex % 2 === 0 ? 'bg-transparent' : 'bg-surface-secondary/20'
              )}
            >
              <td className="px-3 py-1.5 text-xs text-text-tertiary font-mono tabular-nums">
                {rowIndex + 1}
              </td>
              {preview.columns.map((column) => (
                <td
                  key={column.name}
                  className="px-3 py-1.5 text-xs text-text-secondary font-mono whitespace-nowrap max-w-[300px] truncate"
                  title={String(row[column.name] ?? '')}
                >
                  {formatCellValue(row[column.name], column.data_type)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Step-run error card with collapsible traceback
// ---------------------------------------------------------------------------
const StepRunErrorCard: React.FC<{ errorMessage: string; traceback: string | null }> = ({
  errorMessage,
  traceback,
}) => {
  const [traceOpen, setTraceOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-900/20 border border-red-500/30">
        <div className="w-8 h-8 rounded-lg bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-300 mb-1">Node execution failed</p>
          <p className="text-xs text-red-400/80 break-words">{errorMessage}</p>
        </div>
      </div>

      {traceback && (
        <div>
          <button
            onClick={() => setTraceOpen((prev) => !prev)}
            className={cn(
              'flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors',
              'px-2 py-1 rounded-lg hover:bg-surface-secondary'
            )}
          >
            <Terminal className="w-3 h-3" />
            {traceOpen ? 'Hide' : 'Show'} traceback
            {traceOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
          {traceOpen && (
            <pre className={cn(
              'mt-2 p-3 rounded-xl text-[11px] leading-relaxed font-mono',
              'bg-neutral-900 border border-neutral-700',
              'text-neutral-400 overflow-auto max-h-48 whitespace-pre-wrap break-all'
            )}>
              {traceback}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  nodeId,
  isOpen,
  onClose,
  onPreviewSuccess,
  source = 'preview',
  stepRunResult,
  canAutoPin = false,
  autoPinChecked = false,
  onAutoPinChange,
  debugResult,
}) => {
  const [previewState, setPreviewState] = useState<PreviewState>({ status: 'idle' });
  const [isExpanded, setIsExpanded] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const nodes = useWorkflowStore((state) => state.nodes);
  const connections = useWorkflowStore((state) => state.connections);

  const currentNode = nodes.find((node) => node.id === nodeId);

  const fetchPreview = useCallback(async () => {
    if (!currentNode) return;

    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setPreviewState({ status: 'loading' });

    const spec = getNodeSpec(currentNode.definitionId);
    let nodeType: string = currentNode.definitionId || currentNode.type;
    let parameters: Record<string, unknown> = currentNode.data || {};

    if (spec?.adapters?.toBackend) {
      const adapted = spec.adapters.toBackend(currentNode.data || {});
      nodeType = adapted.node_id;
      parameters = adapted.parameters as Record<string, unknown>;
    }

    const upstreamNodes = getUpstreamChain(nodeId, nodes, connections);

    try {
      const result = await previewService.previewNode({
        node_type: nodeType,
        node_category: currentNode.type,
        parameters,
        upstream_nodes: upstreamNodes,
      });
      setPreviewState({ status: 'success', data: result });
      onPreviewSuccess?.(nodeId, result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Failed to load preview';
      setPreviewState({ status: 'error', message });
    }
  }, [currentNode, nodeId, nodes, connections]);

  // In step-run mode, sync the external result into local state instead of fetching
  useEffect(() => {
    if (source !== 'step-run') return;
    if (!stepRunResult) {
      setPreviewState({ status: 'idle' });
      return;
    }
    if (stepRunResult.error_message) {
      setPreviewState({ status: 'error', message: stepRunResult.error_message });
    } else {
      const preview: PreviewResponse = {
        data: stepRunResult.data,
        columns: stepRunResult.columns,
        row_count: stepRunResult.row_count,
      };
      setPreviewState({ status: 'success', data: preview });
      onPreviewSuccess?.(nodeId, preview);
    }
  }, [source, stepRunResult, nodeId, onPreviewSuccess]);

  // In debug mode, sync the stored execution rows into local state
  useEffect(() => {
    if (source !== 'debug') return;
    if (!debugResult) {
      setPreviewState({ status: 'idle' });
      return;
    }
    setPreviewState({ status: 'success', data: debugResult });
  }, [source, debugResult]);

  // Fetch preview when panel opens (preview mode only — not step-run or debug)
  useEffect(() => {
    if (source !== 'preview') return;
    if (isOpen && currentNode) {
      fetchPreview();
    }
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [source, isOpen, fetchPreview, currentNode]);

  if (!isOpen || !currentNode) return null;

  const panelContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'fixed bottom-0 left-0 right-0 z-40',
            'bg-surface-primary border-t border-border',
            'shadow-[0_-4px_20px_rgba(0,0,0,0.3)]',
            'flex flex-col',
            isExpanded ? 'h-[45vh] min-h-[300px]' : 'h-12'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-secondary shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {source === 'step-run' ? (
                  <Play className="w-4 h-4 text-emerald-400" />
                ) : source === 'debug' ? (
                  <Eye className="w-4 h-4 text-amber-400" />
                ) : (
                  <Eye className="w-4 h-4 text-primary-400" />
                )}
                <span className="text-sm font-semibold text-text-primary">
                  {source === 'step-run'
                    ? 'Step Run Result'
                    : source === 'debug'
                    ? 'Execution Output'
                    : 'Preview'}
                </span>
              </div>

              {previewState.status === 'success' && (
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Rows3 className="w-3 h-3" />
                    {previewState.data?.row_count ?? 0} rows
                  </span>
                  <span className="flex items-center gap-1">
                    <Columns3 className="w-3 h-3" />
                    {previewState.data?.columns?.length ?? 0} columns
                  </span>
                </div>
              )}

              {previewState.status === 'loading' && (
                <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading preview...
                </span>
              )}

              <span className="text-xs text-text-tertiary">
                {currentNode.name}
                {currentNode.display_name ? ` - ${currentNode.display_name}` : ''}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Auto-pin checkbox — only in step-run mode when node succeeded */}
              {source === 'step-run' && canAutoPin && previewState.status === 'success' && (
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoPinChecked}
                    onChange={(e) => onAutoPinChange?.(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1 text-xs text-text-secondary">
                    <Pin className="w-3 h-3" />
                    Auto-pin result
                  </span>
                </label>
              )}

              {/* Refresh — only shown in preview mode */}
              {source === 'preview' && (
                <button
                  onClick={fetchPreview}
                  disabled={previewState.status === 'loading'}
                  className={cn(
                    'p-1.5 rounded-lg text-text-tertiary transition-colors',
                    'hover:text-text-primary hover:bg-surface-tertiary',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                  title="Refresh preview"
                >
                  <RefreshCw
                    className={cn(
                      'w-3.5 h-3.5',
                      previewState.status === 'loading' && 'animate-spin'
                    )}
                  />
                </button>
              )}

              {/* Expand/Collapse */}
              <button
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
                title="Close preview"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          {isExpanded && (
            <div className="flex-1 overflow-hidden">
              {previewState.status === 'loading' && <TableSkeleton />}

              {previewState.status === 'success' && (
                <DataTable preview={previewState.data} />
              )}

              {previewState.status === 'error' && (
                source === 'step-run' ? (
                  // Step-run error: show structured card with traceback
                  <div className="overflow-auto h-full">
                    <StepRunErrorCard
                      errorMessage={previewState.message}
                      traceback={stepRunResult?.traceback ?? null}
                    />
                  </div>
                ) : (
                  // Preview error: generic centered card with retry button
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <div className="w-14 h-14 rounded-2xl bg-red-900/20 flex items-center justify-center mb-4">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <p className="text-sm font-medium text-text-primary mb-1">
                      Preview failed
                    </p>
                    <p className="text-xs text-text-secondary mb-4 max-w-md">
                      {previewState.message}
                    </p>
                    <button
                      onClick={fetchPreview}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                        'bg-surface-secondary border border-border',
                        'hover:bg-surface-tertiary text-text-primary'
                      )}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry
                    </button>
                  </div>
                )
              )}

              {previewState.status === 'idle' && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Table2 className="w-8 h-8 text-text-tertiary mb-3" />
                  <p className="text-sm text-text-secondary">
                    {source === 'step-run'
                      ? 'Run the node to see results here.'
                      : source === 'debug'
                      ? 'No output data stored for this node.'
                      : 'Click refresh to load preview data.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(panelContent, document.body);
};

export default PreviewPanel;
