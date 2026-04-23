import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  Database,
  GitBranch,
  BarChart3,
  Shield,
  Clock,
  Sparkles,
  Check,
  Search,
  Table,
  Server,
  Menu,
  X,
  Zap,
  Plus,
  Minus,
  Activity,
  CircleCheck,
  Layers,
  Workflow,
  Lock,
  Bell,
  Users,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { FacebookIcon } from '@/components/icons/BrandIcons';
import { cn } from '@/lib/utils';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const useInView = (options: IntersectionObserverInit = {}) => {
  const ref = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, ...options }
    );
    const element = ref.current;
    if (element) observer.observe(element);
    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);
  return [ref, isInView] as const;
};

// ──────────────────────────────────────────────────────────
// Product Mockup — the hero visual: workflow canvas
// ──────────────────────────────────────────────────────────

const WorkflowCanvasMockup = () => (
  <div className="relative w-full h-full bg-bg-page overflow-hidden">
    {/* dot-grid backdrop */}
    <div
      className="absolute inset-0 opacity-60"
      style={{
        backgroundImage: 'radial-gradient(circle, #D3DAE6 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    />

    {/* canvas nodes */}
    <div className="relative h-full w-full px-8 py-8">
      {/* Source node: Facebook */}
      <div className="absolute left-[4%] top-[18%] w-[180px] bg-bg-card border border-line-1 rounded-lg shadow-md">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-line-1">
          <div className="w-7 h-7 flex items-center justify-center rounded-md" style={{ backgroundColor: '#1877F2' }}>
            <FacebookIcon size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-text-1 truncate">Facebook Ads</div>
            <div className="text-[10px] text-text-3">Source</div>
          </div>
        </div>
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-[10px] text-text-3 font-mono">12 campaigns</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-success font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-success" /> Live
          </span>
        </div>
      </div>

      {/* Source node: Google Ads */}
      <div className="absolute left-[4%] top-[52%] w-[180px] bg-bg-card border border-line-1 rounded-lg shadow-md">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-line-1">
          <div className="w-7 h-7 flex items-center justify-center rounded-md bg-bg-muted">
            <Search className="w-3.5 h-3.5 text-text-1" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-text-1 truncate">Google Ads</div>
            <div className="text-[10px] text-text-3">Source</div>
          </div>
        </div>
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-[10px] text-text-3 font-mono">8 campaigns</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-success font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-success" /> Live
          </span>
        </div>
      </div>

      {/* Transform node */}
      <div className="absolute left-1/2 top-[32%] -translate-x-1/2 w-[200px] bg-bg-card border-2 border-blue-primary rounded-lg shadow-lg">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-border bg-blue-soft">
          <div className="w-7 h-7 flex items-center justify-center rounded-md bg-blue-primary">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-text-1 truncate">Unify Schema</div>
            <div className="text-[10px] text-blue-primary font-medium">Transform</div>
          </div>
        </div>
        <div className="px-3 py-2 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-text-2">
            <Check className="w-2.5 h-2.5 text-success" /> Normalize campaign IDs
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-text-2">
            <Check className="w-2.5 h-2.5 text-success" /> Convert to USD
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-text-2">
            <Check className="w-2.5 h-2.5 text-success" /> Dedupe rows
          </div>
        </div>
      </div>

      {/* Destination: BigQuery */}
      <div className="absolute right-[4%] top-[18%] w-[180px] bg-bg-card border border-line-1 rounded-lg shadow-md">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-line-1">
          <div className="w-7 h-7 flex items-center justify-center rounded-md" style={{ backgroundColor: '#4285F4' }}>
            <Database className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-text-1 truncate">BigQuery</div>
            <div className="text-[10px] text-text-3">Destination</div>
          </div>
        </div>
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-[10px] text-text-3 font-mono">2.4M rows</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-success font-medium">
            <CircleCheck className="w-3 h-3" /> Synced
          </span>
        </div>
      </div>

      {/* Destination: Sheets */}
      <div className="absolute right-[4%] top-[52%] w-[180px] bg-bg-card border border-line-1 rounded-lg shadow-md">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-line-1">
          <div className="w-7 h-7 flex items-center justify-center rounded-md" style={{ backgroundColor: '#0F9D58' }}>
            <Table className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-text-1 truncate">Google Sheets</div>
            <div className="text-[10px] text-text-3">Destination</div>
          </div>
        </div>
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-[10px] text-text-3 font-mono">180K rows</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-success font-medium">
            <CircleCheck className="w-3 h-3" /> Synced
          </span>
        </div>
      </div>

      {/* connection lines with flowing data */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="flowA" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1877F2" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#1848F3" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="flowB" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4285F4" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#1848F3" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="flowC" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1848F3" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#4285F4" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="flowD" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1848F3" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0F9D58" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <path d="M 22 23 C 35 23, 38 38, 48 38" stroke="url(#flowA)" strokeWidth="0.4" fill="none" vectorEffect="non-scaling-stroke" />
        <path d="M 22 57 C 35 57, 38 42, 48 42" stroke="url(#flowB)" strokeWidth="0.4" fill="none" vectorEffect="non-scaling-stroke" />
        <path d="M 62 38 C 72 38, 75 23, 82 23" stroke="url(#flowC)" strokeWidth="0.4" fill="none" vectorEffect="non-scaling-stroke" />
        <path d="M 62 42 C 72 42, 75 57, 82 57" stroke="url(#flowD)" strokeWidth="0.4" fill="none" vectorEffect="non-scaling-stroke" />
        {/* flowing dots */}
        <circle r="0.9" fill="#1877F2">
          <animateMotion dur="2.4s" repeatCount="indefinite" path="M 22 23 C 35 23, 38 38, 48 38" />
        </circle>
        <circle r="0.9" fill="#4285F4">
          <animateMotion dur="2.4s" begin="0.6s" repeatCount="indefinite" path="M 22 57 C 35 57, 38 42, 48 42" />
        </circle>
        <circle r="0.9" fill="#1848F3">
          <animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="M 62 38 C 72 38, 75 23, 82 23" />
        </circle>
        <circle r="0.9" fill="#0F9D58">
          <animateMotion dur="2.4s" begin="1.8s" repeatCount="indefinite" path="M 62 42 C 72 42, 75 57, 82 57" />
        </circle>
      </svg>

      {/* floating run toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-bg-card border border-line-1 rounded-full shadow-md">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-text-2">
          <span className="pulse-ring w-2 h-2 rounded-full bg-blue-primary" />
          <span className="font-medium">Running</span>
        </span>
        <span className="w-px h-3 bg-line-1" />
        <span className="text-[11px] text-text-3 font-mono">1,248 rows/sec</span>
      </div>
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────
// Pipeline Board — three-column kanban-style showcase
// ──────────────────────────────────────────────────────────

const PipelineBoard = () => {
  const columns = [
    {
      title: 'Sources',
      subtitle: '3 active',
      tint: 'bg-blue-soft text-blue-primary border-blue-border',
      cards: [
        { name: 'Facebook Ads', meta: '12 campaigns · 48 ad sets', status: 'Synced', tone: 'success' },
        { name: 'Google Ads', meta: '8 campaigns · 21 ad groups', status: 'Synced', tone: 'success' },
        { name: 'TikTok Ads', meta: '4 campaigns · 12 ad groups', status: 'Syncing', tone: 'info' },
      ],
    },
    {
      title: 'Transform',
      subtitle: 'Unified schema',
      tint: 'bg-violet-bg text-violet border-violet-border',
      cards: [
        { name: 'Normalize campaign IDs', meta: 'Rule · deterministic', status: 'Applied', tone: 'success' },
        { name: 'Convert currency to USD', meta: 'FX rate · daily', status: 'Applied', tone: 'success' },
        { name: 'Dedupe rows by key', meta: 'Key: campaign_id, date', status: 'Applied', tone: 'success' },
      ],
    },
    {
      title: 'Destinations',
      subtitle: '2 warehouses',
      tint: 'bg-success-bg text-success border-success-border',
      cards: [
        { name: 'BigQuery', meta: 'marketing.campaigns · 2.4M rows', status: 'Synced', tone: 'success' },
        { name: 'Google Sheets', meta: 'Client report · 180K rows', status: 'Synced', tone: 'success' },
        { name: 'MySQL (replica)', meta: 'Optional · upsert mode', status: 'Idle', tone: 'muted' },
      ],
    },
  ];

  return (
    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((col, colIdx) => (
        <div key={col.title} className="relative bg-bg-card border border-line-1 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-text-3">{col.title}</div>
              <div className="text-sm font-medium text-text-1 mt-0.5">{col.subtitle}</div>
            </div>
            <span className={cn('px-2 py-0.5 text-[10px] font-semibold rounded-full border', col.tint)}>
              {col.cards.length}
            </span>
          </div>
          <div className="space-y-2.5">
            {col.cards.map((card) => (
              <div
                key={card.name}
                className="p-3 bg-bg-page border border-line-1 rounded-lg hover:border-blue-border transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="text-sm font-medium text-text-1">{card.name}</div>
                  <StatusDot tone={card.tone} />
                </div>
                <div className="text-xs text-text-3 font-mono">{card.meta}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded',
                      card.tone === 'success' && 'bg-success-bg text-success',
                      card.tone === 'info' && 'bg-blue-soft text-blue-primary',
                      card.tone === 'muted' && 'bg-bg-muted text-text-3'
                    )}
                  >
                    {card.status}
                  </span>
                  {colIdx < 2 && <ArrowUpRight className="w-3 h-3 text-text-4" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const StatusDot = ({ tone }: { tone: string }) => (
  <span
    className={cn(
      'w-2 h-2 rounded-full mt-1.5',
      tone === 'success' && 'bg-success',
      tone === 'info' && 'bg-blue-primary',
      tone === 'muted' && 'bg-line-2'
    )}
  />
);

// ──────────────────────────────────────────────────────────
// Integration grid by category
// ──────────────────────────────────────────────────────────

const IntegrationGrid = () => {
  const categories = [
    {
      title: 'Ad Platforms',
      items: [
        { name: 'Facebook Ads', dot: '#1877F2', live: true },
        { name: 'Google Ads', dot: '#4285F4', live: true },
        { name: 'TikTok Ads', dot: '#111111', live: true },
      ],
    },
    {
      title: 'Destinations',
      items: [
        { name: 'BigQuery', dot: '#4285F4', live: true },
        { name: 'Google Sheets', dot: '#0F9D58', live: true },
        { name: 'MySQL', dot: '#00758F', live: true },
      ],
    },
    {
      title: 'Sources',
      items: [
        { name: 'BigQuery', dot: '#4285F4', live: true },
        { name: 'Amazon S3', dot: '#FF9900', live: true },
        { name: 'Webhooks', dot: '#1848F3', live: true },
      ],
    },
    {
      title: 'Alerts',
      items: [
        { name: 'Slack', dot: '#4A154B', live: true },
        { name: 'Email', dot: '#3B4557', live: false },
        { name: 'Discord', dot: '#5865F2', live: false },
      ],
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {categories.map((cat) => (
        <div key={cat.title} className="bg-bg-card border border-line-1 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-text-3">{cat.title}</div>
            <span className="text-[10px] font-mono text-text-4">{cat.items.filter((i) => i.live).length}/{cat.items.length}</span>
          </div>
          <ul className="space-y-2.5">
            {cat.items.map((item) => (
              <li key={item.name} className="flex items-center gap-2.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.live ? item.dot : '#D3DAE6' }}
                />
                <span className={cn('text-sm flex-1', item.live ? 'text-text-1' : 'text-text-3')}>
                  {item.name}
                </span>
                {!item.live && (
                  <span className="text-[9px] font-semibold text-text-4 uppercase tracking-wider">
                    Soon
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// Feature row — alternating screenshot + text
// ──────────────────────────────────────────────────────────

const FeatureRow = ({
  tag,
  title,
  description,
  bullets,
  visual,
  reverse,
}: {
  tag: string;
  title: string;
  description: string;
  bullets: string[];
  visual: React.ReactNode;
  reverse?: boolean;
}) => (
  <div className={cn('grid lg:grid-cols-2 gap-10 lg:gap-16 items-center', reverse && 'lg:[&>*:first-child]:order-2')}>
    <div className="space-y-5">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-soft border border-blue-border rounded-full text-xs font-semibold text-blue-primary uppercase tracking-wider">
        {tag}
      </span>
      <h3 className="text-3xl md:text-4xl font-semibold text-text-1 tracking-tight leading-tight">
        {title}
      </h3>
      <p className="text-base text-text-2 leading-relaxed">{description}</p>
      <ul className="space-y-2.5">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2.5">
            <Check className="w-4 h-4 mt-0.5 text-blue-primary flex-shrink-0" />
            <span className="text-sm text-text-2">{b}</span>
          </li>
        ))}
      </ul>
    </div>
    <div className="relative aspect-[5/4] bg-bg-card border border-line-1 rounded-2xl shadow-md overflow-hidden">
      {visual}
    </div>
  </div>
);

// Visuals for each feature row
const RunHistoryVisual = () => (
  <div className="p-5 h-full">
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="text-xs font-semibold text-text-3 uppercase tracking-wider">Run History</div>
        <div className="text-sm font-semibold text-text-1 mt-0.5">Last 24 hours</div>
      </div>
      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-success-bg text-success text-[11px] font-medium rounded-md">
        <CircleCheck className="w-3 h-3" /> 98.2% success
      </div>
    </div>
    <div className="space-y-2">
      {[
        { name: 'facebook-ads-daily', time: '14:00', duration: '42s', status: 'success' },
        { name: 'google-ads-hourly', time: '14:00', duration: '28s', status: 'success' },
        { name: 'tiktok-ads-daily', time: '13:00', duration: '1m 12s', status: 'success' },
        { name: 'unified-warehouse', time: '13:00', duration: '2m 04s', status: 'running' },
        { name: 'client-report-sheet', time: '12:00', duration: '18s', status: 'success' },
      ].map((run) => (
        <div key={run.name} className="flex items-center gap-3 p-2.5 bg-bg-page border border-line-1 rounded-lg">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              run.status === 'success' ? 'bg-success' : 'bg-blue-primary pulse-ring'
            )}
          />
          <span className="text-xs font-mono text-text-1 flex-1 truncate">{run.name}</span>
          <span className="text-[10px] text-text-3 font-mono">{run.time}</span>
          <span className="text-[10px] text-text-3 font-mono w-12 text-right">{run.duration}</span>
        </div>
      ))}
    </div>
  </div>
);

const SchemaMapperVisual = () => (
  <div className="p-5 h-full flex flex-col">
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="text-xs font-semibold text-text-3 uppercase tracking-wider">Unified Schema</div>
        <div className="text-sm font-semibold text-text-1 mt-0.5">Campaign.spend</div>
      </div>
      <span className="text-[10px] font-mono text-text-4">numeric · USD</span>
    </div>
    <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
      <div className="space-y-2">
        {[
          { src: 'fb', name: 'facebook', field: 'spend', color: '#1877F2' },
          { src: 'go', name: 'google', field: 'cost_micros', color: '#4285F4' },
          { src: 'tk', name: 'tiktok', field: 'spend', color: '#111111' },
        ].map((s) => (
          <div key={s.name} className="flex items-center gap-2 p-2 bg-bg-page border border-line-1 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] font-mono text-text-2 flex-1 truncate">{s.name}.{s.field}</span>
          </div>
        ))}
      </div>
      <ArrowDownRight className="w-6 h-6 text-blue-primary rotate-[-45deg]" />
      <div className="p-3 bg-blue-soft border border-blue-border rounded-lg">
        <div className="text-[10px] font-semibold text-blue-primary uppercase tracking-wider mb-1">OrbitX</div>
        <div className="text-sm font-mono font-semibold text-text-1">campaign.spend</div>
        <div className="text-[10px] text-text-3 font-mono mt-1">3 sources mapped</div>
      </div>
    </div>
  </div>
);

const AlertsVisual = () => (
  <div className="p-5 h-full">
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="text-xs font-semibold text-text-3 uppercase tracking-wider">Alerts</div>
        <div className="text-sm font-semibold text-text-1 mt-0.5">Pipeline monitoring</div>
      </div>
      <Bell className="w-4 h-4 text-text-3" />
    </div>
    <div className="space-y-2.5">
      <div className="p-3 bg-warning-bg border border-warning-border rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-warning" />
          <span className="text-xs font-semibold text-warning">Anomaly detected</span>
          <span className="ml-auto text-[10px] text-text-3 font-mono">2m ago</span>
        </div>
        <div className="text-xs text-text-2">facebook-ads-daily · spend anomaly</div>
      </div>
      <div className="p-3 bg-success-bg border border-success-border rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          <span className="text-xs font-semibold text-success">Run completed</span>
          <span className="ml-auto text-[10px] text-text-3 font-mono">12m ago</span>
        </div>
        <div className="text-xs text-text-2">unified-warehouse · 2.4M rows loaded</div>
      </div>
      <div className="p-3 bg-bg-page border border-line-1 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-text-4" />
          <span className="text-xs font-semibold text-text-2">Scheduled</span>
          <span className="ml-auto text-[10px] text-text-3 font-mono">in 48m</span>
        </div>
        <div className="text-xs text-text-2">google-ads-hourly · next run 15:00</div>
      </div>
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────
// Pricing
// ──────────────────────────────────────────────────────────

const PricingCard = ({
  name,
  price,
  period,
  description,
  features,
  popular,
  ctaLabel,
  onGetStarted,
}: {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  popular?: boolean;
  ctaLabel: string;
  onGetStarted?: () => void;
}) => (
  <div
    className={cn(
      'relative p-7 bg-bg-card rounded-2xl transition-all',
      popular ? 'border-2 border-blue-primary shadow-lg' : 'border border-line-1'
    )}
  >
    {popular && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-primary text-white text-xs font-semibold rounded-full">
        Most Popular
      </div>
    )}
    <div className="mb-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-3 mb-3">{name}</h3>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-4xl font-semibold text-text-1">{price}</span>
        {period && <span className="text-sm text-text-3">{period}</span>}
      </div>
      <p className="text-sm text-text-2">{description}</p>
    </div>
    <div className="h-px bg-line-1 mb-5" />
    <ul className="space-y-2.5 mb-6">
      {features.map((feature, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-primary" />
          <span className="text-sm text-text-2">{feature}</span>
        </li>
      ))}
    </ul>
    <button
      onClick={onGetStarted}
      className={cn(
        'w-full py-2.5 font-medium text-sm rounded-lg cursor-pointer transition-colors duration-200',
        popular
          ? 'bg-blue-primary text-white hover:bg-blue-primary-hover'
          : 'bg-bg-muted text-text-1 hover:bg-blue-soft hover:text-blue-primary'
      )}
    >
      {ctaLabel}
    </button>
  </div>
);

// ──────────────────────────────────────────────────────────
// FAQ
// ──────────────────────────────────────────────────────────

const FaqItem = ({ question, answer }: { question: string; answer: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line-1 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left cursor-pointer"
      >
        <span className="text-base font-medium text-text-1 pr-6">{question}</span>
        {open ? (
          <Minus className="w-5 h-5 flex-shrink-0 text-blue-primary" />
        ) : (
          <Plus className="w-5 h-5 flex-shrink-0 text-text-3" />
        )}
      </button>
      {open && <p className="pb-5 text-sm text-text-2 leading-relaxed max-w-2xl">{answer}</p>}
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleGoogleSignIn = () => navigate('/login');

  const navLinks = [
    { href: '#pipeline', label: 'Product' },
    { href: '#integrations', label: 'Integrations' },
    { href: '#features', label: 'Features' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <div className="min-h-screen bg-bg-page text-text-1">
      {/* Navigation */}
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 bg-bg-page/90 backdrop-blur transition-colors',
          scrolled && 'border-b border-line-1'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 flex items-center justify-center bg-blue-primary rounded-md">
                <span className="text-white font-semibold text-sm">O</span>
              </div>
              <span className="text-lg font-semibold text-text-1 tracking-tight">OrbitX</span>
            </Link>

            <div className="hidden md:flex items-center gap-7">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-text-2 hover:text-text-1 transition-colors cursor-pointer"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium text-text-2 hover:text-text-1 transition-colors rounded-md cursor-pointer"
              >
                Dashboard
              </Link>
              <button
                onClick={handleGoogleSignIn}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-blue-primary hover:bg-blue-primary-hover text-white font-medium text-sm rounded-md transition-colors cursor-pointer"
              >
                Start free
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
                className="md:hidden p-2 text-text-2 hover:text-text-1 rounded-md cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-line-1 bg-bg-card">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 text-sm font-medium text-text-2 hover:text-text-1"
                >
                  {link.label}
                </a>
              ))}
              <button
                onClick={() => {
                  handleGoogleSignIn();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2 bg-blue-primary hover:bg-blue-primary-hover text-white font-medium text-sm rounded-md cursor-pointer"
              >
                Start free
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative pt-28 pb-12 md:pt-36 md:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 bg-blue-soft border border-blue-border rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-blue-primary" />
              <span className="text-xs font-medium text-blue-primary">Now in Public Beta · Looking for design partners</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-[72px] font-semibold text-text-1 leading-[1.05] tracking-tight mb-6">
              The marketing data
              <br />
              platform that <span className="text-blue-primary">runs itself.</span>
            </h1>

            <p className="text-lg md:text-xl text-text-2 leading-relaxed mb-8 max-w-2xl mx-auto">
              Pipe Facebook, Google, and TikTok ad data into your warehouse on a schedule —
              normalized into one schema, monitored end-to-end, and zero code.
            </p>

            <div className="flex flex-wrap gap-3 justify-center mb-6">
              <button
                onClick={handleGoogleSignIn}
                className="group inline-flex items-center gap-2.5 px-6 py-3.5 bg-blue-primary hover:bg-blue-primary-hover text-white font-medium text-sm rounded-lg transition-colors cursor-pointer shadow-md"
              >
                <GoogleIcon />
                Start free with Google
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/workflows/builder')}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-bg-card border border-line-2 hover:border-blue-primary hover:text-blue-primary text-text-1 font-medium text-sm rounded-lg transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4" />
                See interactive demo
              </button>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs text-text-3">
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-success" />
                No credit card
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-success" />
                Setup in 5 minutes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-success" />
                Cancel anytime
              </span>
            </div>
          </div>

          {/* Hero product mockup */}
          <div className="relative max-w-6xl mx-auto">
            <div className="relative aspect-[16/9] bg-bg-card border border-line-1 rounded-2xl shadow-lg overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-10 flex items-center gap-2 px-4 border-b border-line-1 bg-bg-muted">
                <span className="w-2.5 h-2.5 rounded-full bg-line-2" />
                <span className="w-2.5 h-2.5 rounded-full bg-line-2" />
                <span className="w-2.5 h-2.5 rounded-full bg-line-2" />
                <div className="ml-3 px-3 py-1 bg-bg-card border border-line-1 rounded-md text-[11px] font-mono text-text-3">
                  app.orbitx.io / workflows / unified-marketing
                </div>
              </div>
              <div className="absolute inset-x-0 top-10 bottom-0">
                <WorkflowCanvasMockup />
              </div>
            </div>
            {/* Soft shadow under hero mockup */}
            <div className="absolute inset-x-10 -bottom-6 h-8 bg-blue-primary/10 blur-2xl rounded-full" aria-hidden />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="py-10 border-t border-b border-line-1 bg-bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-3">Trusted by teams at</span>
            {['Agency A', 'Studio B', 'Performance Co', 'Lab C', 'Atlas D'].map((brand) => (
              <span
                key={brand}
                className="text-base font-semibold text-text-3 hover:text-text-1 transition-colors cursor-default"
                style={{ fontFamily: 'Geist Mono Variable, monospace' }}
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PIPELINE showcase */}
      <section id="pipeline" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="flex justify-center mb-5">
              <div className="w-10 h-1 bg-blue-primary rounded-full" />
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold text-text-1 tracking-tight mb-4">
              Your entire pipeline,
              <br />
              on one board.
            </h2>
            <p className="text-lg text-text-2">
              Sources on the left, transforms in the middle, destinations on the right.
              Everything you need to see at a glance — no tab-hopping.
            </p>
          </div>

          <PipelineBoard />

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <button
              onClick={handleGoogleSignIn}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-primary hover:bg-blue-primary-hover text-white font-medium text-sm rounded-lg transition-colors cursor-pointer"
            >
              Build your first pipeline
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="py-14 bg-bg-card border-y border-line-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Ad platforms', value: '3', note: 'Facebook, Google, TikTok' },
              { label: 'Destinations', value: '3', note: 'BigQuery, Sheets, MySQL' },
              { label: 'Transforms', value: '8', note: 'unify, SQL, join, anomaly…' },
              { label: 'Code required', value: '0', note: 'visual builder only' },
            ].map((s) => (
              <div key={s.label} className="text-center md:text-left">
                <div className="text-3xl md:text-4xl font-semibold text-text-1 tracking-tight">{s.value}</div>
                <div className="text-sm font-medium text-text-1 mt-1">{s.label}</div>
                <div className="text-xs text-text-3 mt-0.5">{s.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section id="integrations" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <div className="w-10 h-1 bg-blue-primary rounded-full mb-5" />
            <h2 className="text-3xl md:text-4xl font-semibold text-text-1 tracking-tight mb-4">
              Connects with the whole marketing stack
            </h2>
            <p className="text-lg text-text-2">
              From ad platforms to warehouses and alerts — OrbitX sits in the middle, quiet and reliable.
            </p>
          </div>

          <IntegrationGrid />

          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-text-3">
            <Users className="w-4 h-4" />
            Need something we don't support yet?
            <a href="#" className="text-blue-primary font-medium hover:underline">Request an integration →</a>
          </div>
        </div>
      </section>

      {/* FEATURES — alternating rows */}
      <section id="features" className="py-24 md:py-32 bg-bg-card border-y border-line-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="flex justify-center mb-5">
              <div className="w-10 h-1 bg-blue-primary rounded-full" />
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold text-text-1 tracking-tight mb-4">
              Everything your team needs
            </h2>
            <p className="text-lg text-text-2">
              Purpose-built for performance marketing teams that care about clean data more than fancy dashboards.
            </p>
          </div>

          <div className="space-y-24">
            <FeatureRow
              tag="Run history"
              title="Know exactly what ran, when, and why."
              description="Every pipeline run is recorded with duration, row counts, and per-node status. Failures surface with logs, not just red icons."
              bullets={[
                'Per-node execution status with full logs',
                'Row counts tracked per run',
                'Retry any past run with one click',
              ]}
              visual={<RunHistoryVisual />}
            />
            <FeatureRow
              tag="Unified schema"
              title="One schema across every platform."
              description="facebook.spend, google.cost_micros, tiktok.spend — OrbitX maps them all to campaign.spend automatically, so your reports work everywhere."
              bullets={[
                'Core metrics unified across ad platforms',
                'spend, impressions, clicks, conversions & more',
                'Works with any supported destination',
              ]}
              visual={<SchemaMapperVisual />}
              reverse
            />
            <FeatureRow
              tag="Alerts"
              title="Get notified before your client does."
              description="Slack alerts fire on failed runs and anomaly transforms — so you hear about pipeline problems before a report breaks."
              bullets={[
                'Slack notifications on run failure',
                'Anomaly detection transform',
                'Per-workflow notification channels',
              ]}
              visual={<AlertsVisual />}
            />
          </div>
        </div>
      </section>

      {/* STORIES — stubbed per no-mocks rule */}
      <section id="stories" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="flex justify-center mb-5">
              <div className="w-10 h-1 bg-blue-primary rounded-full" />
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold text-text-1 tracking-tight mb-4">
              Built with early-access teams
            </h2>
            <p className="text-lg text-text-2">
              We're in Public Beta. Customer stories land here as design partners go live — want to be one?
            </p>
          </div>

          {/* FEATURE-TODO: replace with real testimonials once design partners go live */}
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                metric: 'Design partner',
                label: 'Bangkok',
                description:
                  'Performance agency managing 30+ client accounts — testing unified schema across Facebook, Google, and TikTok.',
              },
              {
                metric: 'Design partner',
                label: 'Singapore',
                description:
                  'In-house ecommerce team piping ad spend into BigQuery for finance reconciliation and attribution.',
              },
              {
                metric: 'Design partner',
                label: 'Ho Chi Minh',
                description:
                  'Growth marketing team replacing a brittle Airbyte + dbt pipeline with one visual workflow.',
              },
            ].map((s) => (
              <div key={s.label} className="p-6 bg-bg-card border border-line-1 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 bg-blue-soft text-blue-primary text-[10px] font-semibold uppercase tracking-wider rounded">
                    {s.metric}
                  </span>
                  <span className="text-xs text-text-3 font-mono">{s.label}</span>
                </div>
                <p className="text-sm text-text-2 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <a
              href="#"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-bg-card border border-line-2 hover:border-blue-primary hover:text-blue-primary text-text-1 font-medium text-sm rounded-lg transition-colors cursor-pointer"
            >
              Apply to be a design partner
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 md:py-32 bg-bg-card border-y border-line-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="flex justify-center mb-5">
              <div className="w-10 h-1 bg-blue-primary rounded-full" />
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold text-text-1 tracking-tight mb-4">
              Simple pricing, no surprises
            </h2>
            <p className="text-lg text-text-2">
              Start free. Upgrade when your team grows. No per-seat fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              description="For solo operators and side projects."
              features={[
                '3 active workflows',
                '1 destination',
                'All live connectors',
                'Community support',
              ]}
              ctaLabel="Start free"
              onGetStarted={handleGoogleSignIn}
            />
            <PricingCard
              name="Team"
              price="$79"
              period="/ month"
              description="For in-house marketing teams."
              features={[
                'Unlimited workflows',
                'All destinations',
                'Cron scheduling',
                'Slack alerts on failure',
                'Priority support',
              ]}
              popular
              ctaLabel="Start free"
              onGetStarted={handleGoogleSignIn}
            />
            <PricingCard
              name="Agency"
              price="$249"
              period="/ month"
              description="For agencies managing multiple clients."
              features={[
                'Everything in Team',
                'Unlimited client workspaces',
                'Unified marketing schema',
                'Anomaly detection',
                'Dedicated onboarding',
              ]}
              ctaLabel="Contact sales"
              onGetStarted={handleGoogleSignIn}
            />
          </div>

          <div className="mt-10 text-center text-xs text-text-3">
            All plans include TLS encryption and encrypted OAuth token storage.
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-5">
              <div className="w-10 h-1 bg-blue-primary rounded-full" />
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold text-text-1 tracking-tight mb-3">
              Frequently asked
            </h2>
            <p className="text-lg text-text-2">Answers to the questions we hear most often.</p>
          </div>

          <div className="bg-bg-card border border-line-1 rounded-xl px-6 md:px-8">
            <FaqItem
              question="Which ad platforms do you support?"
              answer="Facebook Ads, Google Ads, and TikTok Ads are live today. LinkedIn Ads, GA4, and Shopify are on our roadmap."
            />
            <FaqItem
              question="Where is my data stored?"
              answer="OrbitX only stores workflow configurations and execution metadata. The actual rows flow directly from the source API into your warehouse — we never keep a copy."
            />
            <FaqItem
              question="Do I need a data engineer to use this?"
              answer="No. The visual builder handles extract, transform, and load without any SQL or Python. If you can read a spreadsheet, you can build a pipeline."
            />
            <FaqItem
              question="Can I try it before paying?"
              answer="Yes. The Free plan has no credit card requirement, and Team comes with a 14-day trial of all paid features."
            />
            <FaqItem
              question="How do you secure my OAuth tokens?"
              answer="Tokens are encrypted at rest in our database and never exposed to the frontend. All traffic runs over TLS. We're in public beta and working toward formal compliance certifications."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 bg-bg-card border-t border-line-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative p-10 md:p-14 bg-gradient-to-br from-blue-primary to-[#0E35C4] rounded-2xl text-center overflow-hidden shadow-lg">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
              aria-hidden
            />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-4">
                Ship your first pipeline today
              </h2>
              <p className="text-base md:text-lg text-white/80 mb-8 max-w-xl mx-auto">
                Connect Facebook Ads to BigQuery in under five minutes. Free forever for small teams.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleGoogleSignIn}
                  className="group inline-flex items-center gap-2.5 px-6 py-3.5 bg-white text-blue-primary hover:bg-blue-soft font-medium text-sm rounded-lg transition-colors cursor-pointer"
                >
                  <GoogleIcon />
                  Start free with Google
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={() => navigate('/workflows/builder')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 border border-white/30 hover:border-white text-white font-medium text-sm rounded-lg transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  See demo
                </button>
              </div>
              <div className="mt-6 flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs text-white/70">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> No credit card
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Setup in 5 minutes
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Cancel anytime
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line-1 bg-bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 flex items-center justify-center bg-blue-primary rounded-md">
                  <span className="text-white font-semibold text-xs">O</span>
                </div>
                <span className="text-base font-semibold text-text-1 tracking-tight">OrbitX</span>
              </Link>
              <p className="text-sm text-text-2 max-w-xs">
                The marketing data intelligence platform for teams that want answers, not spreadsheets.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-3 mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#pipeline" className="text-text-2 hover:text-text-1 transition-colors">Pipeline</a></li>
                <li><a href="#integrations" className="text-text-2 hover:text-text-1 transition-colors">Integrations</a></li>
                <li><a href="#features" className="text-text-2 hover:text-text-1 transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-text-2 hover:text-text-1 transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-3 mb-4">Resources</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#" className="text-text-2 hover:text-text-1 transition-colors">Documentation</a></li>
                <li><a href="#" className="text-text-2 hover:text-text-1 transition-colors">API reference</a></li>
                <li><a href="#" className="text-text-2 hover:text-text-1 transition-colors">Changelog</a></li>
                <li><a href="#" className="text-text-2 hover:text-text-1 transition-colors">Status</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-3 mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#" className="text-text-2 hover:text-text-1 transition-colors">About</a></li>
                <li><a href="#" className="text-text-2 hover:text-text-1 transition-colors">Blog</a></li>
                <li><a href="#" className="text-text-2 hover:text-text-1 transition-colors">Contact</a></li>
                <li><a href="#faq" className="text-text-2 hover:text-text-1 transition-colors">FAQ</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-line-1 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-3">
              &copy; {new Date().getFullYear()} OrbitX. All rights reserved.
            </p>
            <div className="flex items-center gap-5 text-sm">
              <span className="inline-flex items-center gap-1.5 text-text-3">
                <Lock className="w-3.5 h-3.5" /> TLS + encrypted tokens
              </span>
              <span className="inline-flex items-center gap-1.5 text-text-3">
                <Shield className="w-3.5 h-3.5" /> Public Beta</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
