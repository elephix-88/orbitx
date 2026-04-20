import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
 AlertTriangle,
 Inbox,
 Plus,
 Link2,
 Database,
 CalendarClock,
 RefreshCw,
 Loader2,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Chip } from '@/components/shared/Chip';
import { Dot } from '@/components/shared/Dot';
import { Avatar } from '@/components/shared/Avatar';
import { StatTile } from '@/components/shared/StatTile';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { EmptyState } from '@/components/shared/EmptyState';
import { AIInsightCard } from '@/components/insights/AIInsightCard';
import { useAuthStore } from '@/store/authStore';
import { useWorkflows } from '@/hooks/useWorkflows';
import {
 executionHistoryService,
 type DashboardStats,
} from '@/services/executionHistoryService';
import { formatRelativeTime, formatDuration } from '@/utils/executionFormatters';
import {
 bucketThroughputHourly,
 computeKpis,
 deriveNeedsAttention,
 filterHistoryByRange,
 type HomeRange,
 type ThroughputBucket,
} from '@/pages/home/aggregations';
import { fetchAiInsight, type AiInsight } from '@/pages/home/mockAiInsights';
import { WorkflowStatus } from '@/types/workflow';
import type { ExecutionHistory } from '@/types/backend';
import { cn } from '@/lib/utils';

const rangeOptions: { value: HomeRange; label: string }[] = [
 { value: 'today', label: 'Today' },
 { value: '7d', label: '7d' },
 { value: '30d', label: '30d' },
 { value: '90d', label: '90d' },
];

const formatCompactNumber = (value: number): string => {
 if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
 if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
 return value.toLocaleString();
};

const formatUsd = (value: number): string => {
 if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
 if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
 return `$${value.toFixed(2)}`;
};

const triggerLabel = (triggered: string): string => {
 const normalized = triggered?.toLowerCase() ?? '';
 if (normalized.includes('schedule') || normalized.includes('cron')) return 'Schedule';
 if (normalized.includes('manual') || normalized.includes('user')) return 'Manual';
 if (normalized.includes('webhook')) return 'Webhook';
 return triggered || 'Unknown';
};

const statusChipVariant = (status: string): 'success' | 'danger' | 'blue' | 'soft' => {
 switch (status) {
 case 'SUCCESS':
 return 'success';
 case 'FAILED':
 return 'danger';
 case 'RUNNING':
 case 'PENDING':
 return 'blue';
 default:
 return 'soft';
 }
};

const statusDotVariant = (
 status: string
): 'success' | 'danger' | 'blue' | 'muted' => {
 switch (status) {
 case 'SUCCESS':
 return 'success';
 case 'FAILED':
 return 'danger';
 case 'RUNNING':
 case 'PENDING':
 return 'blue';
 default:
 return 'muted';
 }
};

interface ThroughputChartProps {
 buckets: ThroughputBucket[];
}

const ThroughputChart: React.FC<ThroughputChartProps> = ({ buckets }) => {
 const maxTotal = Math.max(1, ...buckets.map((b) => b.success + b.failed));
 const CHART_H = 120;
 return (
 <div>
 <div className="flex items-end gap-[2px] h-[120px]">
 {buckets.map((bucket) => {
 const total = bucket.success + bucket.failed;
 const totalPct = (total / maxTotal) * 100;
 const totalPx = Math.max(total > 0 ? 4 : 2, (totalPct / 100) * CHART_H);
 const failedPx = total > 0 ? (bucket.failed / total) * totalPx : 0;
 const successPx = totalPx - failedPx;
 const label = `${String(bucket.hour).padStart(2, '0')}:00 — ${bucket.success} ok · ${bucket.failed} failed`;
 return (
 <div
 key={bucket.hour}
 className="flex-1 h-full flex flex-col justify-end"
 title={label}
 >
 {total === 0 ? (
 <div className="w-full rounded-t-[2px] bg-bg-muted" style={{ height: 2 }} />
 ) : (
 <>
 {failedPx > 0 && (
 <div
 className="w-full bg-danger rounded-t-[0px]"
 style={{ height: failedPx }}
 />
 )}
 {successPx > 0 && (
 <div
 className={cn(
 'w-full bg-blue-primary',
 failedPx === 0 ? 'rounded-t-[2px]' : ''
 )}
 style={{ height: successPx }}
 />
 )}
 </>
 )}
 </div>
 );
 })}
 </div>
 <div className="mt-2 flex justify-between text-[10.5px] font-mono text-text-3">
 <span>00:00</span>
 <span>06:00</span>
 <span>12:00</span>
 <span>18:00</span>
 <span>now</span>
 </div>
 </div>
 );
};

