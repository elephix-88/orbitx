import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Loader2,
  RefreshCw,
  PlayCircle,
  ChevronDown,
  ChevronRight,
  Activity,
  TrendingUp,
  Timer,
  BarChart3,
  Link2,
  Plus,
  Filter,
  Calendar,
  DollarSign,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { cn } from '@/lib/utils';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { useFetchOnce } from '@/hooks/useStableRequest';
import { useFirstTimeUser } from '@/hooks/useFirstTimeUser';
import { executionHistoryService, DashboardStats } from '@/services/executionHistoryService';
import { workflowApiService } from '@/services/workflowApiService';
import { WelcomeModal, OnboardingChecklist } from '@/components/onboarding/WelcomeModal';
import { fetchClient } from '@/lib/fetchClient';
import {
  ExecutionHistory,
  ExecutionStep,
  ExecutionStatus,
  NodeOutput,
} from '@/types/backend';

// Time range filter options
type TimeRange = 'all' | '1h' | '24h' | '7d' | '30d' | 'custom';
const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '1h', label: 'Last hour' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
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

// Max custom range: 2 months in milliseconds
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

// Format helpers
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
  return new Date(timestamp * 1000).toLocaleDateString();
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatCost = (cost: number | null): string => {
  if (cost === null || cost === undefined) return '-';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
};

const getStepDuration = (step: ExecutionStep): number | null => {
  if (step.start_time && step.end_time) {
    return step.end_time - step.start_time;
  }
  return null;
};

const sortStepsByType = (steps: ExecutionStep[]): ExecutionStep[] => {
  const typeOrder: Record<string, number> = {
    'source': 0,
    'transform': 1,
    'destinations': 2,
    'destination': 2,
  };
  return [...steps].sort((a, b) => {
    const orderA = typeOrder[a.node_type?.toLowerCase()] ?? 99;
    const orderB = typeOrder[b.node_type?.toLowerCase()] ?? 99;
    return orderA - orderB;
  });
};

const getNodeTypeColor = (nodeType: string): string => {
  const type = nodeType?.toLowerCase();
  if (type === 'source') return 'text-blue-500';
  if (type === 'transform') return 'text-purple-500';
  if (type === 'destinations' || type === 'destination') return 'text-emerald-500';
  return 'text-text-tertiary';
};

// Get records count from node output
const getRecordsCount = (output?: NodeOutput): number | null => {
  if (!output) return null;
  if (output.extractor_output) return output.extractor_output.records_extracted;
  if (output.transformer_output) return output.transformer_output.records_output;
  if (output.loader_output) return output.loader_output.records_total;
  return null;
};

// Status configuration - Blueprint LED dots
const statusConfig = {
  SUCCESS: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', icon: CheckCircle2 },
  FAILED: { bg: 'bg-red-500/10', text: 'text-red-500', icon: XCircle },
  RUNNING: { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: Loader2 },
  PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-500', icon: Clock },
};

