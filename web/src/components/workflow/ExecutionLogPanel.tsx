import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Timer,
  RotateCcw,
  AlertTriangle,
  Play,
  Zap,
  List,
  GripHorizontal,
  Filter,
  Calendar,
  DollarSign,
  Bell,
  BellOff,
} from 'lucide-react';
import { ExecutionHistory, ExecutionStep, ExecutionStatus, NodeOutput, ExecutionDeliveryResult } from '@/types/backend';
import { API_CONFIG } from '@/config/env';
import { authService } from '@/services/authService';
import { executionHistoryService } from '@/services/executionHistoryService';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/store/workflowStore';
import { NodeStatus } from '@/types/workflow';

interface ExecutionLogPanelProps {
  workflowId: string | null;
  executing?: boolean;
  onExecutionComplete?: () => void;
}

/**
 * Sync canvas node statuses from execution history data.
 * This ensures the canvas shows the same status as the execution log panel.
 */
const syncNodeStatusesFromExecution = (execution: ExecutionHistory | null) => {
  if (!execution || !execution.steps) return;

  const currentNodes = useWorkflowStore.getState().nodes;
  if (currentNodes.length === 0) return;

  // Build a map of node_instance_id to status from execution steps
  const stepStatuses = new Map<string, string>();
  for (const [nodeInstanceId, step] of Object.entries(execution.steps)) {
    // Normalize status: FAILED -> error, others lowercase
    let status = step.status.toLowerCase();
    if (status === 'failed') status = 'error';
    stepStatuses.set(nodeInstanceId, status);
  }

  // Always update nodes - reset status to 'pending' if no matching step found
  // This ensures nodes don't stay stuck in 'running' state from a previous execution
  useWorkflowStore.getState().updateNodes((nodes) =>
    nodes.map((node) => {
      const nodeInstanceId = String(node.data?.node_instance_id);
      const stepStatus = stepStatuses.get(nodeInstanceId);

      if (stepStatus) {
        // Found matching step - update to its status
        if (node.status !== stepStatus) {
          return { ...node, status: stepStatus as NodeStatus };
        }
      } else if (node.status === 'running') {
        // No matching step but node shows running - reset to pending
        // This handles edge cases where execution data doesn't include all nodes
        return { ...node, status: 'pending' as NodeStatus };
      }
      return node;
    })
  );
};

const MIN_HEIGHT = 150;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 280;

const statusConfig: Record<ExecutionStatus, {
  icon: typeof CheckCircle2;
  color: string;
  bg: string;
  text: string;
}> = {
  SUCCESS: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    text: 'Success',
  },
  FAILED: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    text: 'Failed',
  },
  RUNNING: {
    icon: Loader2,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    text: 'Running',
  },
  PENDING: {
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    text: 'Pending',
  },
};

const formatTimestamp = (timestamp: number | null): string => {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatDuration = (seconds: number | null): string => {
  if (seconds === null || seconds === undefined) return '-';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatTimestamp(timestamp);
};

// Get records count from NodeOutput
const getRecordsCount = (output?: NodeOutput): number | null => {
  if (!output) return null;
  if (output.extractor_output) return output.extractor_output.records_extracted;
  if (output.transformer_output) return output.transformer_output.records_output;
  if (output.loader_output) return output.loader_output.records_total;
  return null;
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatCost = (cost: number | null): string => {
  if (cost === null || cost === undefined) return '-';
  if (cost < 0.0001) return '<$0.0001';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
};

// Delivery status badge — shown per-execution
const DeliveryBadge: React.FC<{ result: ExecutionDeliveryResult }> = ({ result }) => {
  const channelLabel =
    result.channel_type === 'slack'
      ? `Slack${result.channel_label ? ` ${result.channel_label}` : ''}`
      : 'LINE';

  if (result.status === 'delivered') {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-success/10 text-success border border-success/20"
        title={`Delivered to ${channelLabel}`}
      >
        <Bell className="w-2.5 h-2.5" />
        {channelLabel}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-error/10 text-error border border-error/20"
      title={result.error || `Delivery to ${channelLabel} failed`}
    >
      <BellOff className="w-2.5 h-2.5" />
      {channelLabel}
    </span>
  );
};

// Time range filter options
type TimeRange = 'all' | '1h' | '24h' | '7d' | '30d' | 'custom';
const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '1h', label: '1h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'custom', label: 'Custom' },
];

// Status filter options
type StatusFilter = 'all' | ExecutionStatus;
const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'RUNNING', label: 'Running' },
];

