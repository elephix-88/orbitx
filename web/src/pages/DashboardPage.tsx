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
  Play,
  Link2,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { useFetchOnce } from '@/hooks/useStableRequest';
import { executionHistoryService, DashboardStats } from '@/services/executionHistoryService';
import { workflowApiService } from '@/services/workflowApiService';
import { fetchClient } from '@/lib/fetchClient';
import { ExecutionHistory, ExecutionStep } from '@/types/backend';
import {
  formatDuration,
  formatRelativeTime,
  formatNumber,
  getRecordsCount,
} from '@/utils/executionFormatters';

// Sparkline component
const Sparkline = ({ 
  data, 
  color, 
  width = 80, 
  height = 28 
}: { 
  data: number[]; 
  color: string; 
  width?: number; 
  height?: number;
}) => {
  if (data.length < 2) return null;
  
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  
  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * width,
    y: height - ((value - min) / range) * height * 0.8 - height * 0.1,
  }));

  // Create smooth bezier path
  const pathD = points.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + point.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  const gradientId = `sparkline-gradient-${color.replace('#', '')}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathD} L ${width} ${height} L 0 ${height} Z`}
        fill={`url(#${gradientId})`}
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Activity Chart component (spans 2 rows in bento grid)
const ActivityChart = ({ 
  successData, 
  failedData, 
  labels 
}: { 
  successData: number[]; 
  failedData: number[]; 
  labels: string[];
}) => {
  const width = 320;
  const height = 200;
  const padding = { top: 30, right: 20, bottom: 30, left: 35 };
  
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const allData = [...successData, ...failedData];
  const max = Math.max(...allData, 1);
  
  const getY = (value: number) => 
    padding.top + chartHeight - (value / max) * chartHeight;
  
  const getX = (index: number) => 
    padding.left + (index / (successData.length - 1)) * chartWidth;

  const createPath = (data: number[]) => {
    return data.map((value, i) => {
      const x = getX(i);
      const y = getY(value);
      if (i === 0) return `M ${x} ${y}`;
      const prevX = getX(i - 1);
      const prevY = getY(data[i - 1]);
      const cpX = (prevX + x) / 2;
      return `C ${cpX} ${prevY}, ${cpX} ${y}, ${x} ${y}`;
    }).join(' ');
  };

  const createAreaPath = (data: number[]) => {
    const linePath = createPath(data);
    return `${linePath} L ${getX(data.length - 1)} ${padding.top + chartHeight} L ${getX(0)} ${padding.top + chartHeight} Z`;
  };

  // Y-axis gridlines at 0, mid, max
  const gridLines = [0, max / 2, max].map(v => ({
    y: getY(v),
    label: Math.round(v).toString(),
  }));

  return (
    <div className="w-full h-full flex flex-col">
      {/* Legend */}
      <div className="flex items-center justify-end gap-4 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }} />
          <span className="text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.50)' }}>Success</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
          <span className="text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.50)' }}>Failed</span>
        </div>
      </div>
      
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="success-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="failed-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line 
              x1={padding.left} 
              y1={line.y} 
              x2={width - padding.right} 
              y2={line.y} 
              stroke="rgba(255, 255, 255, 0.04)" 
              strokeWidth="1" 
            />
            <text 
              x={padding.left - 8} 
              y={line.y + 3} 
              textAnchor="end" 
              style={{ fontSize: '9px', fill: 'rgba(255, 255, 255, 0.16)' }}
            >
              {line.label}
            </text>
          </g>
        ))}

        {/* Area fills */}
        <path d={createAreaPath(successData)} fill="url(#success-gradient)" />
        <path d={createAreaPath(failedData)} fill="url(#failed-gradient)" />

        {/* Lines */}
        <path d={createPath(successData)} fill="none" stroke="#10B981" strokeWidth="1.5" />
        <path d={createPath(failedData)} fill="none" stroke="#EF4444" strokeWidth="1.5" />

        {/* Data points */}
        {successData.map((value, i) => (
          <circle 
            key={`s-${i}`}
            cx={getX(i)} 
            cy={getY(value)} 
            r="2.5" 
            fill="rgb(22, 22, 25)"
            stroke="#10B981" 
            strokeWidth="1.5" 
          />
        ))}
        {failedData.map((value, i) => (
          <circle 
            key={`f-${i}`}
            cx={getX(i)} 
            cy={getY(value)} 
            r="2.5" 
            fill="rgb(22, 22, 25)"
            stroke="#EF4444" 
            strokeWidth="1.5" 
          />
        ))}

        {/* X-axis labels */}
        {labels.map((label, i) => (
          <text 
            key={i}
            x={getX(i)} 
            y={height - 8} 
            textAnchor="middle"
            style={{ fontSize: '9px', fill: 'rgba(255, 255, 255, 0.16)' }}
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
};

// KPI Card component
const KPICard = ({ 
  label, 
  value, 
  subtitle, 
  color, 
  sparklineData,
  hasBrandGlow = false,
}: {
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
  sparklineData: number[];
  hasBrandGlow?: boolean;
}) => (
  <div 
    className={cn("relative p-4 rounded-[14px] overflow-hidden", hasBrandGlow && "card-brand-glow")}
    style={{ 
      backgroundColor: 'rgb(22, 22, 25)',
      border: '1px solid rgba(255, 255, 255, 0.055)',
      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    }}
  >
    {/* Top row: label + sparkline */}
    <div className="flex items-start justify-between mb-3">
      <span 
        className="text-[10px] font-semibold uppercase tracking-[0.09em]"
        style={{ color: 'rgba(255, 255, 255, 0.28)' }}
      >
        {label}
      </span>
      <Sparkline data={sparklineData} color={color} />
    </div>
    
    {/* Big number + subtitle */}
    <div>
      <p 
        className="font-display text-[38px] font-bold tracking-[-0.03em]"
        style={{ 
          color: color,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </p>
      <p 
        className="text-[11px] mt-0.5"
        style={{ color: 'rgba(255, 255, 255, 0.28)' }}
      >
        {subtitle}
      </p>
    </div>
  </div>
);

// Execution Row Component
const ExecutionRow = ({
  exec,
  steps,
  onNavigate,
}: {
  exec: ExecutionHistory;
  steps: ExecutionStep[];
  onNavigate: (id: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    SUCCESS: '#10B981',
    FAILED: '#EF4444',
    RUNNING: '#3B82F6',
    PENDING: '#F59E0B',
  };

  const statusText: Record<string, string> = {
    SUCCESS: 'Success',
    FAILED: 'Failed',
    RUNNING: 'Running',
    PENDING: 'Pending',
  };

  const totalRecords = steps.reduce((sum, step) => {
    const count = getRecordsCount(step.output);
    return sum + (count || 0);
  }, 0);

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer group"
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.035)' }}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.018)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        {/* Expand chevron */}
        <button
          className="p-0.5 rounded-md flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? (
            <ChevronDown size={14} style={{ color: 'rgba(255, 255, 255, 0.50)' }} />
          ) : (
            <ChevronRight size={14} style={{ color: 'rgba(255, 255, 255, 0.50)' }} />
          )}
        </button>

        {/* Status dot */}
        <span 
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: statusColors[exec.status] || statusColors.PENDING }}
        />

        {/* Workflow name */}
        <div className="flex-1 min-w-0">
          <p 
            className="text-[13px] font-medium truncate"
            style={{ color: 'rgba(255, 255, 255, 0.88)' }}
          >
            {exec.workflow_name || 'Unknown Workflow'}
          </p>
        </div>

        {/* Status text */}
        <span 
          className="text-[13px] w-16"
          style={{ color: statusColors[exec.status] || statusColors.PENDING }}
        >
          {statusText[exec.status] || exec.status}
        </span>

        {/* Records (monospace) */}
        <span 
          className="text-[12px] font-mono w-16 text-right"
          style={{ color: 'rgba(255, 255, 255, 0.50)' }}
        >
          {totalRecords > 0 ? formatNumber(totalRecords) : '-'}
        </span>

        {/* Duration (monospace) */}
        <span 
          className="text-[12px] font-mono w-14 text-right"
          style={{ color: 'rgba(255, 255, 255, 0.50)' }}
        >
          {formatDuration(exec.duration)}
        </span>

        {/* Nodes */}
        <span 
          className="text-[12px] w-10 text-right"
          style={{ color: 'rgba(255, 255, 255, 0.50)' }}
        >
          {exec.successful_nodes}/{exec.total_nodes}
        </span>

        {/* When */}
        <span 
          className="text-[12px] font-mono w-14 text-right"
          style={{ color: 'rgba(255, 255, 255, 0.28)' }}
        >
          {formatRelativeTime(exec.start_time)}
        </span>

        {/* Navigate arrow (appears on hover) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(exec.workflow_id);
          }}
          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'rgba(255, 255, 255, 0.50)' }}
        >
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Expanded step details */}
      <AnimatePresence>
        {isExpanded && steps.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            style={{ backgroundColor: 'rgb(28, 28, 33)' }}
          >
            {steps.map((step, idx) => {
              const stepDuration = step.start_time && step.end_time 
                ? step.end_time - step.start_time 
                : null;
              const recordsCount = getRecordsCount(step.output);
              const StepIcon = step.status === 'SUCCESS' ? CheckCircle2 
                : step.status === 'FAILED' ? XCircle 
                : step.status === 'RUNNING' ? Loader2 
                : Clock;

              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-4 py-2 ml-8"
                  style={{ borderLeft: '2px solid rgba(255, 255, 255, 0.06)' }}
                >
                  <StepIcon 
                    size={14} 
                    style={{ color: statusColors[step.status] || statusColors.PENDING }}
                    className={step.status === 'RUNNING' ? 'animate-spin' : ''}
                  />
                  <span 
                    className="flex-1 text-[13px] font-medium truncate"
                    style={{ color: 'rgba(255, 255, 255, 0.88)' }}
                  >
                    {step.node_id}
                  </span>
                  <span 
                    className="text-[12px] w-24"
                    style={{ color: 'rgba(255, 255, 255, 0.50)' }}
                  >
                    {step.node_type}
                  </span>
                  <span 
                    className="text-[12px] font-mono w-20 text-right"
                    style={{ color: 'rgba(255, 255, 255, 0.88)' }}
                  >
                    {recordsCount !== null ? formatNumber(recordsCount) : '-'}
                  </span>
                  <span 
                    className="text-[12px] font-mono w-14 text-right"
                    style={{ color: 'rgba(255, 255, 255, 0.50)' }}
                  >
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

// Quick Action Card
const QuickActionCard = ({
  icon: Icon,
  title,
  subtitle,
  onClick,
  isPrimary = false,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
  isPrimary?: boolean;
}) => (
  <button
    onClick={onClick}
    className="p-4 text-left rounded-[14px] transition-all group"
    style={{ 
      backgroundColor: 'rgb(22, 22, 25)',
      border: '1px solid rgba(255, 255, 255, 0.055)',
      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = isPrimary 
        ? 'rgba(250, 204, 21, 0.5)' 
        : 'rgba(255, 255, 255, 0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.055)';
    }}
  >
    <div className="flex items-center gap-3">
      <div 
        className="w-7 h-7 flex items-center justify-center rounded-lg"
        style={{ 
          backgroundColor: isPrimary ? '#FACC15' : 'rgba(255, 255, 255, 0.06)',
        }}
      >
        <Icon 
          size={14} 
          style={{ color: isPrimary ? 'rgb(13, 13, 16)' : 'rgba(255, 255, 255, 0.88)' }} 
        />
      </div>
      <div className="flex-1">
        <h3 
          className="text-[13px] font-semibold"
          style={{ color: 'rgba(255, 255, 255, 0.88)' }}
        >
          {title}
        </h3>
        <p 
          className="text-[11px]"
          style={{ color: 'rgba(255, 255, 255, 0.28)' }}
        >
          {subtitle}
        </p>
      </div>
      <ArrowRight 
        size={14} 
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'rgba(255, 255, 255, 0.50)' }}
      />
    </div>
  </button>
);

// Main Dashboard Page
const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      if (isManualRefresh) setRefreshing(true);

      const [workflowsResponse, connectionsResponse] = await Promise.all([
        workflowApiService.getWorkflows(),
        fetchClient('/api/connections').then(r => r.json()).catch(() => ({ data: [] })),
      ]);

      const workflows = workflowsResponse.data || [];
      setWorkflowCount(workflows.length);

      const connections = Array.isArray(connectionsResponse?.data)
        ? connectionsResponse.data
        : Array.isArray(connectionsResponse)
        ? connectionsResponse
        : [];
      setConnectionCount(connections.length);

      const workflowMap: Record<string, string> = {};
      for (const w of workflows) {
        const id = (typeof w._id === 'object' ? w._id?.$oid : w._id) || w.job_id;
        if (id) workflowMap[id] = w.job_name || '';
      }

      const dashboardStats = await executionHistoryService.getDashboardStats(workflowMap);
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

  // Get current date info for header
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  // Generate chart data (placeholder or real)
  const chartLabels = useMemo(() => {
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(`${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`);
    }
    return labels;
  }, []);

  // Placeholder chart data
  const successChartData = [1, 2, 1, 3, 7, 6, 4];
  const failedChartData = [0, 1, 0, 1, 1, 2, 1];

  // Sparkline data for KPIs
  const totalRunsSparkline = [5, 7, 4, 8, 6, 9, 11];
  const successRateSparkline = [70, 75, 80, 78, 85, 82, 82];
  const failedSparkline = [1, 0, 2, 1, 1, 2, 2];
  const durationSparkline = [90, 85, 100, 95, 88, 100, 100];

  // Sort steps by type
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

  if (showLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <div className="h-5 w-32 animate-pulse rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />
              <div className="h-4 w-56 mt-2 animate-pulse rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />
            </div>
            <div className="h-8 w-24 animate-pulse rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />
          </div>

          {/* Bento grid skeleton */}
          <div className="grid grid-cols-3 gap-3" style={{ gridTemplateColumns: '1fr 1fr 1.8fr' }}>
            <div className="h-[132px] animate-pulse rounded-[14px]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />
            <div className="h-[132px] animate-pulse rounded-[14px]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />
            <div className="row-span-2 animate-pulse rounded-[14px]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />
            <div className="h-[132px] animate-pulse rounded-[14px]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />
            <div className="h-[132px] animate-pulse rounded-[14px]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 
              className="font-display text-[18px] font-semibold"
              style={{ color: 'rgba(255, 255, 255, 0.88)' }}
            >
              Dashboard
            </h1>
            <p 
              className="text-[12px] mt-1"
              style={{ color: 'rgba(255, 255, 255, 0.28)' }}
            >
              {dayName}, {monthDay} &middot; {workflowCount} workflow{workflowCount !== 1 ? 's' : ''} &middot; {connectionCount} connection{connectionCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats.runningExecutions > 0 && (
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#3B82F6' }} />
                <span className="text-[11px] font-medium" style={{ color: '#3B82F6' }}>
                  {stats.runningExecutions} running
                </span>
              </div>
            )}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="h-8 px-3 flex items-center gap-2 text-[12px] font-medium rounded-lg transition-colors"
              style={{ 
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.055)',
                color: 'rgba(255, 255, 255, 0.50)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.88)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.50)';
              }}
            >
              <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* SECTION A: Bento Grid */}
        <div 
          className="grid gap-3"
          style={{ 
            gridTemplateColumns: '1fr 1fr 1.8fr',
            gridTemplateRows: 'repeat(2, 132px)',
          }}
        >
          {/* Top-left: Total Runs */}
          <KPICard
            label="Total Runs"
            value={stats.totalExecutions}
            subtitle={`${stats.successfulExecutions} succeeded`}
            color="#FACC15"
            sparklineData={totalRunsSparkline}
            hasBrandGlow={true}
          />

          {/* Top-right: Success Rate */}
          <KPICard
            label="Success Rate"
            value={`${stats.successRate}%`}
            subtitle="last 7 days"
            color="#10B981"
            sparklineData={successRateSparkline}
          />

          {/* Right column: Activity Chart (spans 2 rows) */}
          <div 
            className="row-span-2 p-4 rounded-[14px]"
            style={{ 
              backgroundColor: 'rgb(22, 22, 25)',
              border: '1px solid rgba(255, 255, 255, 0.055)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            }}
          >
            <ActivityChart 
              successData={successChartData}
              failedData={failedChartData}
              labels={chartLabels}
            />
          </div>

          {/* Bottom-left: Failed */}
          <KPICard
            label="Failed"
            value={stats.failedExecutions}
            subtitle="need attention"
            color={stats.failedExecutions > 0 ? '#EF4444' : 'rgba(255, 255, 255, 0.88)'}
            sparklineData={failedSparkline}
          />

          {/* Bottom-right: Avg Duration */}
          <KPICard
            label="Avg Duration"
            value={formatDuration(stats.avgDuration)}
            subtitle="per execution"
            color="#3B82F6"
            sparklineData={durationSparkline}
          />
        </div>

        {/* SECTION B: Main Content - 2 columns (1fr, 268px) */}
        <div 
          className="grid gap-3"
          style={{ gridTemplateColumns: '1fr 268px' }}
        >
          {/* Left: Execution Log */}
          <div 
            className="rounded-[14px] overflow-hidden"
            style={{ 
              backgroundColor: 'rgb(22, 22, 25)',
              border: '1px solid rgba(255, 255, 255, 0.055)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            }}
          >
            {/* Toolbar */}
            <div 
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.055)' }}
            >
              <span 
                className="text-[14px] font-medium"
                style={{ color: 'rgba(255, 255, 255, 0.88)' }}
              >
                Recent Executions
              </span>
              <span 
                className="text-[12px]"
                style={{ color: 'rgba(255, 255, 255, 0.28)' }}
              >
                {stats.recentExecutions.length} runs
              </span>
            </div>

            {/* Table Header */}
            <div 
              className="flex items-center gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.09em]"
              style={{ 
                color: 'rgba(255, 255, 255, 0.28)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.035)',
              }}
            >
              <div className="w-5" /> {/* Chevron space */}
              <div className="w-1.5" /> {/* Status dot space */}
              <div className="flex-1">Workflow</div>
              <div className="w-16">Status</div>
              <div className="w-16 text-right">Rows</div>
              <div className="w-14 text-right">Duration</div>
              <div className="w-10 text-right">Nodes</div>
              <div className="w-14 text-right">When</div>
              <div className="w-8" /> {/* Arrow space */}
            </div>

            {/* Execution Rows */}
            {stats.recentExecutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Clock size={32} style={{ color: 'rgba(255, 255, 255, 0.16)' }} />
                <p 
                  className="text-[13px] font-medium mt-3"
                  style={{ color: 'rgba(255, 255, 255, 0.50)' }}
                >
                  No executions yet
                </p>
                <p 
                  className="text-[12px] mt-1"
                  style={{ color: 'rgba(255, 255, 255, 0.28)' }}
                >
                  Run a workflow to see history
                </p>
                <button
                  onClick={() => navigate('/workflows')}
                  className="mt-4 h-8 px-4 text-[12px] font-medium rounded-lg"
                  style={{ 
                    backgroundColor: '#FACC15',
                    color: 'rgb(13, 13, 16)',
                  }}
                >
                  Go to Workflows
                </button>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {stats.recentExecutions.slice(0, 8).map((exec) => {
                  const stepsArray = exec.steps ? sortStepsByType(Object.values(exec.steps)) : [];
                  return (
                    <ExecutionRow
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

          {/* Right: Sidebar Stack */}
          <div className="space-y-3">
            {/* Workflows Panel */}
            <div 
              className="rounded-[14px] overflow-hidden"
              style={{ 
                backgroundColor: 'rgb(22, 22, 25)',
                border: '1px solid rgba(255, 255, 255, 0.055)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              }}
            >
              <div 
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.055)' }}
              >
                <span 
                  className="text-[10px] font-semibold uppercase tracking-[0.09em]"
                  style={{ color: 'rgba(255, 255, 255, 0.28)' }}
                >
                  Workflows
                </span>
                <button
                  onClick={() => navigate('/workflows')}
                  className="text-[11px] font-medium transition-colors"
                  style={{ color: 'rgba(255, 255, 255, 0.50)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.88)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.50)'}
                >
                  All &rarr;
                </button>
              </div>

              {Object.keys(stats.executionsByWorkflow).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Zap size={24} style={{ color: 'rgba(255, 255, 255, 0.16)' }} />
                  <p 
                    className="text-[12px] mt-2"
                    style={{ color: 'rgba(255, 255, 255, 0.28)' }}
                  >
                    No workflow data
                  </p>
                </div>
              ) : (
                <div>
                  {Object.entries(stats.executionsByWorkflow)
                    .sort(([, a], [, b]) => b.count - a.count)
                    .slice(0, 5)
                    .map(([workflowId, data]) => (
                      <div
                        key={workflowId}
                        className="px-4 py-3 cursor-pointer transition-colors"
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.035)' }}
                        onClick={() => navigate(`/workflows/builder?id=${workflowId}`)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={12} style={{ color: '#FACC15' }} />
                          <span 
                            className="text-[13px] font-medium truncate flex-1"
                            style={{ color: 'rgba(255, 255, 255, 0.88)' }}
                          >
                            {data.name}
                          </span>
                          <span 
                            className="text-[11px]"
                            style={{ color: 'rgba(255, 255, 255, 0.28)' }}
                          >
                            {data.count}&times;
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div 
                          className="h-[3px] rounded-full overflow-hidden"
                          style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
                        >
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${data.successRate}%`,
                              backgroundColor: 'rgba(16, 185, 129, 0.5)',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div 
              className="rounded-[14px] overflow-hidden"
              style={{ 
                backgroundColor: 'rgb(22, 22, 25)',
                border: '1px solid rgba(255, 255, 255, 0.055)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              }}
            >
              <div 
                className="px-4 py-3"
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.055)' }}
              >
                <span 
                  className="text-[10px] font-semibold uppercase tracking-[0.09em]"
                  style={{ color: 'rgba(255, 255, 255, 0.28)' }}
                >
                  Quick Actions
                </span>
              </div>
              <div className="p-2 space-y-1">
                <QuickActionCard
                  icon={Plus}
                  title="New Workflow"
                  subtitle="Build a data pipeline"
                  onClick={() => navigate('/workflows/builder')}
                  isPrimary={true}
                />
                <QuickActionCard
                  icon={Play}
                  title="Run Workflow"
                  subtitle="Execute a pipeline"
                  onClick={() => navigate('/workflows')}
                />
                <QuickActionCard
                  icon={Link2}
                  title="Add Connection"
                  subtitle="Connect a data source"
                  onClick={() => navigate('/connections')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