// Execution Tree Row Component
const ExecutionTreeRow = ({
  exec,
  steps,
  onNavigate,
}: {
  exec: ExecutionHistory;
  steps: ExecutionStep[];
  onNavigate: (id: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const config = statusConfig[exec.status] || statusConfig.PENDING;
  const StatusIcon = config.icon;

  // Calculate total records processed
  const totalRecords = steps.reduce((sum, step) => {
    const count = getRecordsCount(step.output);
    return sum + (count || 0);
  }, 0);

  // LED-style status dot color with glow
  const statusDotStyle = exec.status === 'SUCCESS'
    ? { backgroundColor: '#00E5A0', boxShadow: '0 0 6px rgba(0, 229, 160, 0.5)' }
    : exec.status === 'FAILED'
    ? { backgroundColor: '#FF4D6A', boxShadow: '0 0 6px rgba(255, 77, 106, 0.5)' }
    : exec.status === 'RUNNING'
    ? { backgroundColor: '#00D4FF', boxShadow: '0 0 6px rgba(0, 212, 255, 0.5)' }
    : { backgroundColor: '#FFB800', boxShadow: '0 0 6px rgba(255, 184, 0, 0.5)' };

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer group"
        style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.08)' }}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 212, 255, 0.04)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
      >
        <button
          className="p-0.5 transition-colors flex-shrink-0"
          style={{ borderRadius: '4px', color: '#8896AD' }}
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* LED Status dot */}
        <div className="flex-shrink-0">
          <span className="inline-block w-3 h-3 rounded-full" style={statusDotStyle} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm" style={{ color: '#E8ECF4' }}>
            {exec.workflow_name || 'Unknown Workflow'}
          </p>
          <p className="text-xs" style={{ color: '#506080' }}>
            {formatRelativeTime(exec.start_time)}
          </p>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {totalRecords > 0 && (
            <span className="text-xs font-mono hidden sm:inline" style={{ color: '#8896AD' }}>
              {formatNumber(totalRecords)} records
            </span>
          )}
          <span className="px-2 py-0.5 text-xs font-medium font-mono uppercase tracking-wider" style={{ color: '#E8ECF4', backgroundColor: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.15)', borderRadius: '4px' }}>
            {exec.status}
          </span>
          <span className="text-xs font-mono w-16 text-right" style={{ color: '#8896AD' }}>
            {formatDuration(exec.duration)}
          </span>
          <span className="text-xs font-mono" style={{ color: '#8896AD' }}>
            {exec.successful_nodes}/{exec.total_nodes}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(exec.workflow_id);
            }}
            className="p-1.5 transition-colors opacity-0 group-hover:opacity-100"
            style={{ borderRadius: '4px', color: '#00D4FF' }}
            title="Go to workflow"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && steps.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            style={{ backgroundColor: 'rgba(0, 212, 255, 0.02)' }}
          >
            {/* Table Header */}
            <div className="flex items-center gap-3 px-4 py-2 ml-8 text-[10px] font-semibold uppercase tracking-wider" style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.08)', borderLeft: '2px solid rgba(0, 212, 255, 0.15)', color: '#8896AD' }}>
              <div className="w-4" />
              <div className="flex-1">Node</div>
              <div className="w-24">Type</div>
              <div className="w-20 text-right">Records</div>
              <div className="w-14 text-right">Duration</div>
            </div>
            {steps.map((step, idx) => {
              const stepDuration = getStepDuration(step);
              const stepConfig = statusConfig[step.status] || statusConfig.PENDING;
              const StepIcon = stepConfig.icon;
              const recordsCount = getRecordsCount(step.output);

              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-4 py-2 ml-8"
                  style={{ borderLeft: '2px solid rgba(0, 212, 255, 0.15)' }}
                >
                  <StepIcon className={cn("w-4 h-4 flex-shrink-0", stepConfig.text, step.status === 'RUNNING' && "animate-spin")} />
                  <span className={cn("flex-1 text-sm font-medium truncate", getNodeTypeColor(step.node_type))}>
                    {step.node_id}
                  </span>
                  <span className="w-24 text-xs uppercase" style={{ color: '#8896AD' }}>{step.node_type}</span>
                  <span className="w-20 text-xs text-right font-mono font-medium" style={{ color: '#E8ECF4' }}>
                    {recordsCount !== null ? formatNumber(recordsCount) : '-'}
                  </span>
                  <span className="w-14 text-xs text-right font-mono" style={{ color: '#8896AD' }}>
                    {stepDuration !== null ? `${stepDuration.toFixed(1)}s` : '-'}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // First-time user detection for onboarding
  const {
    isFirstTimeUser,
    hasCompletedOnboarding,
    markOnboardingComplete,
    dismissOnboarding,
  } = useFirstTimeUser();

  // Filter state - show filters by default
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFilters, setShowFilters] = useState(true);
  const [customDateRange, setCustomDateRange] = useState(getDefaultCustomDates);
  const [customDateError, setCustomDateError] = useState<string | null>(null);

  const [stats, setStats] = useState<DashboardStats>({
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    runningExecutions: 0,
    successRate: 0,
    avgDuration: 0,
    totalCost: 0,
    recentExecutions: [],
    executionsByWorkflow: {},
  });
  const [workflowCount, setWorkflowCount] = useState(0);
  const [connectionCount, setConnectionCount] = useState(0);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      }

      // Fetch workflows and connections in parallel
      const [workflowsResponse, connectionsResponse] = await Promise.all([
        workflowApiService.getWorkflows(),
        fetchClient('/api/connections').then(r => r.json()).catch(() => ({ data: [] })),
      ]);

      const workflows = workflowsResponse.data || [];
      setWorkflowCount(workflows.length);

      // Set connection count
      const connections = Array.isArray(connectionsResponse?.data)
        ? connectionsResponse.data
        : Array.isArray(connectionsResponse)
        ? connectionsResponse
        : [];
      setConnectionCount(connections.length);

      // Extract workflow IDs and names to pass to dashboard stats (avoids duplicate DB query)
      const workflowData = workflows.map((w: { _id?: { $oid?: string } | string; job_id?: string; job_name?: string }) => ({
        id: ((typeof w._id === 'object' ? w._id?.$oid : w._id) || w.job_id) as string,
        name: w.job_name || '',
      })).filter((w: { id: string }) => w.id);

      const workflowIds = workflowData.map((w: { id: string }) => w.id);
      const workflowNames = workflowData.map((w: { name: string }) => w.name);

      const dashboardStats = await executionHistoryService.getDashboardStats(workflowIds, workflowNames);
      setStats(dashboardStats);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useFetchOnce(fetchData, "dashboard-page");
  const showLoading = useDeferredLoading(loading, 150);

  // Filter executions
  const filteredExecutions = stats.recentExecutions.filter(exec => {
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

  // Filtered stats
  const filteredStats = {
    total: filteredExecutions.length,
    success: filteredExecutions.filter(e => e.status === 'SUCCESS').length,
    failed: filteredExecutions.filter(e => e.status === 'FAILED').length,
    running: filteredExecutions.filter(e => e.status === 'RUNNING').length,
  };

  // Check if any filter is active
  const hasActiveFilters = timeRange !== 'all' || statusFilter !== 'all';

  if (showLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-7 w-32 animate-pulse" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }} />
              <div className="h-4 w-48 mt-2 animate-pulse" style={{ backgroundColor: 'rgba(0, 212, 255, 0.05)', borderRadius: '4px' }} />
            </div>
            <div className="h-9 w-24 animate-pulse" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 h-24 animate-pulse" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }} />
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 animate-pulse" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }} />
            <div className="h-96 animate-pulse" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }} />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Welcome Modal for first-time users */}
      {isFirstTimeUser && (
        <WelcomeModal
          onComplete={markOnboardingComplete}
          onDismiss={dismissOnboarding}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {/* Section accent line - cyan gradient */}
            <div className="flex items-center gap-3 mb-2">
              <div style={{ width: '48px', height: '2px', background: 'linear-gradient(to right, #00D4FF, transparent)' }} />
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-wider" style={{ color: '#E8ECF4' }}>Dashboard</h1>
            <p className="text-sm mt-0.5" style={{ color: '#8896AD' }}>
              <span className="font-mono">{workflowCount}</span> workflows &middot; <span className="font-mono">{stats.totalExecutions}</span> executions
            </p>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="h-9 px-3 flex items-center gap-2 text-sm transition-colors"
            style={{ color: '#8896AD', backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '4px' }}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            <span className="hidden sm:inline uppercase tracking-wider text-xs">Refresh</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Executions */}
          <div className="p-4" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}>
            <div className="flex items-center gap-3">
              <div className="p-2" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }}>
                <Activity className="w-5 h-5" style={{ color: '#00D4FF' }} />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono" style={{ color: '#E8ECF4' }}>{stats.totalExecutions}</p>
                <p className="text-[11px] uppercase tracking-wider" style={{ color: '#8896AD' }}>Total Executions</p>
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="p-4" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}>
            <div className="flex items-center gap-3">
              <div className="relative p-2" style={{ backgroundColor: 'rgba(0, 229, 160, 0.08)', borderRadius: '4px' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#00E5A0' }} />
                {/* LED dot */}
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: '#00E5A0', boxShadow: '0 0 4px rgba(0, 229, 160, 0.5)' }} />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono" style={{ color: '#E8ECF4' }}>{stats.successRate}%</p>
                <p className="text-[11px] uppercase tracking-wider" style={{ color: '#8896AD' }}>Success Rate</p>
              </div>
            </div>
          </div>

          {/* Failed */}
          <div className="p-4" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}>
            <div className="flex items-center gap-3">
              <div className="relative p-2" style={{ backgroundColor: 'rgba(255, 77, 106, 0.08)', borderRadius: '4px' }}>
                <XCircle className="w-5 h-5" style={{ color: '#FF4D6A' }} />
                {stats.failedExecutions > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: '#FF4D6A', boxShadow: '0 0 4px rgba(255, 77, 106, 0.5)' }} />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold font-mono" style={{ color: '#E8ECF4' }}>{stats.failedExecutions}</p>
                <p className="text-[11px] uppercase tracking-wider" style={{ color: '#8896AD' }}>Failed</p>
              </div>
            </div>
          </div>

          {/* Avg Duration */}
          <div className="p-4" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}>
            <div className="flex items-center gap-3">
              <div className="p-2" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }}>
                <Timer className="w-5 h-5" style={{ color: '#00D4FF' }} />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono" style={{ color: '#E8ECF4' }}>{formatDuration(stats.avgDuration)}</p>
                <p className="text-[11px] uppercase tracking-wider" style={{ color: '#8896AD' }}>Avg Duration</p>
              </div>
            </div>
          </div>

          {/* Total Cost */}
          <div className="p-4" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}>
            <div className="flex items-center gap-3">
              <div className="p-2" style={{ backgroundColor: 'rgba(255, 184, 0, 0.08)', borderRadius: '4px' }}>
                <DollarSign className="w-5 h-5" style={{ color: '#FFB800' }} />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono" style={{ color: '#FFB800' }}>{formatCost(stats.totalCost)}</p>
                <p className="text-[11px] uppercase tracking-wider" style={{ color: '#8896AD' }}>Total Cost</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Executions */}
          <div className="lg:col-span-2 overflow-hidden" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.12)' }}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: '#00D4FF' }} />
                <h2 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#8896AD' }}>
                  Recent Executions
                  {hasActiveFilters && (
                    <span className="ml-2 text-xs font-normal font-mono" style={{ color: '#506080' }}>
                      ({filteredExecutions.length}/{stats.recentExecutions.length})
                    </span>
                  )}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {filteredStats.running > 0 && (
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: '#00D4FF' }}>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {filteredStats.running} running
                  </span>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-1.5 transition-colors"
                  style={{
                    borderRadius: '4px',
                    backgroundColor: showFilters || hasActiveFilters ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                    color: showFilters || hasActiveFilters ? '#00D4FF' : '#8896AD',
                  }}
                  title="Filter executions"
                >
                  <Filter className="w-4 h-4" />
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
                  className="overflow-hidden"
                  style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.08)' }}
                >
                  <div className="p-3 flex flex-wrap items-center gap-3" style={{ backgroundColor: 'rgba(0, 212, 255, 0.02)' }}>
                    {/* Time Range - Button Pills */}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" style={{ color: '#506080' }} />
                      <div className="flex items-center p-0.5" style={{ backgroundColor: '#0F1729', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '4px' }}>
                        {timeRangeOptions.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setTimeRange(opt.value)}
                            className="px-2.5 py-1 text-xs font-medium transition-all"
                            style={{
                              borderRadius: '4px',
                              backgroundColor: timeRange === opt.value ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                              color: timeRange === opt.value ? '#00D4FF' : '#8896AD',
                            }}
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
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.15 }}
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
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="w-px h-5" style={{ backgroundColor: 'rgba(0, 212, 255, 0.12)' }} />

                    {/* Status Filter */}
                    <div className="flex items-center p-0.5" style={{ backgroundColor: '#0F1729', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '4px' }}>
                      {statusFilterOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setStatusFilter(opt.value)}
                          className="px-2.5 py-1 text-xs font-medium transition-all"
                          style={{
                            borderRadius: '4px',
                            backgroundColor: statusFilter === opt.value ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                            color: statusFilter === opt.value ? '#00D4FF' : '#8896AD',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                      <>
                        <div className="w-px h-5" style={{ backgroundColor: 'rgba(0, 212, 255, 0.12)' }} />
                        <button
                          onClick={() => {
                            setTimeRange('all');
                            setStatusFilter('all');
                            setCustomDateError(null);
                          }}
                          className="px-2.5 py-1 text-xs font-medium transition-colors"
                          style={{ color: '#FF4D6A', borderRadius: '4px' }}
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {filteredExecutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: '#8896AD' }}>
                <Activity className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">
                  {hasActiveFilters ? 'No matching executions' : 'No executions yet'}
                </p>
                <p className="text-xs mt-1" style={{ color: '#506080' }}>
                  {hasActiveFilters ? 'Try adjusting your filters' : 'Run a workflow to see history'}
                </p>
                {!hasActiveFilters && (
                  <button
                    onClick={() => navigate('/workflows')}
                    className="mt-4 h-8 px-4 text-xs font-medium transition-colors uppercase tracking-wider"
                    style={{ backgroundColor: 'rgba(0, 212, 255, 0.15)', color: '#00D4FF', borderRadius: '4px', border: '1px solid rgba(0, 212, 255, 0.3)' }}
                  >
                    Go to Workflows
                  </button>
                )}
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setTimeRange('all');
                      setStatusFilter('all');
                    }}
                    className="mt-4 h-8 px-4 text-xs font-medium transition-colors"
                    style={{ color: '#00D4FF', borderRadius: '4px' }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {filteredExecutions.slice(0, 20).map((exec) => {
                  const stepsArray = exec.steps ? sortStepsByType(Object.values(exec.steps)) : [];
                  return (
                    <ExecutionTreeRow
                      key={exec.execution_id}
                      exec={exec}
                      steps={stepsArray}
                      onNavigate={(id) => navigate(`/workflows/builder?id=${id}`)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Onboarding Checklist + Workflows Panel */}
          <div className="space-y-6">
            {/* Onboarding Checklist - shown until user completes onboarding */}
            {!hasCompletedOnboarding && (
              <OnboardingChecklist
                hasConnections={connectionCount > 0}
                hasWorkflows={workflowCount > 0}
                hasExecutions={stats.totalExecutions > 0}
                onDismiss={markOnboardingComplete}
              />
            )}

            {/* Workflows Panel */}
            <div className="overflow-hidden" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.12)' }}>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" style={{ color: '#00D4FF' }} />
                  <h2 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#8896AD' }}>Workflows</h2>
                </div>
                <span className="text-xs font-mono" style={{ color: '#506080' }}>{workflowCount} total</span>
              </div>

            {Object.keys(stats.executionsByWorkflow).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: '#506080' }}>
                <Zap className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No workflow data</p>
              </div>
            ) : (
              <div>
                {Object.entries(stats.executionsByWorkflow)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .slice(0, 5)
                  .map(([workflowId, data]) => (
                    <div
                      key={workflowId}
                      className="px-4 py-3 transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.08)' }}
                      onClick={() => navigate(`/workflows/builder?id=${workflowId}`)}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 212, 255, 0.04)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium truncate flex-1 mr-3" style={{ color: '#E8ECF4' }}>
                          {data.name}
                        </p>
                        <span className="text-xs font-mono" style={{ color: '#506080' }}>{data.count} runs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 overflow-hidden" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }}>
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${data.successRate}%`,
                              backgroundColor: data.successRate >= 80 ? '#00E5A0' : data.successRate >= 50 ? '#FFB800' : '#FF4D6A',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono font-medium w-10 text-right" style={{ color: '#E8ECF4' }}>
                          {data.successRate}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(0, 212, 255, 0.08)' }}>
              <button
                onClick={() => navigate('/workflows')}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium transition-colors uppercase tracking-wider"
                style={{ color: '#00D4FF' }}
              >
                View all workflows
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/workflows/builder')}
            className="p-4 transition-all group text-left"
            style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 212, 255, 0.3)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(0, 212, 255, 0.1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 212, 255, 0.12)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 transition-colors" style={{ backgroundColor: 'rgba(0, 212, 255, 0.1)', borderRadius: '4px' }}>
                <Plus className="w-5 h-5" style={{ color: '#00D4FF' }} />
              </div>
              <div>
                <h3 className="font-medium text-sm uppercase tracking-wider" style={{ color: '#E8ECF4' }}>Create Workflow</h3>
                <p className="text-xs" style={{ color: '#506080' }}>Build a new pipeline</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/workflows')}
            className="p-4 transition-all group text-left"
            style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 212, 255, 0.3)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(0, 212, 255, 0.1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 212, 255, 0.12)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 transition-colors" style={{ backgroundColor: 'rgba(255, 184, 0, 0.1)', borderRadius: '4px' }}>
                <PlayCircle className="w-5 h-5" style={{ color: '#FFB800' }} />
              </div>
              <div>
                <h3 className="font-medium text-sm uppercase tracking-wider" style={{ color: '#E8ECF4' }}>Run Workflow</h3>
                <p className="text-xs" style={{ color: '#506080' }}>Execute pipelines</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/connections')}
            className="p-4 transition-all group text-left"
            style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 212, 255, 0.3)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(0, 212, 255, 0.1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 212, 255, 0.12)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 transition-colors" style={{ backgroundColor: 'rgba(0, 229, 160, 0.1)', borderRadius: '4px' }}>
                <Link2 className="w-5 h-5" style={{ color: '#00E5A0' }} />
              </div>
              <div>
                <h3 className="font-medium text-sm uppercase tracking-wider" style={{ color: '#E8ECF4' }}>Connections</h3>
                <p className="text-xs" style={{ color: '#506080' }}>Manage data sources</p>
              </div>
            </div>
          </button>
        </div>
      </div>

    </Layout>
  );
};

export default DashboardPage;
