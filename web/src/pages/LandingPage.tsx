import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  Database,
  BarChart3,
  Shield,
  Sparkles,
  Check,
  Search,
  Table,
  Menu,
  X,
  Zap,
  Plus,
  Minus,
  CircleCheck,
  Layers,
  Workflow,
  Lock,
  Bell,
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
// Scroll-reveal wrapper — fades + slides up when element enters viewport
// ──────────────────────────────────────────────────────────
const AnimateIn = ({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const [ref, inView] = useInView({ threshold: 0.1, rootMargin: '0px 0px -48px 0px' });
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(
        'transition-all duration-700 ease-out',
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        className
      )}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// Data-flow particle canvas — dots spawn from edges (representing
// ad platforms) and converge toward the hero centre (OrbitX hub).
// ──────────────────────────────────────────────────────────
type FlowParticle = {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number;
  color: string;
  r: number;
  life: number;
  maxLife: number;
  trail: { x: number; y: number }[];
};

const DataFlowCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;

    const setSize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    setSize();
    window.addEventListener('resize', setSize);

    const COLORS = ['#1848F3', '#6D28D9', '#4F46E5', '#3B82F6', '#7C3AED'];
    const MAX = 90;
    const particles: FlowParticle[] = [];

    const spawn = () => {
      if (particles.length >= MAX) return;
      // Eight spawn sources around the edges — evoke platform data sources
      const sources = [
        { x: w * 0.02, y: h * 0.10 },   // top-left
        { x: w * 0.50, y: h * 0.01 },   // top-center
        { x: w * 0.98, y: h * 0.08 },   // top-right
        { x: w * 0.01, y: h * 0.35 },   // upper-left
        { x: w * 0.99, y: h * 0.30 },   // upper-right
        { x: w * 0.01, y: h * 0.68 },   // lower-left
        { x: w * 0.99, y: h * 0.62 },   // lower-right
        { x: w * 0.15, y: h * 0.97 },   // bottom-left
        { x: w * 0.50, y: h * 0.99 },   // bottom-center
        { x: w * 0.85, y: h * 0.97 },   // bottom-right
      ];
      const src = sources[Math.floor(Math.random() * sources.length)];
      // Target: hero centre
      const tx = w * 0.50;
      const ty = h * 0.44;
      const angle = Math.atan2(ty - src.y, tx - src.x) + (Math.random() - 0.5) * 0.45;
      const speed = 0.9 + Math.random() * 1.5;
      particles.push({
        x: src.x, y: src.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 0,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        r: 1.5 + Math.random() * 2.5,
        life: 0,
        maxLife: 65 + Math.random() * 85,
        trail: [],
      });
    };

    let frame = 0;
    let raf: number;

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      if (frame % 4 === 0) spawn();
      frame++;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 12) p.trail.shift();

        // Smooth fade-in / fade-out envelope
        const prog = p.life / p.maxLife;
        if (prog < 0.12) p.alpha = (prog / 0.12) * 0.8;
        else if (prog > 0.70) p.alpha = ((1 - prog) / 0.30) * 0.8;
        else p.alpha = 0.8;

        if (p.life >= p.maxLife) { particles.splice(i, 1); continue; }

        // Trail
        for (let t = 1; t < p.trail.length; t++) {
          const ta = (t / p.trail.length) * p.alpha * 0.30;
          ctx.beginPath();
          ctx.moveTo(p.trail[t - 1].x, p.trail[t - 1].y);
          ctx.lineTo(p.trail[t].x, p.trail[t].y);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = ta;
          ctx.lineWidth = p.r * 0.65;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Dot
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Soft glow halo
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        grad.addColorStop(0, p.color + '30');
        grad.addColorStop(1, p.color + '00');
        ctx.globalAlpha = p.alpha * 0.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(tick);
    };

    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', setSize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

// ──────────────────────────────────────────────────────────
// Mock customer logos — fictional agency/brand names rendered as
// styled wordmarks. Replace with real customers as they sign on.
// FEATURE-TODO: swap to real logos / SVGs when partners are public.
// ──────────────────────────────────────────────────────────
const customerLogos: { name: string; style: string }[] = [
  { name: 'Northstar Digital', style: 'font-semibold tracking-tight' },
  { name: 'Bangkok Labs', style: 'font-bold italic tracking-tight' },
  { name: 'Pixel Pilot', style: 'font-mono font-medium tracking-tight' },
  { name: 'Saigon Studio', style: 'font-semibold uppercase tracking-[0.2em] text-sm md:text-base' },
  { name: 'Mercury & Co.', style: 'font-bold tracking-tight' },
  { name: 'Beacon Media', style: 'font-mono font-semibold' },
  { name: 'Catalyst Group', style: 'font-semibold italic tracking-tight' },
  { name: 'Manila Performance', style: 'font-bold tracking-tight' },
  { name: 'Vega Analytics', style: 'font-mono font-medium tracking-wide' },
  { name: 'Harborwave', style: 'font-bold italic tracking-tight' },
  { name: 'Apex Studios', style: 'font-semibold uppercase tracking-[0.2em] text-sm md:text-base' },
  { name: 'Forge Marketing', style: 'font-bold tracking-tight' },
];

