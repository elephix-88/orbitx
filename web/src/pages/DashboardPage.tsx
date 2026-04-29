import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/shared/Button';
import { Dot } from '@/components/shared/Dot';
import { EmptyState } from '@/components/shared/EmptyState';
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
} from '@/pages/home/aggregations';
import { WorkflowStatus } from '@/types/workflow';
import type { ExecutionHistory } from '@/types/backend';
import type { FrontendWorkflow } from '@/utils/workflowTransformers';
import { cn } from '@/lib/utils';

// ─── constants ──────────────────────────────────────────────────────────────

const PIPELINE_ACCENTS = [
  '#1848F3',
  '#7C3AED',
  '#059669',
  '#D97706',
  '#DB2777',
  '#0891B2',
  '#C2410C',
  '#4F46E5',
] as const;

// ─── helpers ────────────────────────────────────────────────────────────────

const fmtCompact = (n: number): string =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : n.toLocaleString();

const fmtHHMM = (ts: number): string => {
  const d = new Date(ts * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

type BlockStatus = 'success' | 'failed' | 'running' | 'empty';

function getPipelineBlocks(
  history: ExecutionHistory[],
  workflowId: string,
): BlockStatus[] {
  const now = Date.now() / 1000;
  const cutoff = now - 86_400;
  const blocks: BlockStatus[] = Array<BlockStatus>(24).fill('empty');

  for (const exec of history) {
    if (exec.workflow_id !== workflowId) continue;
    if (exec.start_time < cutoff) continue;
    const hour = new Date(exec.start_time * 1000).getHours();
    const prev = blocks[hour];
    if (exec.status === 'RUNNING' || exec.status === 'PENDING') {
      blocks[hour] = 'running';
    } else if (exec.status === 'FAILED' && prev !== 'running') {
      blocks[hour] = 'failed';
    } else if (exec.status === 'SUCCESS' && prev === 'empty') {
      blocks[hour] = 'success';
    }
  }

  return blocks;
}

function getPipelineRate(history: ExecutionHistory[], workflowId: string): number | null {
  const relevant = history.filter((e) => e.workflow_id === workflowId);
  if (!relevant.length) return null;
  const success = relevant.filter((e) => e.status === 'SUCCESS').length;
  return Math.round((success / relevant.length) * 100);
}

function getLastRunTime(history: ExecutionHistory[], workflowId: string): number | null {
  const times = history
    .filter((e) => e.workflow_id === workflowId)
    .map((e) => e.start_time);
  return times.length ? Math.max(...times) : null;
}

// ─── HealthRing ─────────────────────────────────────────────────────────────

interface HealthRingProps {
  rate: number;
  active: number;
  running: number;
  failed: number;
  paused: number;
}

function HealthRing({ rate, active, running, failed, paused }: HealthRingProps) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);
  const gradId = useId();

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setOffset(circ * (1 - rate / 100));
    });
    return () => cancelAnimationFrame(id);
  }, [rate, circ]);

  const ringColor =
    rate >= 90 ? 'var(--success)' : rate >= 70 ? 'var(--warning)' : 'var(--danger)';

  const rateClass =
    rate >= 90 ? 'text-success' : rate >= 70 ? 'text-warning' : 'text-danger';

  const rows: { label: string; count: number; dot: 'blue' | 'success' | 'danger' | 'muted' }[] = [
    { label: 'Active', count: active, dot: 'success' },
    { label: 'Running', count: running, dot: 'blue' },
    { label: 'Failed', count: failed, dot: 'danger' },
    { label: 'Paused', count: paused, dot: 'muted' },
  ];

  return (
    <div className="flex flex-col h-full">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-text-3 mb-4">
        Pipeline Health
      </p>
      <div className="flex items-center gap-5 flex-1">
        {/* SVG ring */}
        <div className="relative flex-shrink-0">
          <svg width="112" height="112" viewBox="0 0 112 112">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={ringColor} stopOpacity="0.5" />
                <stop offset="100%" stopColor={ringColor} />
              </linearGradient>
            </defs>
            {/* track */}
            <circle
              cx="56"
              cy="56"
              r={r}
              fill="none"
              stroke="var(--line-1)"
              strokeWidth="7"
            />
            {/* fill */}
            <circle
              cx="56"
              cy="56"
              r={r}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform="rotate(-90 56 56)"
              style={{
                transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className={cn('text-[21px] font-bold font-mono leading-none', rateClass)}>
              {Math.round(rate)}%
            </span>
            <span className="text-[9.5px] text-text-3 mt-0.5 tracking-wide">success</span>
          </div>
        </div>
        {/* breakdown */}
        <div className="flex-1 space-y-3">
          {rows.map((row) => {
            const maxCount = Math.max(1, active + running + failed + paused);
            const pct = Math.round((row.count / maxCount) * 100);
            const barColor: Record<typeof row.dot, string> = {
              success: 'var(--success)',
              blue: 'var(--blue-primary)',
              danger: 'var(--danger)',
              muted: 'var(--text-4)',
            };
            return (
              <div key={row.label}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[12px] text-text-2 flex-1">{row.label}</span>
                  <span className="font-mono text-[13px] font-bold text-text-1 tabular-nums">
                    {row.count}
                  </span>
                </div>
                <div className="h-[3px] rounded-full bg-bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: barColor[row.dot] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ThroughputPanel ─────────────────────────────────────────────────────────

interface ThroughputPanelProps {
  buckets: ReturnType<typeof bucketThroughputHourly>;
}

function ThroughputPanel({ buckets }: ThroughputPanelProps) {
  const maxTotal = Math.max(1, ...buckets.map((b) => b.success + b.failed));
  const totalRuns = buckets.reduce((s, b) => s + b.success + b.failed, 0);
  const totalSuccess = buckets.reduce((s, b) => s + b.success, 0);
  const totalFailed = buckets.reduce((s, b) => s + b.failed, 0);
  const totalRows = buckets.reduce((s, b) => s + b.rows, 0);
  const rate = totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-text-3">
          24h Throughput
        </p>
        <div className="flex items-center gap-3 text-[10px] text-text-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-[7px] h-[7px] rounded-[1px] bg-blue-primary" />
            Success
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-[7px] h-[7px] rounded-[1px] bg-danger" />
            Failed
          </span>
        </div>
      </div>

      {/* bars */}
      <div className="flex items-end gap-[2.5px] h-[80px] mb-2">
        {buckets.map((b) => {
          const total = b.success + b.failed;
          const pct = total / maxTotal;
          const px = Math.max(total > 0 ? 5 : 2, pct * 80);
          const failedPx = total > 0 ? (b.failed / total) * px : 0;
          const successPx = px - failedPx;
          return (
            <div
              key={b.hour}
              className="flex-1 flex flex-col justify-end h-full"
              title={`${String(b.hour).padStart(2, '0')}:00 · ${b.success} ok · ${b.failed} fail`}
            >
              {total === 0 ? (
                <div
                  className="w-full rounded-[2px] bg-line-1"
                  style={{ height: 2 }}
                />
              ) : (
                <>
                  {failedPx > 0 && (
                    <div
                      className="w-full bg-danger rounded-t-[2px]"
                      style={{ height: failedPx }}
                    />
                  )}
                  {successPx > 0 && (
                    <div
                      className={cn(
                        'w-full bg-blue-primary',
                        failedPx === 0 ? 'rounded-t-[2px]' : '',
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

      <div className="flex justify-between text-[9px] font-mono text-text-4 mb-4">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>now</span>
      </div>

      {/* summary strip */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-line-soft">
        <div>
          <p className="text-[10px] text-text-3 mb-0.5">Total runs</p>
          <p className="text-[17px] font-bold font-mono text-text-1 tabular-nums">
            {totalRuns}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-3 mb-0.5">Rows synced</p>
          <p className="text-[17px] font-bold font-mono text-text-1 tabular-nums">
            {fmtCompact(totalRows)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-3 mb-0.5">Success rate</p>
          <p
            className={cn(
              'text-[17px] font-bold font-mono tabular-nums',
              rate === null
                ? 'text-text-4'
                : totalFailed === 0
                  ? 'text-success'
                  : rate >= 80
                    ? 'text-warning'
                    : 'text-danger',
            )}
          >
            {rate !== null ? `${rate}%` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── StatBox ─────────────────────────────────────────────────────────────────

interface StatBoxProps {
  label: string;
  value: string | number;
  sub?: string;
  valueClass?: string;
}

function StatBox({ label, value, sub, valueClass }: StatBoxProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-3">
        {label}
      </p>
      <p className={cn('text-[22px] font-bold font-mono leading-tight tabular-nums', valueClass ?? 'text-text-1')}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-[10.5px] text-text-3">{sub}</p>}
    </div>
  );
}

// ─── PipelineLane ─────────────────────────────────────────────────────────────

interface PipelineLaneProps {
  workflow: FrontendWorkflow;
  history: ExecutionHistory[];
  accent: string;
  onNavigate: (id: string) => void;
}

function PipelineLane({ workflow, history, accent, onNavigate }: PipelineLaneProps) {
  const blocks = useMemo(
    () => getPipelineBlocks(history, workflow.id),
    [history, workflow.id],
  );
  const rate = useMemo(
    () => getPipelineRate(history, workflow.id),
    [history, workflow.id],
  );
  const lastRunAt = useMemo(
    () => getLastRunTime(history, workflow.id),
    [history, workflow.id],
  );

  const isActive = workflow.status === WorkflowStatus.ACTIVE;
  const isFailed =
    String(workflow.status).toLowerCase() === 'failed' ||
    String(workflow.status).toLowerCase() === 'error';
  const isRunning = String(workflow.status).toLowerCase() === 'running';

  const blockBg = (s: BlockStatus): string => {
    if (s === 'success') return 'var(--success)';
    if (s === 'failed') return 'var(--danger)';
    if (s === 'running') return 'var(--blue-primary)';
    return 'var(--line-1)';
  };

  const chipLabel = isFailed
    ? 'Failed'
    : isActive
      ? 'Active'
      : String(workflow.status).charAt(0) + String(workflow.status).slice(1).toLowerCase();

  return (
    <div
      className="group flex items-center gap-4 px-4 py-3.5 hover:bg-bg-row-hv hover:-translate-y-px transition-all duration-150 cursor-pointer"
      onClick={() => onNavigate(workflow.id)}
      role="row"
    >
      {/* accent bar + name */}
      <div className="flex items-center gap-2.5 w-[190px] min-w-[190px]">
        <span
          className="w-[3px] h-6 rounded-full flex-shrink-0"
          style={{ backgroundColor: accent }}
        />
        <Dot
          variant={isFailed ? 'danger' : isActive ? 'success' : 'muted'}
          pulseRing={isRunning}
        />
        <span className="text-[13.5px] font-semibold text-text-1 truncate group-hover:text-blue-primary transition-colors">{workflow.name}</span>
      </div>

      {/* 24 hourly activity blocks */}
      <div className="flex-1 flex items-center gap-[2.5px]">
        {blocks.map((block, i) => (
          <div
            key={i}
            className={cn(
              'h-[18px] flex-1 rounded-[2px]',
              block === 'running' && 'animate-pulse',
            )}
            style={{
              backgroundColor: blockBg(block),
              opacity: block === 'empty' ? 0.2 : 0.85,
            }}
            title={`${String(i).padStart(2, '0')}:00`}
          />
        ))}
      </div>

      {/* success rate */}
      <div className="w-[44px] text-right flex-shrink-0">
        {rate !== null ? (
          <span
            className={cn(
              'text-[12.5px] font-mono font-semibold tabular-nums',
              rate >= 90 ? 'text-success' : rate >= 70 ? 'text-warning' : 'text-danger',
            )}
          >
            {rate}%
          </span>
        ) : (
          <span className="text-[12px] text-text-4">—</span>
        )}
      </div>

      {/* last run */}
      <div className="w-[80px] text-right flex-shrink-0">
        <span className="text-[12px] text-text-3 tabular-nums">
          {lastRunAt ? formatRelativeTime(lastRunAt) : '—'}
        </span>
      </div>

      {/* status pill */}
      <div className="w-[68px] flex justify-end flex-shrink-0">
        <span
          className={cn(
            'text-[10.5px] font-semibold px-2.5 py-[3px] rounded-full border',
            isFailed
              ? 'bg-danger-bg text-danger border-danger-border'
              : isActive
                ? 'bg-success-bg text-success border-success-border'
                : 'bg-bg-muted text-text-3 border-line-1',
          )}
        >
          {chipLabel}
        </span>
      </div>

      {/* arrow */}
      <ChevronRight
        size={13}
        className="text-text-4 group-hover:text-text-2 transition-colors flex-shrink-0"
      />
    </div>
  );
}

// ─── Skeleton helper ─────────────────────────────────────────────────────────

function Skel({ className }: { className?: string }) {
  return <div className={cn('bg-bg-muted rounded animate-pulse', className)} />;
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { workflows, loading: workflowsLoading, refreshing, refreshWorkflows } = useWorkflows();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const result = await executionHistoryService.getDashboardStats();
      setStats(result);
      setLastRefreshed(new Date());
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const history: ExecutionHistory[] = stats?.recentExecutions ?? [];

  const kpis = useMemo(() => computeKpis(workflows, history), [workflows, history]);
  const throughput = useMemo(() => bucketThroughputHourly(history), [history]);
  const attention = useMemo(() => deriveNeedsAttention(workflows), [workflows]);

  const active = workflows.filter((w) => w.status === WorkflowStatus.ACTIVE).length;
  const paused = workflows.filter((w) => w.status === WorkflowStatus.PAUSED).length;
  const running = stats?.runningExecutions ?? 0;
  const failed = attention.length;
  const successRate = stats?.successRate ?? 0;

  const loadingAny = workflowsLoading || statsLoading;

  const firstName = (user?.name ?? '').split(' ')[0] || 'there';
  const hourNow = new Date().getHours();
  const greeting =
    hourNow < 12 ? 'Good morning' : hourNow < 18 ? 'Good afternoon' : 'Good evening';

  const refreshedTime = lastRefreshed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Layout>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-[7px] w-[7px]">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
              <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-success" />
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-text-3">
              Live · refreshed {refreshedTime}
            </span>
          </div>
          <h1 className="text-[26px] font-semibold text-text-1 tracking-tight leading-tight">
            {greeting},{' '}
            <span className="text-blue-primary">{firstName}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {statsError && (
            <span className="text-[11.5px] text-danger">{statsError}</span>
          )}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={
              refreshing || statsLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
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
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={13} />}
            onClick={() => navigate('/workflows/builder')}
          >
            New pipeline
          </Button>
        </div>
      </header>

      {/* ── Hero bento row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.7fr_1fr] gap-5 mb-5">
        {/* Health ring */}
        <div className="bg-bg-card border border-line-1 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: 'linear-gradient(90deg, var(--success), var(--blue-primary))' }} />
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'rgba(4, 120, 87, 0.07)' }} />
          {loadingAny ? (
            <div className="space-y-4">
              <Skel className="h-3 w-28" />
              <div className="flex items-center gap-4">
                <Skel className="w-[112px] h-[112px] rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skel className="h-3" />
                  <Skel className="h-3 w-4/5" />
                  <Skel className="h-3" />
                  <Skel className="h-3 w-3/5" />
                </div>
              </div>
            </div>
          ) : (
            <HealthRing
              rate={successRate}
              active={active}
              running={running}
              failed={failed}
              paused={paused}
            />
          )}
        </div>

        {/* Throughput chart */}
        <div className="bg-bg-card border border-line-1 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: 'linear-gradient(90deg, var(--blue-primary), #7C3AED)' }} />
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'rgba(24, 72, 243, 0.07)' }} />
          {loadingAny ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skel className="h-3 w-28" />
                <Skel className="h-3 w-20" />
              </div>
              <Skel className="h-[80px] mt-2" />
              <div className="flex justify-between">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skel key={i} className="h-2 w-8" />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-line-soft">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <Skel className="h-2 w-16" />
                    <Skel className="h-5 w-10" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ThroughputPanel buckets={throughput} />
          )}
        </div>

        {/* KPI stats */}
        <div className="bg-bg-card border border-line-1 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #7C3AED, var(--blue-primary))' }} />
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'rgba(124, 58, 237, 0.06)' }} />
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-text-3 mb-5">
            Key metrics · 24h
          </p>
          {loadingAny ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skel className="h-2 w-16" />
                  <Skel className="h-6 w-10" />
                  <Skel className="h-2 w-12" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              <StatBox
                label="Active"
                value={kpis.activePipelines}
                sub="pipelines"
                valueClass="text-blue-primary"
              />
              <StatBox
                label="Rows"
                value={fmtCompact(kpis.rowsSynced24h)}
                sub="synced"
              />
              <StatBox
                label="Runs OK"
                value={kpis.successfulRuns24h}
                sub="successful"
                valueClass={kpis.successfulRuns24h > 0 ? 'text-success' : 'text-text-3'}
              />
              <StatBox
                label="Failed"
                value={kpis.failedRuns24h}
                sub="runs"
                valueClass={kpis.failedRuns24h > 0 ? 'text-danger' : 'text-text-3'}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Attention banner ─────────────────────────────────────────────────── */}
      {!loadingAny && attention.length > 0 && (
        <div className="mb-4 bg-danger-bg border border-danger-border rounded-2xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle
            size={15}
            className="text-danger mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-danger">
              {attention.length} pipeline{attention.length > 1 ? 's' : ''} need
              {attention.length === 1 ? 's' : ''} attention
            </p>
            <p className="text-[11.5px] text-danger/70 mt-0.5 truncate">
              {attention.map((a) => a.name).join(' · ')}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {attention.slice(0, 2).map((item) => (
              <Button
                key={item.id}
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/workflows/builder?id=${item.id}`)}
              >
                {item.actionLabel}
              </Button>
            ))}
          </div>
        </div>
      )}

      {!loadingAny && attention.length === 0 && (
        <div className="mb-4 bg-success-bg border border-success-border rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
          <CheckCircle2 size={14} className="text-success flex-shrink-0" aria-hidden="true" />
          <p className="text-[12.5px] text-success font-medium">
            All pipelines are healthy — no action required.
          </p>
        </div>
      )}

      {/* ── Pipeline activity matrix ──────────────────────────────────────────── */}
      <div className="bg-bg-card border border-line-1 rounded-2xl shadow-sm mb-5 overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-blue-primary" />
        {/* header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line-soft">
          <Layers size={13} className="text-text-3 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-text-1">Pipeline Activity</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-3">
            · last 24h, 1 block / hour
          </span>
          {!loadingAny && (
            <span className="ml-auto text-[11.5px] text-text-3">
              {workflows.length} pipeline{workflows.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* column header row */}
        {!loadingAny && workflows.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 bg-bg-muted border-b border-line-soft">
            <div className="w-[190px] min-w-[190px] text-[9.5px] font-semibold uppercase tracking-wider text-text-3">
              Pipeline
            </div>
            <div className="flex-1 text-[9.5px] font-semibold uppercase tracking-wider text-text-3">
              Hourly runs (00:00 → now)
            </div>
            <div className="w-[44px] flex-shrink-0 text-right text-[9.5px] font-semibold uppercase tracking-wider text-text-3">
              Rate
            </div>
            <div className="w-[80px] flex-shrink-0 text-right text-[9.5px] font-semibold uppercase tracking-wider text-text-3">
              Last run
            </div>
            <div className="w-[68px] flex-shrink-0 text-right text-[9.5px] font-semibold uppercase tracking-wider text-text-3">
              Status
            </div>
            <div className="w-[13px] flex-shrink-0" />
          </div>
        )}

        {/* rows */}
        {loadingAny ? (
          <div className="divide-y divide-line-soft">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skel className="w-[190px] h-4" />
                <Skel className="flex-1 h-[18px]" />
                <Skel className="w-[44px] h-4" />
                <Skel className="w-[80px] h-4" />
                <Skel className="w-[68px] h-5" />
                <Skel className="w-[13px] h-4" />
              </div>
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <EmptyState
            icon={<Layers size={20} />}
            title="No pipelines yet"
            description="Create your first pipeline to start syncing data."
          />
        ) : (
          <div className="divide-y divide-line-soft" role="table">
            {workflows.map((wf, i) => (
              <PipelineLane
                key={wf.id}
                workflow={wf}
                history={history}
                accent={PIPELINE_ACCENTS[i % PIPELINE_ACCENTS.length]}
                onNavigate={(id) => navigate(`/workflows/builder?id=${id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Recent runs log ───────────────────────────────────────────────────── */}
      <div className="bg-bg-card border border-line-1 rounded-2xl shadow-sm overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #7C3AED, var(--blue-primary))' }} />
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-line-soft">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-1">Recent runs</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-3">
              · execution log
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/workflows')}>
            View all
          </Button>
        </div>

        {statsError && !stats ? (
          <div className="px-4 py-4 text-[12.5px] text-danger">{statsError}</div>
        ) : !loadingAny && history.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={18} />}
            title="No runs recorded yet"
            description="Run a pipeline to see the execution log here."
          />
        ) : (
          <div className="divide-y divide-line-soft">
            {loadingAny
              ? [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-2.5">
                    <Skel className="w-3 h-3 rounded-full" />
                    <Skel className="w-10 h-3" />
                    <Skel className="flex-1 h-3" />
                    <Skel className="w-14 h-3" />
                    <Skel className="w-16 h-5" />
                  </div>
                ))
              : history.slice(0, 8).map((run) => {
                  const isOk = run.status === 'SUCCESS';
                  const isFail = run.status === 'FAILED';
                  const isRunningRun = run.status === 'RUNNING' || run.status === 'PENDING';

                  return (
                    <div
                      key={run.execution_id}
                      className="group flex items-center gap-4 px-4 py-3 hover:bg-bg-row-hv hover:-translate-y-px transition-all duration-150 cursor-pointer"
                      onClick={() =>
                        navigate(`/workflows/builder?id=${run.workflow_id}`)
                      }
                    >
                      {/* status glyph */}
                      <span
                        className={cn(
                          'text-[13px] font-mono flex-shrink-0 w-4 text-center',
                          isOk
                            ? 'text-success'
                            : isFail
                              ? 'text-danger'
                              : 'text-blue-primary',
                        )}
                      >
                        {isOk ? '✓' : isFail ? '✗' : '●'}
                      </span>

                      {/* time */}
                      <span className="font-mono text-[11.5px] text-text-3 flex-shrink-0 w-[42px] tabular-nums">
                        {fmtHHMM(run.start_time)}
                      </span>

                      {/* pipeline name */}
                      <span className="text-[13px] font-semibold text-text-1 flex-1 truncate min-w-0 group-hover:text-blue-primary transition-colors">
                        {run.workflow_name}
                      </span>

                      {/* duration */}
                      <span className="font-mono text-[11.5px] text-text-3 flex-shrink-0 w-[58px] text-right tabular-nums">
                        {run.duration ? formatDuration(run.duration) : '—'}
                      </span>

                      {/* triggered by */}
                      <span className="font-mono text-[11px] text-text-4 flex-shrink-0 w-[70px] text-right truncate hidden md:block">
                        {run.triggered_by || '—'}
                      </span>

                      {/* status pill */}
                      <div className="flex-shrink-0">
                        <span
                          className={cn(
                            'text-[10.5px] font-semibold px-2.5 py-[3px] rounded-full border',
                            isOk
                              ? 'bg-success-bg text-success border-success-border'
                              : isFail
                                ? 'bg-danger-bg text-danger border-danger-border'
                                : isRunningRun
                                  ? 'bg-blue-soft text-blue-primary border-blue-border'
                                  : 'bg-bg-muted text-text-3 border-line-1',
                          )}
                        >
                          {run.status.charAt(0) + run.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
          </div>
        )}
      </div>
    </Layout>
  );
}