// Max custom range: 2 months
const MAX_CUSTOM_RANGE_DAYS = 60;

// Get timestamp for time range filter
const getTimeRangeStart = (range: TimeRange): number | null => {
  if (range === 'all' || range === 'custom') return null;
  const now = Date.now() / 1000;
  switch (range) {
    case '1h': return now - 3600;
    case '24h': return now - 86400;
    case '7d': return now - 604800;
    case '30d': return now - 2592000;
    default: return null;
  }
};

// Format date for input
const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Get default dates for custom range
const getDefaultCustomDates = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    start: formatDateForInput(start),
    end: formatDateForInput(end),
  };
};

export const ExecutionLogPanel = ({ workflowId, executing: externalExecuting, onExecutionComplete }: ExecutionLogPanelProps) => {
  const [expanded, setExpanded] = useState(false);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT);
  const [executions, setExecutions] = useState<ExecutionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  // Filter state - show filters by default
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFilters, setShowFilters] = useState(true);
  const [customDateRange, setCustomDateRange] = useState(getDefaultCustomDates);
  const [customDateError, setCustomDateError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    if (!workflowId) return;

    setLoading(true);
    setError(null);
    executionHistoryService
      .getExecutionHistory(workflowId)
      .then((data) => {
        const sorted = [...data].sort((a, b) => b.start_time - a.start_time);
        setExecutions(sorted);
        setLoading(false);

        // Sync canvas node statuses from the most recent execution
        // Priority: RUNNING execution > most recent execution
        const runningExecution = sorted.find(e => e.status === 'RUNNING');
        const targetExecution = runningExecution || sorted[0];
        if (targetExecution) {
          syncNodeStatusesFromExecution(targetExecution);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load');
        setLoading(false);
      });
  }, [workflowId]);

  // Fetch on initial mount to sync node statuses (even when collapsed)
  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (workflowId && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchData();
    }
  }, [workflowId, fetchData]);

  // Fetch when panel is expanded
  useEffect(() => {
    if (expanded && workflowId) {
      fetchData();
    }
  }, [expanded, workflowId, fetchData]);

  // Re-fetch when parent signals a new execution was triggered
  useEffect(() => {
    if (externalExecuting && workflowId) {
      fetchData();
    }
  }, [externalExecuting, workflowId, fetchData]);

  // Track if any execution is running (ref to avoid re-triggering effect)
  const hasRunningRef = useRef(false);
  hasRunningRef.current = executions.some(e => e.status === 'RUNNING') || !!externalExecuting;

  // SSE stream — opened once when running, closed on terminal status
  const streamActiveRef = useRef(false);

  useEffect(() => {
    if (!workflowId) return;

    if (hasRunningRef.current && !streamActiveRef.current) {
      streamActiveRef.current = true;
      const abortController = new AbortController();
      const url = `${API_CONFIG.BASE_URL}/api/workflows/${workflowId}/execution-stream`;

      const TERMINAL = new Set(['SUCCESS', 'FAILED']);

      (async () => {
        try {
          const response = await fetch(url, {
            headers: authService.getAuthHeader(),
            credentials: 'include',
            signal: abortController.signal,
          });

          if (!response.ok || !response.body) {
            streamActiveRef.current = false;
            fetchData();
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const execution: ExecutionHistory = JSON.parse(line.slice(6));

                setExecutions((previous) => {
                  const index = previous.findIndex(
                    (e) => e.execution_id === execution.execution_id
                  );
                  const updated =
                    index >= 0
                      ? previous.map((e, i) => (i === index ? execution : e))
                      : [execution, ...previous];
                  return updated.sort((a, b) => b.start_time - a.start_time);
                });

                syncNodeStatusesFromExecution(execution);

                if (TERMINAL.has(execution.status)) {
                  streamActiveRef.current = false;
                  onExecutionComplete?.();
                  return;
                }
              } catch {
                // Ignore malformed messages
              }
            }
          }
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            fetchData();
          }
        } finally {
          streamActiveRef.current = false;
        }
      })();

      return () => {
        abortController.abort();
        streamActiveRef.current = false;
      };
    }

    // Not running: slow poll only when expanded
    if (!expanded) return;

    const timeoutId = setTimeout(() => {
      fetchData();
    }, 30000);

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, workflowId, externalExecuting]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startY: e.clientY,
      startHeight: panelHeight,
    };
  }, [panelHeight]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startY - e.clientY;
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeRef.current.startHeight + delta));
      setPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const selectedData = selectedExecution
    ? executions.find(e => e.execution_id === selectedExecution)
    : null;

  // Filter executions
  const filteredExecutions = executions.filter(exec => {
    // Time range filter
    if (timeRange === 'custom') {
      const startTs = new Date(customDateRange.start).getTime() / 1000;
      const endTs = new Date(customDateRange.end).getTime() / 1000 + 86400; // Include end date fully
      if (exec.start_time < startTs || exec.start_time > endTs) {
        return false;
      }
    } else {
      const timeRangeStart = getTimeRangeStart(timeRange);
      if (timeRangeStart && exec.start_time < timeRangeStart) {
        return false;
      }
    }
    // Status filter
    if (statusFilter !== 'all' && exec.status !== statusFilter) {
      return false;
    }
    return true;
  });

  // Stats based on filtered executions
  const stats = {
    total: filteredExecutions.length,
    success: filteredExecutions.filter(e => e.status === 'SUCCESS').length,
    failed: filteredExecutions.filter(e => e.status === 'FAILED').length,
    running: filteredExecutions.filter(e => e.status === 'RUNNING').length,
  };

  // Check if any filter is active
  const hasActiveFilters = timeRange !== 'all' || statusFilter !== 'all';

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: panelHeight }}
            exit={{ height: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="bg-surface-primary border-t border-border relative"
            style={{ height: panelHeight }}
          >
            {/* Resize Handle */}
            <div
              onMouseDown={handleResizeStart}
              className={cn(
                'absolute top-0 left-0 right-0 h-2 cursor-ns-resize group flex items-center justify-center',
                'hover:bg-blue-500/10 transition-colors',
                isResizing && 'bg-blue-500/20'
              )}
            >
              <GripHorizontal className={cn(
                'w-8 h-3 text-text-tertiary transition-colors',
                'group-hover:text-blue-500',
                isResizing && 'text-blue-500'
              )} />
            </div>

            <div className="h-full flex pt-2 overflow-hidden">
              {/* Execution List */}
              <div className="w-72 border-r border-border flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-surface-secondary">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Runs {hasActiveFilters && `(${filteredExecutions.length}/${executions.length})`}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={cn(
                        'p-1 rounded transition-colors',
                        showFilters || hasActiveFilters
                          ? 'bg-info-light text-info'
                          : 'hover:bg-surface-tertiary text-text-tertiary'
                      )}
                      title="Filter"
                    >
                      <Filter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={fetchData}
                      disabled={loading}
                      className="p-1 hover:bg-surface-tertiary rounded transition-colors"
                    >
                      <RotateCcw className={cn('w-3.5 h-3.5 text-text-tertiary', loading && 'animate-spin')} />
                    </button>
                  </div>
                </div>

                {/* Filter Panel */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden border-b border-border-subtle"
                    >
                      <div className="p-2.5 space-y-2 bg-surface-secondary/50">
                        {/* Time Range - Button Pills */}
                        <div>
                          <label className="flex items-center gap-1 text-[10px] font-medium text-text-secondary uppercase tracking-wider mb-1">
                            <Calendar className="w-3 h-3" />
                            Time
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {timeRangeOptions.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setTimeRange(opt.value)}
                                className={cn(
                                  'px-2 py-0.5 text-[11px] font-medium rounded transition-all',
                                  timeRange === opt.value
                                    ? 'bg-primary-400 text-neutral-950 shadow-sm'
                                    : 'bg-surface-primary border border-border text-text-secondary hover:bg-surface-secondary'
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Date Range */}
                        <AnimatePresence>
                          {timeRange === 'custom' && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden pt-1"
                            >
                              <DateRangePicker
                                startDate={customDateRange.start}
                                endDate={customDateRange.end}
                                onChange={(start, end) => {
                                  setCustomDateRange({ start, end });
                                  setCustomDateError(null);
                                }}
                                maxDays={MAX_CUSTOM_RANGE_DAYS}
                                error={customDateError}
                                compact
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Status Filter */}
                        <div>
                          <label className="flex items-center gap-1 text-[10px] font-medium text-text-secondary uppercase tracking-wider mb-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Status
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {statusFilterOptions.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setStatusFilter(opt.value)}
                                className={cn(
                                  'px-2 py-0.5 text-[11px] font-medium rounded transition-all',
                                  statusFilter === opt.value
                                    ? 'bg-primary-400 text-neutral-950 shadow-sm'
                                    : 'bg-surface-primary border border-border text-text-secondary hover:bg-surface-secondary'
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                          <button
                            onClick={() => {
                              setTimeRange('all');
                              setStatusFilter('all');
                              setCustomDateError(null);
                            }}
                            className="w-full py-1 text-[11px] font-medium text-primary-400 hover:text-primary-300 hover:bg-primary-400/10 rounded transition-colors"
                          >
                            Reset filters
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex-1 overflow-y-auto">
                  {!workflowId ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-tertiary text-sm p-4 text-center">
                      <List className="w-8 h-8 mb-2 opacity-50" />
                      Save workflow to see logs
                    </div>
                  ) : loading && executions.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-red-500 text-sm p-4">
                      <XCircle className="w-5 h-5 mb-1" />
                      {error}
                    </div>
                  ) : filteredExecutions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-tertiary text-sm p-4 text-center">
                      <Clock className="w-8 h-8 mb-2 opacity-50" />
                      {hasActiveFilters ? 'No matching executions' : 'No executions yet'}
                    </div>
                  ) : (
                    filteredExecutions.map((exec) => {
                      const config = statusConfig[exec.status] || statusConfig.PENDING;
                      const StatusIcon = config.icon;
                      const isSelected = selectedExecution === exec.execution_id;
                      
                      return (
                        <button
                          key={exec.execution_id}
                          onClick={() => setSelectedExecution(
                            isSelected ? null : exec.execution_id
                          )}
                          className={cn(
                            'w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors border-b border-border-subtle',
                            isSelected
                              ? 'bg-primary-400/10'
                              : 'hover:bg-surface-secondary'
                          )}
                        >
                          <div className={cn('p-1.5 rounded-lg', config.bg)}>
                            <StatusIcon className={cn(
                              'w-4 h-4',
                              config.color,
                              exec.status === 'RUNNING' && 'animate-spin'
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn('text-sm font-medium', config.color)}>
                                {config.text}
                              </span>
                              <span className="text-xs text-text-tertiary">
                                {formatDuration(exec.duration)}
                              </span>
                            </div>
                            <span className="text-xs text-text-secondary">
                              {formatRelativeTime(exec.start_time)}
                            </span>
                            {exec.delivery_results && exec.delivery_results.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {exec.delivery_results.map((result, idx) => (
                                  <DeliveryBadge key={idx} result={result} />
                                ))}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Detail View */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
                {!selectedData ? (
                  <div className="h-full flex flex-col items-center justify-center text-text-tertiary">
                    <Zap className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">Select an execution to view details</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="flex items-center gap-6 text-sm flex-wrap">
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-text-tertiary" />
                        <span className="text-text-secondary">
                          {selectedData.triggered_by}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-text-tertiary" />
                        <span className="text-text-secondary">
                          {formatTimestamp(selectedData.start_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-text-tertiary" />
                        <span className="text-text-secondary">
                          {formatDuration(selectedData.duration)}
                        </span>
                      </div>
                      {selectedData.cost_usd !== null && (
                        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-amber-900/20 border border-amber-800">
                          <DollarSign className="w-4 h-4 text-amber-500" />
                          <span className="text-amber-400 font-medium">
                            {formatCost(selectedData.cost_usd)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-text-secondary">
                          {selectedData.successful_nodes}/{selectedData.total_nodes}
                        </span>
                        {selectedData.failed_nodes > 0 && (
                          <>
                            <XCircle className="w-4 h-4 text-red-500 ml-2" />
                            <span className="text-red-500">{selectedData.failed_nodes}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Delivery Status */}
                    {selectedData.delivery_results && selectedData.delivery_results.length > 0 ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-text-tertiary">Delivered to:</span>
                        {selectedData.delivery_results.map((result, idx) => (
                          <DeliveryBadge key={idx} result={result} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                        <BellOff className="w-3.5 h-3.5" />
                        No delivery configured
                      </div>
                    )}

                    {/* Error */}
                    {selectedData.error && (
                      <div className="p-3 rounded-lg bg-red-900/20 border border-red-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-400">{selectedData.error}</p>
                      </div>
                    )}

                    {/* Steps Table */}
                    {Object.keys(selectedData.steps).length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 px-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Node</th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Type</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Records</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.values(selectedData.steps).map((step: ExecutionStep) => {
                              const stepConfig = statusConfig[step.status] || statusConfig.PENDING;
                              const StepIcon = stepConfig.icon;
                              const stepDuration = step.start_time && step.end_time
                                ? step.end_time - step.start_time
                                : null;
                              const recordsCount = getRecordsCount(step.output);

                              return (
                                <tr key={step.node_instance_id} className="border-b border-border-subtle">
                                  <td className="py-2 px-3">
                                    <div className="flex items-center gap-2">
                                      <StepIcon className={cn(
                                        'w-4 h-4',
                                        stepConfig.color,
                                        step.status === 'RUNNING' && 'animate-spin'
                                      )} />
                                      <span className={cn('text-xs font-medium', stepConfig.color)}>
                                        {stepConfig.text}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 font-medium text-text-primary">
                                    {step.node_id}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className="px-2 py-0.5 rounded bg-surface-secondary text-xs text-text-secondary">
                                      {step.node_type}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right text-text-secondary font-medium">
                                    {recordsCount !== null ? formatNumber(recordsCount) : '-'}
                                  </td>
                                  <td className="py-2 px-3 text-right text-text-secondary">
                                    {formatDuration(stepDuration)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full h-8 flex items-center justify-center gap-2 transition-colors',
          'bg-surface-secondary hover:bg-surface-tertiary',
          'border-t border-border'
        )}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronUp className="w-4 h-4 text-text-secondary" />
        )}
        <span className="text-xs font-medium text-text-secondary">
          Execution Logs
        </span>
        {!expanded && stats.total > 0 && (
          <div className="flex items-center gap-1.5 ml-2">
            {stats.running > 0 && (
              <span className="flex items-center gap-1 text-xs text-blue-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                {stats.running}
              </span>
            )}
            <span className="text-xs text-emerald-500">{stats.success}</span>
            <span className="text-xs text-text-tertiary">/</span>
            <span className="text-xs text-text-secondary">{stats.total}</span>
            {stats.failed > 0 && (
              <span className="text-xs text-red-500">({stats.failed} failed)</span>
            )}
          </div>
        )}
      </button>
    </div>
  );
};