// ──────────────────────────────────────────────────────────
// Activity feed — fake live pipeline events shown in trust strip ticker
// FEATURE-TODO: replace with real pipeline event stream via SSE/WS
// ──────────────────────────────────────────────────────────
const activityFeed = [
  { dot: '#10B981', text: 'Bangkok agency · Facebook Ads synced · 4,200 rows · 1m ago' },
  { dot: '#6366F1', text: 'TikTok Ads → BigQuery · completed in 0.8s' },
  { dot: '#0EA5E9', text: 'Singapore team · unified schema across 3 platforms' },
  { dot: '#10B981', text: 'Google Ads anomaly detected · Slack alert sent' },
  { dot: '#F59E0B', text: 'Ho Chi Minh · pipeline rebuilt · 0 lines of code' },
  { dot: '#10B981', text: 'Saigon Studio · 12,000 rows → Google Sheets · done' },
  { dot: '#6366F1', text: 'Vega Analytics · cron run completed · 3 sources unified' },
  { dot: '#0EA5E9', text: 'Apex Studios · Facebook + Google + TikTok merged · 9,800 rows' },
];

// ──────────────────────────────────────────────────────────
// Hero demo source — set this when a real product video is ready.
// While null, the hero falls back to the animated workflow canvas
// below. Accepts mp4/webm; the player is muted+loop ready.
// FEATURE-TODO: replace with public asset URL (e.g. /demos/orbitx-walkthrough.mp4)
// ──────────────────────────────────────────────────────────
const DEMO_VIDEO_SRC: string | null = null;
const DEMO_VIDEO_POSTER: string | null = null;

const HeroVideoPlayer = ({ src, poster }: { src: string; poster?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    void video.play();
    setPlaying(true);
  };

  return (
    <div className="relative w-full h-full bg-bg-page">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-cover"
        playsInline
        muted
        loop
        preload="metadata"
        controls={playing}
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <button
          type="button"
          onClick={handlePlay}
          aria-label="Play product demo"
          className="group absolute inset-0 flex items-center justify-center cursor-pointer"
        >
          <span
            aria-hidden
            className="absolute inset-0 bg-text-1/20 group-hover:bg-text-1/10 transition-colors"
          />
          <span
            className="relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 text-white rounded-full shadow-lg group-hover:scale-110 transition-transform"
            style={{ background: 'linear-gradient(135deg, #1848F3 0%, #0E35C4 100%)' }}
          >
            <Play className="w-6 h-6 md:w-7 md:h-7 ml-1" fill="currentColor" strokeWidth={0} />
          </span>
        </button>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// Product Mockup — fallback hero visual when no demo video is set
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
      </svg>

      {/* static status toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-bg-card border border-line-1 rounded-full shadow-md">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-text-2">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="font-medium">Last run: 2 min ago</span>
        </span>
        <span className="w-px h-3 bg-line-1" />
        <span className="text-[11px] text-text-3 font-mono">2.4M rows synced</span>
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
      accent: '#1848F3',
      glow: 'rgba(24, 72, 243, 0.10)',
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
      accent: '#6D28D9',
      glow: 'rgba(109, 40, 217, 0.10)',
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
      accent: '#047857',
      glow: 'rgba(4, 120, 87, 0.10)',
      cards: [
        { name: 'BigQuery', meta: 'marketing.campaigns · 2.4M rows', status: 'Synced', tone: 'success' },
        { name: 'Google Sheets', meta: 'Client report · 180K rows', status: 'Synced', tone: 'success' },
        { name: 'MySQL (replica)', meta: 'Optional · upsert mode', status: 'Idle', tone: 'muted' },
      ],
    },
  ];

  return (
    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5">
      {columns.map((col, colIdx) => (
        <div
          key={col.title}
          className="relative bg-bg-card border border-line-1 rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
          style={{ boxShadow: `0 1px 3px ${col.glow}` }}
        >
          {/* Colored top accent bar */}
          <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: col.accent }} />
          {/* Soft corner glow */}
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-40 blur-3xl pointer-events-none"
            style={{ backgroundColor: col.glow }}
            aria-hidden
          />

          <div className="relative flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.accent }} />
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-text-3">{col.title}</div>
              </div>
              <div className="text-base font-semibold text-text-1 mt-1">{col.subtitle}</div>
            </div>
            <span className={cn('px-2.5 py-1 text-[10px] font-bold rounded-full border', col.tint)}>
              {col.cards.length}
            </span>
          </div>
          <div className="relative space-y-2.5">
            {col.cards.map((card) => (
              <div
                key={card.name}
                className="group p-3.5 bg-bg-page border border-line-1 rounded-xl hover:bg-bg-card hover:border-line-2 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="text-sm font-semibold text-text-1 group-hover:text-blue-primary transition-colors">{card.name}</div>
                  <StatusDot tone={card.tone} />
                </div>
                <div className="text-xs text-text-3 font-mono">{card.meta}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      card.tone === 'success' && 'bg-success-bg text-success',
                      card.tone === 'info' && 'bg-blue-soft text-blue-primary',
                      card.tone === 'muted' && 'bg-bg-muted text-text-3'
                    )}
                  >
                    {card.status}
                  </span>
                  {colIdx < 2 && (
                    <ArrowUpRight className="w-3.5 h-3.5 text-text-4 group-hover:text-blue-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  )}
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
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-soft border border-blue-border rounded-full text-[10px] font-bold text-blue-primary uppercase tracking-[0.16em] shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-primary" />
        {tag}
      </span>
      <h3 className="text-3xl md:text-4xl lg:text-[42px] font-semibold text-text-1 tracking-[-0.025em] leading-[1.1]">
        {title}
      </h3>
      <p className="text-base text-text-2 leading-relaxed">{description}</p>
      <ul className="space-y-3">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-soft flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-blue-primary" strokeWidth={3} />
            </span>
            <span className="text-sm text-text-2 leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>
    </div>
    <div className="relative">
      <div
        className="absolute -inset-4 rounded-3xl opacity-50 blur-2xl"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(24, 72, 243, 0.15) 0%, transparent 70%)',
        }}
      />
      <div className="relative aspect-[5/4] bg-bg-card border border-line-1 rounded-2xl shadow-lg overflow-hidden">
        {visual}
      </div>
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
// Pricing — auto-cycling carousel with sequential feature reveal
// ──────────────────────────────────────────────────────────

