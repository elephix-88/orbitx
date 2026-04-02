import type { ExecutionStatus, NodeOutput } from '@/types/backend';

// ---------------------------------------------------------------------------
// Time range filter shared between DashboardPage and ExecutionLogPanel
// ---------------------------------------------------------------------------

export type TimeRange = 'all' | '1h' | '24h' | '7d' | '30d' | 'custom';

export const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '1h', label: 'Last hour' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom' },
];

export type StatusFilter = 'all' | ExecutionStatus;

export const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'RUNNING', label: 'Running' },
];

export const MAX_CUSTOM_RANGE_DAYS = 60;

export const getTimeRangeStart = (range: TimeRange): number | null => {
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

export const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getDefaultCustomDates = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    start: formatDateForInput(start),
    end: formatDateForInput(end),
  };
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export const formatDuration = (seconds: number | null): string => {
  if (seconds === null || seconds === undefined) return '-';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

export const formatTimestamp = (timestamp: number | null): string => {
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

export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
};

export const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const formatCost = (cost: number | null): string => {
  if (cost === null || cost === undefined) return '-';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
};

// ---------------------------------------------------------------------------
// Execution data helpers
// ---------------------------------------------------------------------------

export const getRecordsCount = (output?: NodeOutput): number | null => {
  if (!output) return null;
  if (output.extractor_output) return output.extractor_output.records_extracted;
  if (output.transformer_output) return output.transformer_output.records_output;
  if (output.loader_output) return output.loader_output.records_total;
  return null;
};
