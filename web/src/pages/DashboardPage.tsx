import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Plus,
  Zap,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { useFetchOnce } from '@/hooks/useStableRequest';
import { executionHistoryService, DashboardStats } from '@/services/executionHistoryService';
import { workflowApiService } from '@/services/workflowApiService';
import { fetchClient } from '@/lib/fetchClient';
import {
  ExecutionHistory,
  ExecutionStep,
} from '@/types/backend';
import {
  type TimeRange,
  type StatusFilter,
  timeRangeOptions,
  statusFilterOptions,
  MAX_CUSTOM_RANGE_DAYS,
  getTimeRangeStart,
  getDefaultCustomDates,
  formatDuration,
  formatRelativeTime,
  formatNumber,
  formatCost,
  getRecordsCount,
} from '@/utils/executionFormatters';

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
  if (type === 'source') return 'text-info';
  if (type === 'transform') return 'text-primary-400';
  if (type === 'destinations' || type === 'destination') return 'text-success';
  return 'text-text-tertiary';
};

// Status configuration
const statusConfig = {
  SUCCESS: { bg: 'bg-success-light', text: 'text-success', icon: CheckCircle2 },
  FAILED: { bg: 'bg-error-light', text: 'text-error', icon: XCircle },
  RUNNING: { bg: 'bg-info-light', text: 'text-info', icon: Loader2 },
  PENDING: { bg: 'bg-warning-light', text: 'text-warning', icon: Clock },
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

  // Status dot color
  const statusDotClass = exec.status === 'SUCCESS' ? 'bg-success' : exec.status === 'FAILED' ? 'bg-error' : exec.status === 'RUNNING' ? 'bg-info' : 'bg-warning';

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-800/50 transition-colors cursor-pointer group border-b border-neutral-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button
          className="p-0.5 hover:bg-surface-tertiary transition-colors flex-shrink-0 rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          )}
        </button>

        {/* Status circle */}
        <div className="flex-shrink-0">
          <span className={cn("inline-block w-3 h-3 rounded-full", statusDotClass)} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate text-sm text-text-primary">
            {exec.workflow_name || 'Unknown Workflow'}
          </p>
          <p className="text-xs text-text-secondary">
            {formatRelativeTime(exec.start_time)}
          </p>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {totalRecords > 0 && (
            <span className="text-xs hidden sm:inline text-text-secondary">
              {formatNumber(totalRecords)} records
            </span>
          )}
          <span className="px-2 py-0.5 text-xs font-semibold text-text-primary bg-surface-tertiary border border-neutral-800 rounded-md">
            {exec.status}
          </span>
          <span className="text-xs w-16 text-right text-text-secondary">
            {formatDuration(exec.duration)}
          </span>
          <span className="text-xs text-text-secondary">
            {exec.successful_nodes}/{exec.total_nodes}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(exec.workflow_id);
            }}
            className="p-1.5 transition-colors opacity-0 group-hover:opacity-100 rounded-md text-text-secondary"
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
            className="overflow-hidden bg-surface-tertiary"
          >
            {/* Table Header */}
            <div className="flex items-center gap-3 px-4 py-2 ml-8 text-[10px] font-semibold border-b border-neutral-800 border-l-2 border-l-neutral-700 text-text-secondary">
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
                  className="flex items-center gap-3 px-4 py-2 ml-8 border-l-2 border-l-neutral-700"
                >
                  <StepIcon className={cn("w-4 h-4 flex-shrink-0", stepConfig.text, step.status === 'RUNNING' && "animate-spin")} />
                  <span className={cn("flex-1 text-sm font-semibold truncate", getNodeTypeColor(step.node_type))}>
                    {step.node_id}
                  </span>
                  <span className="w-24 text-xs text-text-secondary">{step.node_type}</span>
                  <span className="w-20 text-xs text-right font-semibold text-text-primary">
                    {recordsCount !== null ? formatNumber(recordsCount) : '-'}
                  </span>
                  <span className="w-14 text-xs text-right text-text-secondary">
                    {stepDuration !== null ? `${stepDuration.toFixed(1)}s` : '-'}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      {isExpanded && steps.length === 0 && (
        <div className="px-4 py-6 ml-8 text-center text-sm text-text-secondary">
          No step data available for this execution.
        </div>
      )}
    </>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter state - show filters by default
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFilters, setShowFilters] = useState(true);
  const [customDateRange, setCustomDateRange] = useState(getDefaultCustomDates);

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
      setFetchError(null);
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

      // Build workflow id→name map to pass to dashboard stats (avoids duplicate DB query)
      const workflowMap: Record<string, string> = {};
      for (const w of workflows) {
        const id = (typeof w._id === 'object' ? w._id?.$oid : w._id) || w.job_id;
        if (id) workflowMap[id] = w.job_name || '';
      }

      const dashboardStats = await executionHistoryService.getDashboardStats(workflowMap);
      setStats(dashboardStats);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setFetchError('Failed to load dashboard data. Please try again.');
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
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-6 w-40 animate-pulse bg-neutral-800 rounded" />
              <div className="h-4 w-56 mt-2 animate-pulse bg-neutral-800 rounded" />
            </div>
            <div className="h-9 w-20 animate-pulse bg-neutral-800 rounded" />
          </div>

          {/* KPIs skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse bg-neutral-800 rounded-lg" />
            ))}
          </div>

          {/* Main content skeleton */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 animate-pulse bg-neutral-800 rounded-lg" />
            <div className="h-96 animate-pulse bg-neutral-800 rounded-lg" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with title and refresh */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Pipeline Executions</h1>
            <p className="text-sm text-text-tertiary mt-1">
              {workflowCount} workflows • {stats.totalExecutions} total runs
            </p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="h-9 px-3 flex items-center gap-2 text-xs font-medium transition-all text-text-secondary hover:text-text-primary bg-neutral-800/50 border border-neutral-700/50 rounded-lg hover:bg-neutral-700/50"
            title="Refresh data"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Error Banner */}
        {fetchError && (
          <div className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-center justify-between">
            <p className="text-sm text-error">{fetchError}</p>
            <button
              onClick={() => fetchData()}
              className="text-sm text-primary-400 hover:text-primary-300 font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* KPI Cards - 4 Column Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Runs - Yellow accent */}
          <div
            className="p-4 rounded-lg border transition-all"
            style={{
              backgroundColor: 'rgb(15, 15, 18 / 0.8)',
              borderColor: 'rgba(255, 255, 255, 0.06)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            }}
          >
            <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold mb-2">
              Total Runs
            </p>
            <p className="text-3xl font-bold text-primary-400" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {stats.totalExecutions}
            </p>
          </div>

          {/* Success Rate - Green */}
          <div
            className="p-4 rounded-lg border transition-all"
            style={{
              backgroundColor: 'rgb(15, 15, 18 / 0.8)',
              borderColor: 'rgba(255, 255, 255, 0.06)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            }}
          >
            <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold mb-2">
              Success Rate
            </p>
            <p className="text-3xl font-bold text-success" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {stats.successRate}%
            </p>
          </div>

          {/* Failed Runs - Red */}
          <div
            className="p-4 rounded-lg border transition-all"
            style={{
              backgroundColor: 'rgb(15, 15, 18 / 0.8)',
              borderColor: 'rgba(255, 255, 255, 0.06)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            }}
          >
            <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold mb-2">
              Failed Runs
            </p>
            <p className="text-3xl font-bold text-error" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {stats.failedExecutions}
            </p>
          </div>

          {/* Avg Duration */}
          <div
            className="p-4 rounded-lg border transition-all"
            style={{
              backgroundColor: 'rgb(15, 15, 18 / 0.8)',
              borderColor: 'rgba(255, 255, 255, 0.06)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            }}
          >
            <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold mb-2">
              Avg Duration
            </p>
            <p className="text-3xl font-bold text-neutral-200" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {formatDuration(stats.avgDuration)}
            </p>
          </div>
        </div>

        {/* Main Content - 2/3 + 1/3 layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Execution Log Table - 2/3 width */}
          <div className="lg:col-span-2 overflow-hidden rounded-lg border transition-all" style={{
            backgroundColor: 'rgb(15, 15, 18 / 0.8)',
            borderColor: 'rgba(255, 255, 255, 0.06)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-400" />
                <h2 className="text-sm font-semibold text-text-primary">
                  Recent Executions
                  {hasActiveFilters && (
                    <span className="ml-2 text-xs font-normal text-text-secondary">
                      ({filteredExecutions.length}/{stats.recentExecutions.length})
                    </span>
                  )}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {filteredStats.running > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-info">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {filteredStats.running} running
                  </span>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'p-1.5 transition-colors rounded-md',
                    showFilters || hasActiveFilters
                      ? 'bg-primary-400 text-neutral-950'
                      : 'text-text-secondary hover:bg-surface-tertiary'
                  )}
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
                  className="overflow-hidden border-b border-neutral-800"
                >
                  <div className="p-3 flex flex-wrap items-center gap-3 bg-surface-tertiary">
                    {/* Time Range - Button Pills */}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                      <div className="flex items-center p-0.5 bg-surface-secondary border border-neutral-800 rounded-md">
                        {timeRangeOptions.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setTimeRange(opt.value)}
                            className={cn(
                              "px-2.5 py-1 text-xs font-semibold transition-all rounded-md",
                              timeRange === opt.value
                                ? 'bg-neutral-800 text-primary-400'
                                : 'text-text-secondary'
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
                            }}
                            maxDays={MAX_CUSTOM_RANGE_DAYS}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="w-px h-5 bg-border" />

                    {/* Status Filter */}
                    <div className="flex items-center p-0.5 bg-surface-secondary border border-neutral-800 rounded-md">
                      {statusFilterOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setStatusFilter(opt.value)}
                          className={cn(
                            "px-2.5 py-1 text-xs font-semibold transition-all rounded-md",
                            statusFilter === opt.value
                              ? 'bg-neutral-800 text-primary-400'
                              : 'text-text-secondary'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                      <>
                        <div className="w-px h-5 bg-border" />
                        <button
                          onClick={() => {
                            setTimeRange('all');
                            setStatusFilter('all');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold transition-colors text-error rounded-md"
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
              <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                <Activity className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-semibold">
                  {hasActiveFilters ? 'No matching executions' : 'No executions yet'}
                </p>
                <p className="text-xs mt-1">
                  {hasActiveFilters ? 'Try adjusting your filters' : 'Run a workflow to see history'}
                </p>
                {!hasActiveFilters && (
                  <button
                    onClick={() => navigate('/workflows')}
                    className="mt-4 h-8 px-4 text-xs font-semibold text-neutral-950 transition-colors bg-primary-400 hover:bg-primary-500 rounded-md"
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
                    className="mt-4 h-8 px-4 text-xs font-semibold transition-colors text-error rounded-lg"
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
            {/* Workflows Panel */}
            <div className="overflow-hidden bg-surface-secondary border border-neutral-800 rounded-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary-400" />
                  <h2 className="text-sm font-semibold text-text-primary">Workflows</h2>
                </div>
                <span className="text-xs text-text-secondary">{workflowCount} total</span>
              </div>

            {Object.keys(stats.executionsByWorkflow).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
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
                      className="px-4 py-3 hover:bg-neutral-800/50 transition-colors cursor-pointer border-b border-neutral-800"
                      onClick={() => navigate(`/workflows/builder?id=${workflowId}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold truncate flex-1 mr-3 text-text-primary">
                          {data.name}
                        </p>
                        <span className="text-xs text-text-secondary">{data.count} runs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 overflow-hidden bg-border rounded-md">
                          <div
                            className={cn(
                              "h-full transition-all rounded-md",
                              data.successRate >= 80 ? 'bg-success' : data.successRate >= 50 ? 'bg-warning' : 'bg-error'
                            )}
                            style={{ width: `${data.successRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold w-10 text-right text-text-primary">
                          {data.successRate}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="px-4 py-3 border-t border-neutral-800">
              <button
                onClick={() => navigate('/workflows')}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold transition-colors text-primary-400 hover:text-primary-300"
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
            className="p-4 transition-all group text-left bg-surface-secondary border border-neutral-800 rounded-xl hover:border-primary-400/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 transition-colors bg-primary-400 rounded-lg">
                <Plus className="w-5 h-5 text-neutral-950" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-text-primary">Create Workflow</h3>
                <p className="text-xs text-text-secondary">Build a new pipeline</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/workflows')}
            className="p-4 transition-all group text-left bg-surface-secondary border border-neutral-800 rounded-xl hover:border-neutral-700"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 transition-colors bg-surface-tertiary rounded-lg">
                <PlayCircle className="w-5 h-5 text-text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-text-primary">Run Workflow</h3>
                <p className="text-xs text-text-secondary">Execute pipelines</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/connections')}
            className="p-4 transition-all group text-left bg-surface-secondary border border-neutral-800 rounded-xl hover:border-neutral-700"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 transition-colors bg-surface-tertiary rounded-lg">
                <Link2 className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-text-primary">Connections</h3>
                <p className="text-xs text-text-secondary">Manage data sources</p>
              </div>
            </div>
          </button>
        </div>
      </div>

    </Layout>
  );
};

export default DashboardPage;