const PRICING_PLANS = [
  {
    name: 'Free',
    price: 0,
    period: undefined as string | undefined,
    description: 'For solo operators and side projects.',
    features: ['3 active workflows', '1 destination', 'All live connectors', 'Community support'],
    ctaLabel: 'Start free',
    popular: false,
  },
  {
    name: 'Team',
    price: 79,
    period: '/ month',
    description: 'For in-house marketing teams.',
    features: ['Unlimited workflows', 'All destinations', 'Cron scheduling', 'Slack alerts on failure', 'Priority support'],
    ctaLabel: 'Start free',
    popular: true,
  },
  {
    name: 'Agency',
    price: 249,
    period: '/ month',
    description: 'For agencies managing multiple clients.',
    features: ['Everything in Team', 'Unlimited client workspaces', 'Unified marketing schema', 'Anomaly detection', 'Dedicated onboarding'],
    ctaLabel: 'Contact sales',
    popular: false,
  },
] as const;

const PricingCarousel = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const [activeIdx, setActiveIdx] = useState(1); // start with Team
  const [shownCount, setShownCount] = useState(0);
  const [displayPrice, setDisplayPrice] = useState(79);

  useEffect(() => {
    const plan = PRICING_PLANS[activeIdx];

    // Price count-up
    let rafId: number;
    if (plan.price > 0) {
      const startTime = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - startTime) / 700, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayPrice(Math.round(eased * plan.price));
        if (progress < 1) rafId = requestAnimationFrame(animate);
      };
      rafId = requestAnimationFrame(animate);
    } else {
      setDisplayPrice(0);
    }

    // Sequential feature reveal then advance
    setShownCount(0);
    let current = 0;
    let timerId: ReturnType<typeof setTimeout>;

    const reveal = () => {
      if (current < plan.features.length) {
        current++;
        setShownCount(current);
        timerId = setTimeout(reveal, 480);
      } else {
        timerId = setTimeout(() => {
          setActiveIdx(i => (i + 1) % PRICING_PLANS.length);
        }, 2200);
      }
    };
    timerId = setTimeout(reveal, 500);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [activeIdx]);

  // slot: 0 = center, 1 = right, 2 = left
  const getSlot = (idx: number) => ((idx - activeIdx) % 3 + 3) % 3;
  // translateX per slot (in px, relative to centered anchor)
  const slotX: Record<number, number> = { 0: 0, 1: 344, 2: -344 };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Sliding carousel */}
      <div className="relative overflow-hidden" style={{ height: '460px' }}>

        {PRICING_PLANS.map((plan, idx) => {
          const slot = getSlot(idx);
          const isCenter = slot === 0;
          const tx = slotX[slot];
          return (
            <div
              key={plan.name}
              onClick={() => setActiveIdx(idx)}
              className="absolute cursor-pointer"
              style={{
                width: '300px',
                left: '50%',
                top: '16px',
                marginLeft: '-150px',
                transform: `translateX(${tx}px) scale(${isCenter ? 1.0 : 0.88})`,
                transformOrigin: 'top center',
                opacity: isCenter ? 1 : 0.45,
                zIndex: isCenter ? 10 : 1,
                transition: 'transform 0.55s cubic-bezier(0.4,0,0.2,1), opacity 0.55s ease',
              }}
            >
              {/* Glow — sits behind the card, moves with it */}
              {isCenter && (
                <div
                  className="absolute pointer-events-none blur-2xl"
                  style={{
                    inset: '-10px',
                    borderRadius: '28px',
                    background: 'linear-gradient(135deg, #1848F3 0%, #6D28D9 100%)',
                    opacity: 0.22,
                    animation: 'pricing-glow-pulse 3s ease-in-out infinite',
                    zIndex: -1,
                  }}
                  aria-hidden
                />
              )}
              {/* Gradient border wrapper (center only) — padding trick, no mask needed */}
              <div
                style={isCenter ? {
                  padding: '1.5px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #1848F3 0%, #6D28D9 50%, #0B1A5E 100%)',
                } : {}}
              >
                <div
                  className={cn('relative p-6', isCenter ? 'rounded-[18px] bg-bg-card' : 'rounded-2xl bg-bg-card border border-line-1')}
                >
                  <div className="mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] mb-3 text-blue-primary">{plan.name}</h3>
                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-4xl font-bold tracking-[-0.03em] tabular-nums text-text-1">
                        ${isCenter ? displayPrice : plan.price}
                      </span>
                      {plan.period && <span className="text-xs font-medium text-text-3">{plan.period}</span>}
                    </div>
                    <p className="text-xs leading-relaxed text-text-2">{plan.description}</p>
                  </div>
                  <div className="h-px mb-4 bg-line-1" />
                  <ul className="space-y-2 mb-5">
                    {plan.features.map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2"
                        style={{
                          opacity: !isCenter || i < shownCount ? 1 : 0,
                          transform: !isCenter || i < shownCount ? 'translateX(0)' : 'translateX(-10px)',
                          transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
                        }}
                      >
                        <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 bg-blue-soft">
                          <Check className="w-2.5 h-2.5 text-blue-primary" strokeWidth={3} />
                        </span>
                        <span className="text-xs leading-relaxed text-text-2">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={(e) => { e.stopPropagation(); onGetStarted(); }}
                    className={cn('w-full py-2.5 font-semibold text-sm rounded-xl cursor-pointer transition-all duration-200', isCenter ? 'text-white hover:shadow-md hover:-translate-y-0.5' : 'bg-bg-muted text-text-1 hover:bg-blue-soft hover:text-blue-primary')}
                    style={isCenter ? { background: 'linear-gradient(135deg, #1848F3 0%, #0E35C4 100%)' } : undefined}
                  >
                    {plan.ctaLabel}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress indicator */}
      <div className="flex flex-col items-center gap-3 mt-2">
        <div className="flex items-center gap-2.5">
          {PRICING_PLANS.map((plan, idx) => (
            <button
              key={plan.name}
              onClick={() => setActiveIdx(idx)}
              className={cn('rounded-full transition-all duration-300 cursor-pointer', idx === activeIdx ? 'w-8 h-2 bg-blue-primary' : 'w-2 h-2 bg-line-2 hover:bg-line-1')}
            />
          ))}
        </div>
        <div className="w-40 h-0.5 bg-line-1 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(shownCount / PRICING_PLANS[activeIdx].features.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-text-3">{PRICING_PLANS[activeIdx].name} · {shownCount}/{PRICING_PLANS[activeIdx].features.length} features</p>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// FAQ
// ──────────────────────────────────────────────────────────

const FaqItem = ({ question, answer }: { question: string; answer: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        'border-b border-line-1 last:border-b-0 transition-colors',
        open && 'bg-blue-soft/40'
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 px-1 text-left cursor-pointer group"
      >
        <span className={cn(
          'text-base font-semibold pr-6 transition-colors',
          open ? 'text-blue-primary' : 'text-text-1 group-hover:text-blue-primary'
        )}>{question}</span>
        <span
          className={cn(
            'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200',
            open ? 'bg-blue-primary text-white rotate-180' : 'bg-bg-muted text-text-3 group-hover:bg-blue-soft group-hover:text-blue-primary'
          )}
        >
          {open ? (
            <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
          ) : (
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          )}
        </span>
      </button>
      <div
        className={cn(
          'grid transition-all duration-300 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <p className="pb-5 px-1 text-sm text-text-2 leading-relaxed max-w-2xl">{answer}</p>
        </div>
      </div>
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
  const [heroMounted, setHeroMounted] = useState(false);
  const heroGlowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setHeroMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!heroGlowRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    heroGlowRef.current.style.left = `${e.clientX - rect.left}px`;
    heroGlowRef.current.style.top = `${e.clientY - rect.top}px`;
    heroGlowRef.current.style.opacity = '1';
  };

  const handleHeroMouseLeave = () => {
    if (!heroGlowRef.current) return;
    heroGlowRef.current.style.opacity = '0';
  };

  const handleGoogleSignIn = () => navigate('/login');

  const navLinks = [
    { id: 'pipeline', label: 'Product' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'features', label: 'Features' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'faq', label: 'FAQ' },
  ];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-bg-page text-text-1">

      {/* Navigation */}
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-all duration-300',
          scrolled
            ? 'border-line-1 bg-white/90 shadow-sm shadow-black/5'
            : 'border-transparent bg-white/60'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={cn('flex items-center justify-between transition-all', scrolled ? 'h-14' : 'h-16')}>
            <Link
              to="/"
              className="group flex items-center gap-2.5 cursor-pointer"
            >
              <div className="relative">
                {/* Orbital ring */}
                <div
                  className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'conic-gradient(from 0deg, #1848F3, #6D28D9, #1848F3)',
                    animation: 'spin 3s linear infinite',
                    WebkitMask: 'radial-gradient(circle, transparent 60%, black 62%)',
                    mask: 'radial-gradient(circle, transparent 60%, black 62%)',
                  }}
                  aria-hidden
                />
                <div
                  className="relative w-8 h-8 flex items-center justify-center rounded-lg overflow-hidden transition-all duration-300 group-hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #1848F3 0%, #6D28D9 100%)' }}
                >
                  <span className="text-white font-bold text-sm relative z-10 tracking-tight">O</span>
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                    aria-hidden
                  />
                  <span className="absolute top-1 right-1 w-1 h-1 bg-white rounded-full opacity-70" aria-hidden />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-text-1 tracking-[-0.02em]">
                  OrbitX
                </span>
                <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded text-blue-primary bg-blue-soft border border-blue-border">
                  Beta
                </span>
              </div>
            </Link>

            {/* Nav pill container */}
            <div className="hidden md:flex items-center gap-0.5 p-1 rounded-full bg-bg-muted border border-line-1">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="group relative px-3.5 py-1.5 text-sm font-medium text-text-2 hover:text-text-1 transition-colors cursor-pointer rounded-full"
                >
                  <span
                    className="absolute inset-0 rounded-full bg-bg-card opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
                    aria-hidden
                  />
                  <span className="relative">{link.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGoogleSignIn}
                className="hidden sm:inline-flex items-center px-3.5 py-2 text-sm font-medium text-text-2 hover:text-text-1 transition-colors cursor-pointer rounded-full hover:bg-bg-muted"
              >
                Log in
              </button>
              <button
                onClick={handleGoogleSignIn}
                className="group hidden sm:inline-flex items-center gap-2 pl-4 pr-3.5 py-2 bg-blue-primary hover:bg-blue-primary-hover text-white font-semibold text-sm rounded-full transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <span>Start free</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
                className="md:hidden p-2 text-text-2 hover:text-text-1 hover:bg-bg-muted rounded-lg cursor-pointer transition-all duration-200"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-line-1 bg-white/95">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="block w-full text-left py-2.5 text-sm font-medium text-text-2 hover:text-text-1 transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => {
                  handleGoogleSignIn();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2 bg-blue-primary hover:bg-blue-primary-hover text-white font-semibold text-sm rounded-lg cursor-pointer transition-colors"
              >
                Start free
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section
        className="snap-section relative min-h-screen pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden flex flex-col justify-center"
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
      >
        {/* Data-flow particle canvas */}
        <DataFlowCanvas />

        {/* Mouse-follow glow — moves with cursor, fades in/out on enter/leave */}
        <div
          ref={heroGlowRef}
          className="pointer-events-none absolute -z-10 w-[640px] h-[640px] rounded-full -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700"
          style={{
            background: 'radial-gradient(circle, rgba(24, 72, 243, 0.11) 0%, rgba(109, 40, 217, 0.06) 40%, transparent 70%)',
            opacity: 0,
            left: '50%',
            top: '40%',
          }}
          aria-hidden
        />

        {/* Gradient mesh backdrop */}
        <div
          className="absolute inset-0 -z-10 opacity-70"
          aria-hidden
          style={{
            background: `
              radial-gradient(ellipse 60% 50% at 20% 0%, rgba(24, 72, 243, 0.18), transparent 60%),
              radial-gradient(ellipse 50% 40% at 80% 10%, rgba(109, 40, 217, 0.10), transparent 55%),
              radial-gradient(ellipse 80% 60% at 50% 100%, rgba(238, 242, 254, 0.6), transparent 70%)
            `,
          }}
        />
        <div
          className="absolute inset-0 -z-10 opacity-40"
          aria-hidden
          style={{
            backgroundImage: 'radial-gradient(circle, #C2D4F9 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 70%)',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1
              className={cn(
                'text-5xl md:text-6xl lg:text-[76px] font-semibold text-text-1 leading-[1.02] tracking-[-0.025em] transition-all duration-600 ease-out',
                heroMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              )}
              style={{ transitionDelay: '0ms' }}
            >
              <span className="gradient-marquee-text">
                ETL + marketing data,
              </span>
              <br />
              in one visual tool.
            </h1>

            <p
              className={cn(
                'mt-6 text-lg md:text-xl text-text-2 leading-relaxed max-w-2xl mx-auto transition-all duration-500 ease-out',
                heroMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              )}
              style={{ transitionDelay: '100ms' }}
            >
              Connect Facebook, Google, and TikTok Ads. OrbitX normalises every metric and delivers
              clean data to your warehouse or dashboard — on schedule, no code required.
            </p>

            <div
              className={cn(
                'mt-8 flex flex-wrap justify-center gap-3 transition-all duration-500 ease-out',
                heroMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              )}
              style={{ transitionDelay: '200ms' }}
            >
              <button
                onClick={handleGoogleSignIn}
                className="group inline-flex items-center gap-2.5 px-6 py-3.5 bg-blue-primary hover:bg-blue-primary-hover text-white font-semibold text-sm rounded-xl transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                <GoogleIcon />
                Start free with Google
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/workflows/builder')}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-bg-card border border-line-2 hover:border-blue-primary text-text-1 hover:text-blue-primary font-medium text-sm rounded-xl transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Watch demo
              </button>
            </div>
          </div>

          {/* Hero product demo — slot in DEMO_VIDEO_SRC at top of file when ready */}
          <div className="relative max-w-6xl mx-auto mt-14 md:mt-20">
            <div className="relative aspect-[16/9] bg-bg-card border border-line-1 rounded-2xl shadow-lg overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-10 flex items-center gap-2 px-4 border-b border-line-1 bg-bg-muted z-10">
                <span className="w-2.5 h-2.5 rounded-full bg-line-2" />
                <span className="w-2.5 h-2.5 rounded-full bg-line-2" />
                <span className="w-2.5 h-2.5 rounded-full bg-line-2" />
                <div className="ml-3 px-3 py-1 bg-bg-card border border-line-1 rounded-md text-[11px] font-mono text-text-3">
                  app.orbitx.io / workflows / unified-marketing
                </div>
              </div>
              <div className="absolute inset-x-0 top-10 bottom-0">
                {DEMO_VIDEO_SRC ? (
                  <HeroVideoPlayer src={DEMO_VIDEO_SRC} poster={DEMO_VIDEO_POSTER ?? undefined} />
                ) : (
                  <WorkflowCanvasMockup />
                )}
              </div>
            </div>
            {/* Soft shadow under hero mockup */}
            <div className="absolute inset-x-10 -bottom-6 h-8 bg-blue-primary/10 blur-2xl rounded-full" aria-hidden />
          </div>
        </div>
      </section>

      {/* Trust strip — standalone small section, no snap */}
      <section className="relative py-12 border-t border-b border-line-1 bg-bg-card overflow-hidden">
        <div
          className="absolute left-0 right-0 top-0 h-px"
          aria-hidden
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(24, 72, 243, 0.3) 50%, transparent 100%)' }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-bg-muted rounded-full">
              <Shield className="w-3 h-3 text-text-3" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-3">
                Trusted by teams across SEA
              </span>
            </div>
            <div className="logo-marquee-mask w-full overflow-hidden">
              <div className="animate-logo-marquee flex items-center" style={{ width: 'max-content' }}>
                {[...customerLogos, ...customerLogos].map((logo, idx) => (
                  <span
                    key={`${logo.name}-${idx}`}
                    className={cn('mx-8 md:mx-10 text-lg md:text-xl text-text-3 hover:text-blue-primary transition-colors cursor-default whitespace-nowrap', logo.style)}
                  >
                    {logo.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="w-full border-t border-line-soft pt-5 overflow-hidden">
              <div className="animate-logo-marquee flex items-center gap-8" style={{ width: 'max-content', animationDuration: '38s' }}>
                {[...activityFeed, ...activityFeed].map((item, idx) => (
                  <span key={idx} className="flex items-center gap-2 whitespace-nowrap text-[11px] font-mono text-text-3">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.dot }} />
                    {item.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS + PIPELINE — one snap section */}
      <section id="pipeline" className="snap-section relative overflow-hidden min-h-screen py-20 md:py-28 bg-bg-card border-y border-line-1 flex flex-col justify-center">
        <div className="pointer-events-none absolute top-0 right-0 w-[600px] h-[500px]" aria-hidden
          style={{ background: 'radial-gradient(ellipse at 100% 0%, rgba(109,40,217,0.08) 0%, transparent 65%)' }} />
        <div className="pointer-events-none absolute bottom-0 left-0 w-[700px] h-[400px]" aria-hidden
          style={{ background: 'radial-gradient(ellipse at 0% 100%, rgba(24,72,243,0.07) 0%, transparent 65%)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative w-full">

          {/* How it works — 3 steps */}
          <AnimateIn>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="flex justify-center mb-5">
                <div className="w-12 h-1.5 rounded-full" style={{ background: 'linear-gradient(90deg, #1848F3 0%, #6D28D9 100%)' }} />
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold text-text-1 tracking-tight mb-3">
                Up and running in minutes
              </h2>
              <p className="text-base text-text-2">No SQL. No Python. No data engineer on speed dial.</p>
            </div>
          </AnimateIn>

          <div className="grid md:grid-cols-3 gap-4 md:gap-5 relative mb-12">
            <div className="hidden md:block absolute top-9 left-[calc(33.33%+12px)] right-[calc(33.33%+12px)] h-px bg-line-1" aria-hidden />
            {[
              { step: '01', icon: <Workflow className="w-5 h-5" />, title: 'Connect your ad accounts', description: 'Link Facebook, Google, and TikTok Ads with one-click OAuth — no API keys, no dev work required.', note: 'Facebook · Google · TikTok' },
              { step: '02', icon: <Layers className="w-5 h-5" />, title: 'Build your pipeline visually', description: 'Drag sources, transforms, and destinations onto the canvas. OrbitX normalises every metric name automatically.', note: '8 built-in transforms · 0 lines of code' },
              { step: '03', icon: <BarChart3 className="w-5 h-5" />, title: 'Your clean data lands on schedule', description: 'Unified, reconciled data pushes to BigQuery, Sheets, or MySQL — on time, every time, with alerts if anything breaks.', note: 'BigQuery · Sheets · MySQL' },
            ].map(({ step, icon, title, description, note }, idx) => (
              <AnimateIn key={step} delay={idx * 100}>
                <div className="h-full relative flex flex-col gap-3 p-5 bg-bg-page rounded-2xl border border-line-1">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-soft border border-blue-border flex items-center justify-center text-blue-primary flex-shrink-0">{icon}</div>
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-text-3 font-mono">Step {step}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-1 mb-1.5">{title}</h3>
                    <p className="text-xs text-text-2 leading-relaxed">{description}</p>
                  </div>
                  <div className="mt-auto pt-3 border-t border-line-1">
                    <span className="text-[11px] font-mono text-text-3">{note}</span>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>

          <div className="border-t border-line-1 mb-10" />

          {/* Pipeline board */}
          <AnimateIn>
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="text-2xl md:text-3xl font-semibold text-text-1 tracking-tight mb-2">
                See your entire data flow at a glance.
              </h2>
              <p className="text-sm text-text-2">
                Sources on the left, transforms in the middle, destinations on the right.
              </p>
            </div>
          </AnimateIn>
          <AnimateIn delay={100}>
            <PipelineBoard />
          </AnimateIn>
        </div>
      </section>

      {/* placeholder — previously standalone pipeline section kept for integrations below */}
      <section id="pipeline-integrations" className="hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimateIn>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="flex justify-center mb-5">
                <div
                  className="w-12 h-1.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #1848F3 0%, #6D28D9 100%)' }}
                />
              </div>
              <h2 className="text-3xl md:text-5xl font-semibold text-text-1 tracking-tight mb-4">
                See your entire data flow
                <br />
                at a glance.
              </h2>
              <p className="text-lg text-text-2">
                Sources on the left, transforms in the middle, destinations on the right.
                Build once, run on a schedule — no tab-hopping, no spreadsheet wrangling.
              </p>
            </div>
          </AnimateIn>

          <AnimateIn delay={100}>
            <PipelineBoard />
          </AnimateIn>

        </div>
      </section>

      {/* FEATURES — alternating rows */}
      <section id="features" className="snap-section relative overflow-hidden min-h-screen py-20 md:py-28 bg-bg-card border-y border-line-1 flex flex-col justify-center">
        <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 left-0 w-[500px] h-[500px]" aria-hidden
          style={{ background: 'radial-gradient(ellipse at 0% 50%, rgba(24,72,243,0.07) 0%, transparent 65%)' }} />
        <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 right-0 w-[400px] h-[400px]" aria-hidden
          style={{ background: 'radial-gradient(ellipse at 100% 50%, rgba(109,40,217,0.06) 0%, transparent 65%)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimateIn>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="flex justify-center mb-5">
                <div
                  className="w-12 h-1.5 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #1848F3 0%, #6D28D9 100%)',
                  }}
                />
              </div>
              <h2 className="text-3xl md:text-5xl font-semibold text-text-1 tracking-tight mb-4">
                Stop firefighting.<br />Start delivering.
              </h2>
              <p className="text-lg text-text-2">
                Every feature is built around one goal: your team spends time on strategy, not on fixing broken data.
              </p>
            </div>
          </AnimateIn>

          <div className="space-y-16">
            <AnimateIn>
              <FeatureRow
                tag="Run history"
                title="Know what broke — before the client notices."
                description="Every pipeline run is logged with duration, row counts, and per-node status. When something fails, you get the full log — not just a red icon."
                bullets={[
                  'Per-node execution status with full logs',
                  'Row counts tracked per run so data gaps are obvious',
                  'Retry any past run with one click',
                ]}
                visual={<RunHistoryVisual />}
              />
            </AnimateIn>
            <AnimateIn>
              <FeatureRow
                tag="Unified schema"
                title="Stop renaming columns every Monday."
                description="facebook.spend, google.cost_micros, tiktok.spend — OrbitX maps them all to campaign.spend automatically, so your reports work the same across every platform."
                bullets={[
                  'Spend, impressions, clicks, conversions unified automatically',
                  'Works across Facebook, Google, and TikTok out of the box',
                  'Consistent field names in every destination',
                ]}
                visual={<SchemaMapperVisual />}
                reverse
              />
            </AnimateIn>
            <AnimateIn>
              <FeatureRow
                tag="Alerts"
                title="Get notified before your client does."
                description="Slack alerts fire the moment a run fails or an anomaly is detected — so you're first to know, with context, not last to find out from a client message."
                bullets={[
                  'Slack notifications on run failure with error details',
                  'Anomaly detection flags sudden drops or spikes',
                  'Per-workflow notification channels',
                ]}
                visual={<AlertsVisual />}
              />
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* STORIES — stubbed per no-mocks rule */}
      <section id="stories" className="relative overflow-hidden py-24 md:py-32">
        <div className="pointer-events-none absolute top-0 left-0 w-[550px] h-[550px]" aria-hidden
          style={{ background: 'radial-gradient(ellipse at 0% 0%, rgba(109,40,217,0.07) 0%, transparent 65%)' }} />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[450px] h-[350px]" aria-hidden
          style={{ background: 'radial-gradient(ellipse at 100% 100%, rgba(24,72,243,0.06) 0%, transparent 65%)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimateIn>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="flex justify-center mb-5">
                <div
                  className="w-12 h-1.5 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #1848F3 0%, #6D28D9 100%)',
                  }}
                />
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold text-text-1 tracking-tight mb-4">
                Built with early-access teams
              </h2>
              <p className="text-lg text-text-2">
                We're in Public Beta. Customer stories land here as design partners go live — want to be one?
              </p>
            </div>
          </AnimateIn>

          {/* Founder quote — full-width prominent block */}
          <AnimateIn delay={80}>
          <div className="mb-12 rounded-2xl border border-line-1 bg-bg-card overflow-hidden">
            <div
              className="h-1 w-full"
              style={{ background: 'linear-gradient(90deg, #1848F3 0%, #6D28D9 100%)' }}
              aria-hidden
            />
            <div className="px-8 py-10 md:px-12 md:py-12 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-start">
              <div className="md:col-span-3 lg:col-span-2 flex flex-col gap-1">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-text-1">
                  Natthapon S.
                </div>
                <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-text-3">
                  CEO &amp; Founder
                </div>
                <div className="w-8 h-px bg-blue-primary mt-3" />
              </div>
              <div className="md:col-span-9 lg:col-span-10">
                <blockquote className="text-base md:text-lg lg:text-xl font-normal italic text-text-2 leading-[1.65] tracking-[-0.003em]">
                  &ldquo;I&apos;ve watched agencies waste weeks every quarter rebuilding the same ad-data pipeline for every new client — late nights wrangling spreadsheets, broken Monday dashboards, one bottlenecked engineer everyone is waiting on. We&apos;re building the data engineer every agency wishes they could hire. Drag, connect, ship — that&apos;s the whole pitch.&rdquo;
                </blockquote>
              </div>
            </div>
          </div>
          </AnimateIn>

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
            ].map((s, idx) => (
              <AnimateIn key={s.label} delay={idx * 100}>
              <div className="h-full p-6 bg-bg-card border border-line-1 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 bg-blue-soft text-blue-primary text-[10px] font-semibold uppercase tracking-wider rounded">
                    {s.metric}
                  </span>
                  <span className="text-xs text-text-3 font-mono">{s.label}</span>
                </div>
                <p className="text-sm text-text-2 leading-relaxed">{s.description}</p>
              </div>
              </AnimateIn>
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
      <section id="pricing" className="relative overflow-hidden py-24 md:py-32 bg-bg-card border-y border-line-1">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px]" aria-hidden
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(24,72,243,0.09) 0%, transparent 65%)' }} />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[500px] h-[350px]" aria-hidden
          style={{ background: 'radial-gradient(ellipse at 100% 100%, rgba(109,40,217,0.07) 0%, transparent 65%)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimateIn>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="flex justify-center mb-5">
                <div
                  className="w-12 h-1.5 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #1848F3 0%, #6D28D9 100%)',
                  }}
                />
              </div>
              <h2 className="text-3xl md:text-5xl font-semibold text-text-1 tracking-tight mb-4">
                Simple pricing, no surprises
              </h2>
              <p className="text-lg text-text-2">
                Start free. Upgrade when your team grows. No per-seat fees.
              </p>
            </div>
          </AnimateIn>

          <PricingCarousel onGetStarted={handleGoogleSignIn} />

          <div className="mt-10 text-center text-xs text-text-3">
            All plans include TLS encryption and encrypted OAuth token storage.
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative overflow-hidden py-24 md:py-32">
        <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 right-0 w-[500px] h-[500px]" aria-hidden
          style={{ background: 'radial-gradient(ellipse at 100% 50%, rgba(24,72,243,0.06) 0%, transparent 65%)' }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimateIn>
            <div className="text-center mb-12">
              <div className="flex justify-center mb-5">
                <div
                  className="w-12 h-1.5 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #1848F3 0%, #6D28D9 100%)',
                  }}
                />
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold text-text-1 tracking-tight mb-3">
                Frequently asked
              </h2>
              <p className="text-lg text-text-2">Answers to the questions we hear most often.</p>
            </div>
          </AnimateIn>

          <AnimateIn delay={80}>
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
          </AnimateIn>
        </div>
      </section>

      {/* Footer — dark gradient carries the CTA color removed above */}
      <footer
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0B1A5E 0%, #1848F3 55%, #6D28D9 100%)' }}
      >
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
          aria-hidden
        />
        {/* Glow orbs */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: '#1848F3' }} aria-hidden />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: '#6D28D9' }} aria-hidden />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 flex items-center justify-center rounded-md" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <span className="text-white font-semibold text-xs">O</span>
                </div>
                <span className="text-base font-semibold text-white tracking-tight">OrbitX</span>
              </Link>
              <p className="text-sm text-white/60 max-w-xs leading-relaxed">
                ETL + marketing data, in one visual tool. Built for teams that move data without hiring engineers.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#pipeline" className="text-white/70 hover:text-white transition-colors">Pipeline</a></li>
                <li><a href="#integrations" className="text-white/70 hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#features" className="text-white/70 hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-white/70 hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">Resources</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#" className="text-white/70 hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="text-white/70 hover:text-white transition-colors">API reference</a></li>
                <li><a href="#" className="text-white/70 hover:text-white transition-colors">Changelog</a></li>
                <li><a href="#" className="text-white/70 hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#" className="text-white/70 hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="text-white/70 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-white/70 hover:text-white transition-colors">Contact</a></li>
                <li><a href="#faq" className="text-white/70 hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/40">
              &copy; {new Date().getFullYear()} OrbitX. All rights reserved.
            </p>
            <div className="flex items-center gap-5 text-sm">
              <span className="inline-flex items-center gap-1.5 text-white/40">
                <Lock className="w-3.5 h-3.5" /> TLS + encrypted tokens
              </span>
              <span className="inline-flex items-center gap-1.5 text-white/40">
                <Shield className="w-3.5 h-3.5" /> Public Beta
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