interface HealthRow {
 label: string;
 count: number;
 tone: 'success' | 'blue' | 'warning' | 'danger' | 'muted';
}

const HealthBar: React.FC<{ row: HealthRow; max: number }> = ({ row, max }) => {
 const pct = max > 0 ? (row.count / max) * 100 : 0;
 const barColor: Record<HealthRow['tone'], string> = {
 success: 'bg-success',
 blue: 'bg-blue-primary',
 warning: 'bg-warning',
 danger: 'bg-danger',
 muted: 'bg-text-4',
 };
 return (
 <div className="flex items-center gap-3">
 <Dot variant={row.tone === 'muted' ? 'muted' : row.tone === 'blue' ? 'blue' : row.tone} />
 <span className="text-[12.5px] text-text-2 flex-1">{row.label}</span>
 <span className="font-mono text-[12.5px] text-text-1 w-8 text-right">
 {row.count}
 </span>
 <div className="w-20 h-[5px] rounded-full bg-bg-muted overflow-hidden">
 <div
 className={cn('h-full rounded-full', barColor[row.tone])}
 style={{ width: `${pct}%` }}
 />
 </div>
 </div>
 );
};

const QuickActions: React.FC<{ onNavigate: (path: string) => void }> = ({
 onNavigate,
}) => (
 <div className="grid grid-cols-2 gap-2">
 <Button
 variant="secondary"
 size="sm"
 leftIcon={<Plus size={14} />}
 onClick={() => onNavigate('/workflows/builder')}
 >
 New pipeline
 </Button>
 <Button
 variant="secondary"
 size="sm"
 leftIcon={<Link2 size={14} />}
 onClick={() => onNavigate('/connections')}
 >
 Connect source
 </Button>
 <Button
 variant="secondary"
 size="sm"
 leftIcon={<Database size={14} />}
 onClick={() => onNavigate('/connections')}
 disabled
 >
 Add destination
 </Button>
 <Button
 variant="secondary"
 size="sm"
 leftIcon={<CalendarClock size={14} />}
 onClick={() => onNavigate('/reports')}
 disabled
 >
 Schedule report
 </Button>
 </div>
);

interface TeamActivityItem {
 id: string;
 name: string;
 action: string;
 object: string;
 timestamp: number;
}

// HOME-ACTIVITY-FEED-TODO: swap to real endpoint when activity service ships.
const teamActivity: TeamActivityItem[] = [];

export default function DashboardPage() {
 const navigate = useNavigate();
 const { user } = useAuthStore();
 const {
 workflows,
 loading: workflowsLoading,
 refreshing,
 refreshWorkflows,
 } = useWorkflows();

 const [range, setRange] = useState<HomeRange>('7d');
 const [stats, setStats] = useState<DashboardStats | null>(null);
 const [statsLoading, setStatsLoading] = useState(true);
 const [statsError, setStatsError] = useState<string | null>(null);
 const [insight, setInsight] = useState<AiInsight | null>(null);
 const [insightLoading, setInsightLoading] = useState(true);

 const loadStats = useCallback(async () => {
 setStatsLoading(true);
 setStatsError(null);
 try {
 const result = await executionHistoryService.getDashboardStats();
 setStats(result);
 } catch (err) {
 setStatsError(err instanceof Error ? err.message : 'Failed to load stats');
 } finally {
 setStatsLoading(false);
 }
 }, []);

 useEffect(() => {
 loadStats();
 }, [loadStats, range]);

 useEffect(() => {
 setInsightLoading(true);
 fetchAiInsight()
 .then((result) => setInsight(result))
 .finally(() => setInsightLoading(false));
 }, [range]);

 const history: ExecutionHistory[] = stats?.recentExecutions ?? [];

 const kpis = useMemo(() => computeKpis(workflows, history), [workflows, history]);
 const throughput = useMemo(() => bucketThroughputHourly(history), [history]);
 const attention = useMemo(() => deriveNeedsAttention(workflows), [workflows]);
 const recentRuns = useMemo(
 () => filterHistoryByRange(history, range).slice(0, 6),
 [history, range]
 );

 const healthRows: HealthRow[] = useMemo(() => {
 const active = workflows.filter((w) => w.status === WorkflowStatus.ACTIVE).length;
 const paused = workflows.filter((w) => w.status === WorkflowStatus.PAUSED).length;
 const running = (stats?.runningExecutions ?? 0);
 const failed = attention.length;
 const healthy = Math.max(0, active - running - failed);
 return [
 { label: 'Healthy', count: healthy, tone: 'success' },
 { label: 'Running', count: running, tone: 'blue' },
 { label: 'Token expiring', count: 0, tone: 'warning' },
 { label: 'Failed', count: failed, tone: 'danger' },
 { label: 'Paused', count: paused, tone: 'muted' },
 ];
 }, [workflows, stats, attention]);

 const firstName = (user?.name ?? '').split(' ')[0] || 'there';

 const loadingAny = workflowsLoading || statsLoading;

 return (
 <Layout title="Home">
 <div className="space-y-6">
 <header className="flex flex-wrap items-end justify-between gap-4">
 <div>
 <h1 className="text-[24px] font-bold text-text-1 tracking-tight">
 Welcome back, {firstName}
 </h1>
 <p className="text-[13px] text-text-3 mt-1">
 Here's what your pipelines have been up to.
 </p>
 </div>
 <div className="flex items-center gap-2">
 <SegmentedControl<HomeRange>
 options={rangeOptions}
 value={range}
 onChange={setRange}
 size="sm"
 ariaLabel="Time range"
 />
 <Button
 variant="secondary"
 size="sm"
 leftIcon={
 refreshing ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <RefreshCw size={14} />
 )
 }
 onClick={() => {
 refreshWorkflows();
 loadStats();
 }}
 disabled={refreshing || statsLoading}
 >
 Refresh
 </Button>
 </div>
 </header>

 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
 <StatTile
 label="Active pipelines"
 value={<span className="text-blue-primary">{kpis.activePipelines}</span>}
 />
 <StatTile
 label="Rows synced · 24h"
 value={<span className="text-blue-primary">{formatCompactNumber(kpis.rowsSynced24h)}</span>}
 mono
 />
 <StatTile
 label="Successful runs · 24h"
 value={<span className="text-success">{kpis.successfulRuns24h}</span>}
 delta={kpis.successfulRuns24h > 0 ? { direction: 'up', text: 'runs completed' } : undefined}
 />
 <StatTile
 label="Failed runs · 24h"
 value={
 <span className={kpis.failedRuns24h > 0 ? 'text-danger' : 'text-text-3'}>
 {kpis.failedRuns24h}
 </span>
 }
 delta={kpis.failedRuns24h > 0 ? { direction: 'down', text: 'need attention' } : undefined}
 />
 <StatTile
 label="Spend captured · 7d"
 value={<span className="text-blue-primary">{formatUsd(kpis.spendCaptured7d)}</span>}
 mono
 />
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 space-y-6">
 <Card padding="none">
 <div className="flex items-center justify-between px-4 py-3 border-b border-line-soft">
 <div className="flex items-center gap-2">
 <AlertTriangle size={16} className="text-danger" aria-hidden="true" />
 <h2 className="text-[14px] font-semibold text-text-1">
 Needs attention
 </h2>
 {attention.length > 0 && (
 <Chip variant="danger" className="ml-1">
 {attention.length}
 </Chip>
 )}
 </div>
 </div>
 <div>
 {loadingAny && attention.length === 0 ? (
 <div className="px-4 py-6 text-[12.5px] text-text-3">Loading…</div>
 ) : attention.length === 0 ? (
 <EmptyState
 icon={<Inbox size={18} />}
 title="All pipelines look healthy"
 description="We'll surface failures, expiring tokens, and stuck runs here when they happen."
 />
 ) : (
 <ul className="divide-y divide-line-soft">
 {attention.slice(0, 5).map((item) => (
 <li
 key={item.id}
 className="flex items-center gap-3 px-4 py-3"
 >
 <Dot variant={item.severity} />
 <div className="min-w-0 flex-1">
 <div className="text-[13px] font-medium text-text-1 truncate">
 {item.name}
 </div>
 <div className="text-[12px] text-text-3">{item.reason}</div>
 </div>
 <Chip variant={item.severity}>Failed</Chip>
 <Button
 variant="secondary"
 size="sm"
 onClick={() => navigate(`/workflows/builder?id=${item.id}`)}
 >
 {item.actionLabel}
 </Button>
 </li>
 ))}
 </ul>
 )}
 </div>
 </Card>

 <Card padding="none">
 <div className="flex items-center justify-between px-4 py-3 border-b border-line-soft">
 <h2 className="text-[14px] font-semibold text-text-1">
 Throughput · last 24h
 </h2>
 <div className="flex items-center gap-3 text-[11px] text-text-3">
 <span className="inline-flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-sm bg-blue-primary" />
 Success
 </span>
 <span className="inline-flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-sm bg-danger" />
 Failed
 </span>
 </div>
 </div>
 <div className="p-4">
 {loadingAny ? (
 <div className="h-[120px] rounded-lg bg-bg-muted animate-pulse" />
 ) : throughput.every((b) => b.rows === 0 && b.success === 0 && b.failed === 0) ? (
 <EmptyState
 icon={<Inbox size={18} />}
 title="No activity in the last 24h"
 description="Run a pipeline to see throughput show up here."
 />
 ) : (
 <ThroughputChart buckets={throughput} />
 )}
 </div>
 </Card>

 <Card padding="none">
 <div className="flex items-center justify-between px-4 py-3 border-b border-line-soft">
 <h2 className="text-[14px] font-semibold text-text-1">Recent runs</h2>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => navigate('/workflows')}
 >
 View all
 </Button>
 </div>
 {statsError ? (
 <div className="px-4 py-6 text-[12.5px] text-danger">
 {statsError}
 <Button
 variant="ghost"
 size="sm"
 className="ml-2"
 onClick={loadStats}
 >
 Retry
 </Button>
 </div>
 ) : recentRuns.length === 0 ? (
 <EmptyState
 icon={<Inbox size={18} />}
 title="No runs in this window"
 description="Switch to a longer range or run a pipeline to see recent activity."
 />
 ) : (
 <table className="w-full text-[13px]">
 <thead>
 <tr className="text-left text-[11px] font-medium text-text-3 uppercase tracking-wider">
 <th className="px-4 py-2 w-6"></th>
 <th className="px-2 py-2">Pipeline</th>
 <th className="px-2 py-2">Trigger</th>
 <th className="px-2 py-2">Duration</th>
 <th className="px-2 py-2">Rows</th>
 <th className="px-2 py-2">Started</th>
 <th className="px-2 py-2">Status</th>
 </tr>
 </thead>
 <tbody>
 {recentRuns.map((run) => (
 <tr
 key={run.execution_id}
 className="border-t border-line-soft hover:bg-bg-row-hv transition-colors"
 >
 <td className="px-4 py-3">
 <Dot
 variant={statusDotVariant(run.status)}
 pulseRing={run.status === 'RUNNING'}
 />
 </td>
 <td className="px-2 py-3 font-medium text-text-1 truncate max-w-[220px]">
 {run.workflow_name}
 </td>
 <td className="px-2 py-3">
 <Chip variant="soft">{triggerLabel(run.triggered_by)}</Chip>
 </td>
 <td className="px-2 py-3 font-mono text-text-2">
 {formatDuration(run.duration)}
 </td>
 <td className="px-2 py-3 font-mono text-text-2">—</td>
 <td className="px-2 py-3 text-text-3">
 {formatRelativeTime(run.start_time)}
 </td>
 <td className="px-2 py-3">
 <Chip variant={statusChipVariant(run.status)}>
 {run.status.charAt(0) +
 run.status.slice(1).toLowerCase()}
 </Chip>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </Card>
 </div>

 <div className="space-y-6">
 <AIInsightCard insight={insight} loading={insightLoading} />

 <Card padding="none">
 <div className="px-4 py-3 border-b border-line-soft">
 <h2 className="text-[14px] font-semibold text-text-1">
 Pipeline health
 </h2>
 </div>
 <div className="p-4 space-y-3">
 {healthRows.map((row) => (
 <HealthBar
 key={row.label}
 row={row}
 max={Math.max(1, ...healthRows.map((r) => r.count))}
 />
 ))}
 </div>
 </Card>

 <Card padding="none">
 <div className="px-4 py-3 border-b border-line-soft">
 <h2 className="text-[14px] font-semibold text-text-1">Quick actions</h2>
 </div>
 <div className="p-4">
 <QuickActions onNavigate={navigate} />
 </div>
 </Card>

 <Card padding="none">
 <div className="px-4 py-3 border-b border-line-soft">
 <h2 className="text-[14px] font-semibold text-text-1">Team activity</h2>
 </div>
 {teamActivity.length === 0 ? (
 <EmptyState
 icon={<Inbox size={18} />}
 title="No team activity yet"
 description="Invites, edits, and reconnects will show up here as your team collaborates."
 />
 ) : (
 <ul className="divide-y divide-line-soft">
 {teamActivity.map((item) => (
 <li key={item.id} className="flex items-center gap-3 px-4 py-3">
 <Avatar name={item.name} size="sm" />
 <div className="min-w-0 flex-1 text-[12.5px]">
 <span className="text-text-1 font-medium">{item.name}</span>{' '}
 <span className="text-text-2">{item.action}</span>{' '}
 <span className="text-text-1">{item.object}</span>
 </div>
 <span className="text-[11px] text-text-3 shrink-0">
 {formatRelativeTime(item.timestamp)}
 </span>
 </li>
 ))}
 </ul>
 )}
 </Card>
 </div>
 </div>
 </div>
 </Layout>
 );
}
