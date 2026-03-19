import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Zap,
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
  Moon,
  Sun,
  Menu,
  X
} from 'lucide-react';
import { FacebookIcon } from '@/components/icons/BrandIcons';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store/themeStore';

// Google Icon Component
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// Intersection Observer Hook
const useInView = (options = {}) => {
  const ref = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.1, ...options });

    const element = ref.current;
    if (element) observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);

  return [ref, isInView] as const;
};

// Animated Counter
const AnimatedCounter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const [ref, inView] = useInView();

  useEffect(() => {
    if (!inView) return;

    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [inView, value]);

  return <span ref={ref as any}>{count.toLocaleString()}{suffix}</span>;
};

// Feature Card - Blueprint style
const FeatureCard = ({
  icon: Icon,
  title,
  description,
  delay
}: {
  icon: any;
  title: string;
  description: string;
  delay: number;
}) => {
  const [ref, inView] = useInView();

  return (
    <div
      ref={ref as any}
      className={cn(
        "group relative p-8 transition-all duration-700",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{
        transitionDelay: `${delay}ms`,
        backgroundColor: '#1A2744',
        border: '1px solid rgba(0, 212, 255, 0.12)',
        borderRadius: '6px',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 212, 255, 0.3)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.1)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 212, 255, 0.12)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      {/* Cyan accent line */}
      <div style={{ width: '48px', height: '2px', background: 'linear-gradient(to right, #00D4FF, transparent)', marginBottom: '24px' }} />

      <div className="relative">
        <div className="w-12 h-12 flex items-center justify-center mb-6 transition-colors" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }}>
          <Icon className="w-6 h-6" style={{ color: '#00D4FF' }} />
        </div>

        <h3 className="text-xl font-bold mb-3 uppercase tracking-wider transition-colors" style={{ color: '#E8ECF4' }}>
          {title}
        </h3>

        <p style={{ color: '#8896AD' }} className="leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};

// Flow node icon
const FlowNode = ({ icon: Icon, color, label, isCustomIcon }: { icon: any; color: string; label: string; isCustomIcon?: boolean }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className="w-11 h-11 flex items-center justify-center"
      style={{
        backgroundColor: color,
        borderRadius: '4px',
      }}
    >
      {isCustomIcon ? <Icon size={20} className="text-white" /> : <Icon className="w-5 h-5 text-white" />}
    </div>
    <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#8896AD' }}>{label}</span>
  </div>
);

// Main flow animation - Sources -> OrbitX -> Destinations
const OrbitAnimation = () => {
  const sources = [
    { icon: FacebookIcon, color: '#1877F2', label: 'Facebook', isCustomIcon: true },
    { icon: Search, color: '#4285F4', label: 'Google' },
    { icon: Database, color: '#FF6B35', label: 'S3' },
  ];

  const destinations = [
    { icon: Database, color: '#00E5A0', label: 'BigQuery' },
    { icon: Table, color: '#00D4FF', label: 'Sheets' },
    { icon: Server, color: '#FFB800', label: 'MySQL' },
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center py-4">
      {/* Main container with fixed positions */}
      <div className="relative" style={{ width: '480px', height: '200px' }}>

        {/* Sources - Left side, vertically stacked */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-center" style={{ color: '#8896AD' }}>
            Sources
          </span>
          {sources.map((source, i) => (
            <FlowNode key={i} {...source} />
          ))}
        </div>

        {/* Destinations - Right side, vertically stacked */}
        <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-center" style={{ color: '#8896AD' }}>
            Destinations
          </span>
          {destinations.map((dest, i) => (
            <FlowNode key={i} {...dest} />
          ))}
        </div>

        {/* SVG for flow lines - positioned between nodes */}
        <svg
          className="absolute"
          style={{ left: '70px', top: '0', width: '340px', height: '200px' }}
          viewBox="0 0 340 200"
        >
          <defs>
            {/* Gradients for incoming lines */}
            {sources.map((s, i) => (
              <linearGradient key={`in-grad-${i}`} id={`in-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.6" />
                <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.8" />
              </linearGradient>
            ))}
            {/* Gradients for outgoing lines */}
            {destinations.map((d, i) => (
              <linearGradient key={`out-grad-${i}`} id={`out-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.8" />
                <stop offset="100%" stopColor={d.color} stopOpacity="0.6" />
              </linearGradient>
            ))}
          </defs>

          {/* Incoming lines: Sources -> Center */}
          <path d="M 0 45 Q 85 45 170 100" stroke="url(#in-grad-0)" strokeWidth="2" fill="none" />
          <path d="M 0 100 Q 85 90 170 100" stroke="url(#in-grad-1)" strokeWidth="2" fill="none" />
          <path d="M 0 155 Q 85 155 170 100" stroke="url(#in-grad-2)" strokeWidth="2" fill="none" />

          {/* Outgoing lines: Center -> Destinations */}
          <path d="M 170 100 Q 255 45 340 45" stroke="url(#out-grad-0)" strokeWidth="2" fill="none" />
          <path d="M 170 100 Q 255 110 340 100" stroke="url(#out-grad-1)" strokeWidth="2" fill="none" />
          <path d="M 170 100 Q 255 155 340 155" stroke="url(#out-grad-2)" strokeWidth="2" fill="none" />

          {/* Animated dots - incoming */}
          {sources.map((s, i) => {
            const paths = [
              "M 0 45 Q 85 45 170 100",
              "M 0 100 Q 85 90 170 100",
              "M 0 155 Q 85 155 170 100"
            ];
            return (
              <circle key={`in-${i}`} r="4" fill={s.color}>
                <animateMotion dur="2.5s" repeatCount="indefinite" begin={`${i * 0.4}s`} path={paths[i]} />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.5s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
              </circle>
            );
          })}

          {/* Animated dots - outgoing */}
          {destinations.map((d, i) => {
            const paths = [
              "M 170 100 Q 255 45 340 45",
              "M 170 100 Q 255 110 340 100",
              "M 170 100 Q 255 155 340 155"
            ];
            return (
              <circle key={`out-${i}`} r="4" fill="#00D4FF">
                <animateMotion dur="2.5s" repeatCount="indefinite" begin={`${i * 0.4 + 1.25}s`} path={paths[i]} />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.5s" repeatCount="indefinite" begin={`${i * 0.4 + 1.25}s`} />
              </circle>
            );
          })}
        </svg>

        {/* Center: OrbitX Transform */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8896AD' }}>
              Transform
            </span>
            <div className="relative">
              {/* Core - Blueprint style */}
              <div className="relative w-12 h-12 flex items-center justify-center" style={{ border: '2px solid #00D4FF', borderRadius: '4px', backgroundColor: 'rgba(0, 212, 255, 0.1)', boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)' }}>
                <Zap className="w-6 h-6" style={{ color: '#00D4FF' }} />
              </div>
            </div>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#00D4FF' }}>OrbitX</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pricing Card
const PricingCard = ({
  name,
  price,
  description,
  features,
  popular,
  delay,
  onGetStarted
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
  delay: number;
  onGetStarted?: () => void;
}) => {
  const [ref, inView] = useInView();

  return (
    <div
      ref={ref as any}
      className={cn(
        "relative p-8 transition-all duration-700",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{
        transitionDelay: `${delay}ms`,
        backgroundColor: '#1A2744',
        border: popular ? '2px solid #00D4FF' : '1px solid rgba(0, 212, 255, 0.12)',
        borderRadius: '6px',
        boxShadow: popular ? '0 0 30px rgba(0, 212, 255, 0.15)' : 'none',
      }}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-bold uppercase tracking-widest" style={{ backgroundColor: '#00D4FF', color: '#0F1729', borderRadius: '4px' }}>
          Most Popular
        </div>
      )}

      <div className="text-center mb-8">
        <h3 className="text-xl font-bold mb-2 uppercase tracking-wider" style={{ color: '#E8ECF4' }}>{name}</h3>
        <div className="text-4xl font-bold font-mono mb-2" style={{ color: '#00D4FF' }}>
          {price}
        </div>
        <p className="text-sm" style={{ color: '#8896AD' }}>{description}</p>
      </div>

      <ul className="space-y-4 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#00E5A0' }} />
            <span style={{ color: '#8896AD' }}>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onGetStarted}
        className="w-full py-3 font-semibold transition-all uppercase tracking-wider"
        style={{
          backgroundColor: popular ? '#00D4FF' : 'transparent',
          color: popular ? '#0F1729' : '#00D4FF',
          border: popular ? 'none' : '1px solid rgba(0, 212, 255, 0.3)',
          borderRadius: '4px',
        }}
      >
        Get Started
      </button>
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useThemeStore();
  const [heroRef, heroInView] = useInView();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGoogleSignIn = () => {
    navigate('/login');
  };

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#pricing', label: 'Pricing' },
    { href: '/dashboard', label: 'Dashboard', isRoute: true },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F1729' }}>
      {/* Navigation - Blueprint top bar */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: '#0F1729', borderBottom: '1px solid rgba(0, 212, 255, 0.15)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 flex items-center justify-center" style={{ border: '2px solid #00D4FF', borderRadius: '4px' }}>
                <span className="font-bold text-lg" style={{ color: '#00D4FF' }}>O</span>
              </div>
              <span className="text-xl font-bold uppercase tracking-widest" style={{ color: '#E8ECF4' }}>
                OrbitX
              </span>
            </Link>

            {/* Nav Links - Desktop */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                link.isRoute ? (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="transition-colors font-medium uppercase tracking-wider text-sm"
                    style={{ color: '#8896AD' }}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    className="transition-colors font-medium uppercase tracking-wider text-sm"
                    style={{ color: '#8896AD' }}
                  >
                    {link.label}
                  </a>
                )
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 transition-all"
                style={{ borderRadius: '4px', color: '#00D4FF' }}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Sign In Button - Desktop */}
              <button
                onClick={handleGoogleSignIn}
                className="hidden sm:flex items-center gap-2 px-4 py-2 font-medium transition-all uppercase tracking-wider text-sm"
                style={{ backgroundColor: '#00D4FF', color: '#0F1729', borderRadius: '4px' }}
              >
                <GoogleIcon />
                Sign in
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 transition-all"
                style={{ borderRadius: '4px', color: '#8896AD' }}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div style={{ backgroundColor: '#0F1729', borderTop: '1px solid rgba(0, 212, 255, 0.1)' }}>
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                link.isRoute ? (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="block py-2 transition-colors font-medium uppercase tracking-wider"
                    style={{ color: '#8896AD' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    className="block py-2 transition-colors font-medium uppercase tracking-wider"
                    style={{ color: '#8896AD' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                )
              ))}
              <button
                onClick={() => {
                  handleGoogleSignIn();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 font-medium uppercase tracking-wider"
                style={{ backgroundColor: '#00D4FF', color: '#0F1729', borderRadius: '4px' }}
              >
                <GoogleIcon />
                Sign in with Google
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section
        ref={heroRef as any}
        className="relative min-h-screen flex items-center pt-16"
        style={{ backgroundColor: '#0F1729' }}
      >
        {/* Large grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0, 212, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Geometric decorations - blueprint style */}
        <div className="absolute top-32 right-16 w-32 h-32 rounded-full hidden lg:block" style={{ border: '2px solid rgba(0, 212, 255, 0.15)' }} />
        <div className="absolute bottom-24 left-24 w-24 h-[2px] hidden lg:block" style={{ background: 'linear-gradient(to right, #FFB800, transparent)' }} />
        <div className="absolute top-1/2 right-1/3 w-12 h-12 hidden lg:block" style={{ border: '1px solid rgba(255, 77, 106, 0.2)', transform: 'rotate(45deg)' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Hero Content */}
            <div className={cn(
              "space-y-8 transition-all duration-1000",
              heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            )}>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '4px' }}>
                <Sparkles className="w-4 h-4" style={{ color: '#FFB800' }} />
                <span className="text-sm font-medium uppercase tracking-wider" style={{ color: '#FFB800' }}>
                  Now in Public Beta
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] uppercase tracking-wider" style={{ color: '#E8ECF4' }}>
                Data pipelines,{' '}
                <span style={{ background: 'linear-gradient(135deg, #00D4FF, #00E5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  simplified.
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl max-w-lg leading-relaxed" style={{ color: '#8896AD' }}>
                Build, automate, and monitor your data workflows with a beautiful visual interface. No code required.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleGoogleSignIn}
                  className="flex items-center gap-3 px-6 py-4 font-semibold transition-all group uppercase tracking-wider"
                  style={{ background: 'linear-gradient(135deg, #00D4FF, #00B4D8)', color: '#0F1729', borderRadius: '4px' }}
                >
                  <GoogleIcon />
                  Continue with Google
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => navigate('/workflows/builder')}
                  className="flex items-center gap-2 px-6 py-4 font-semibold group uppercase tracking-wider"
                  style={{ color: '#E8ECF4', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '4px', backgroundColor: 'transparent' }}
                >
                  <Play className="w-5 h-5" />
                  Try Demo
                </button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: ['#00D4FF', '#FFB800', '#00E5A0', '#FF4D6A'][i],
                        borderRadius: '4px',
                        border: '2px solid #0F1729',
                        color: '#0F1729',
                        marginLeft: i > 0 ? '-8px' : '0',
                        position: 'relative',
                        zIndex: 4 - i,
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-sm">
                  <span className="font-semibold font-mono" style={{ color: '#E8ECF4' }}>500+</span>
                  <span style={{ color: '#8896AD' }}> teams already building</span>
                </div>
              </div>
            </div>

            {/* Hero Visual - Orbit Animation */}
            <div className={cn(
              "relative hidden lg:block transition-all duration-1000 delay-300",
              heroInView ? "opacity-100 scale-100" : "opacity-0 scale-90"
            )}>
              <div className="relative w-[500px] h-[500px]">
                {/* Orbit Animation */}
                <OrbitAnimation />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20" style={{ backgroundColor: '#1A2744', borderTop: '1px solid rgba(0, 212, 255, 0.15)', borderBottom: '1px solid rgba(0, 212, 255, 0.15)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold font-mono mb-2" style={{ color: '#00D4FF' }}>
                <AnimatedCounter value={10} suffix="M+" />
              </div>
              <p className="uppercase tracking-wider text-[11px]" style={{ color: '#8896AD' }}>Events processed</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold font-mono mb-2" style={{ color: '#00D4FF' }}>
                <AnimatedCounter value={99} suffix="%" />
              </div>
              <p className="uppercase tracking-wider text-[11px]" style={{ color: '#8896AD' }}>Uptime SLA</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold font-mono mb-2" style={{ color: '#00D4FF' }}>
                <AnimatedCounter value={50} suffix="+" />
              </div>
              <p className="uppercase tracking-wider text-[11px]" style={{ color: '#8896AD' }}>Integrations</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold font-mono mb-2" style={{ color: '#00D4FF' }}>
                <AnimatedCounter value={500} suffix="+" />
              </div>
              <p className="uppercase tracking-wider text-[11px]" style={{ color: '#8896AD' }}>Active teams</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32" style={{ backgroundColor: '#0F1729' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="flex justify-center mb-6">
              <div style={{ width: '48px', height: '2px', background: 'linear-gradient(to right, #00D4FF, transparent)' }} />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 uppercase tracking-wider" style={{ color: '#E8ECF4' }}>
              Everything you need to{' '}
              <span style={{ color: '#00D4FF' }}>automate</span>
            </h2>
            <p className="text-xl" style={{ color: '#8896AD' }}>
              From data extraction to transformation and loading, OrbitX handles your entire pipeline.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Database}
              title="50+ Connectors"
              description="Connect to popular platforms like Facebook Ads, Google Ads, databases, and more."
              delay={0}
            />
            <FeatureCard
              icon={GitBranch}
              title="Visual Builder"
              description="Drag and drop nodes to create complex workflows without writing code."
              delay={100}
            />
            <FeatureCard
              icon={BarChart3}
              title="Real-time Monitoring"
              description="Track execution status, view logs, and get instant alerts on failures."
              delay={200}
            />
            <FeatureCard
              icon={Clock}
              title="Smart Scheduling"
              description="Run workflows on schedules or trigger them via webhooks and events."
              delay={300}
            />
            <FeatureCard
              icon={Shield}
              title="Enterprise Security"
              description="SOC2 compliant with end-to-end encryption and role-based access."
              delay={400}
            />
            <FeatureCard
              icon={Sparkles}
              title="AI-Powered"
              description="Get intelligent suggestions and auto-fix common pipeline issues."
              delay={500}
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-32" style={{ backgroundColor: '#1A2744' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="flex justify-center mb-6">
              <div style={{ width: '48px', height: '2px', background: 'linear-gradient(to right, #00D4FF, transparent)' }} />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 uppercase tracking-wider" style={{ color: '#E8ECF4' }}>
              Simple, transparent pricing
            </h2>
            <p className="text-xl" style={{ color: '#8896AD' }}>
              Start free, scale as you grow. No hidden fees.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Starter"
              price="Free"
              description="Perfect for side projects"
              features={[
                "3 active workflows",
                "1,000 events/month",
                "5 connectors",
                "Community support",
              ]}
              delay={0}
              onGetStarted={handleGoogleSignIn}
            />
            <PricingCard
              name="Pro"
              price="$49/mo"
              description="For growing teams"
              features={[
                "Unlimited workflows",
                "100,000 events/month",
                "All connectors",
                "Priority support",
                "Team collaboration",
              ]}
              popular
              delay={100}
              onGetStarted={handleGoogleSignIn}
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              description="For large organizations"
              features={[
                "Unlimited everything",
                "Dedicated support",
                "Custom integrations",
                "SLA guarantee",
                "On-premise option",
              ]}
              delay={200}
              onGetStarted={handleGoogleSignIn}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32" style={{ backgroundColor: '#0F1729' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Geometric decoration */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ border: '2px solid #00D4FF' }} />
              <div className="w-4 h-4" style={{ border: '2px solid #FFB800' }} />
              <div className="w-4 h-4" style={{ border: '2px solid #FF4D6A', transform: 'rotate(45deg)' }} />
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 uppercase tracking-wider" style={{ color: '#E8ECF4' }}>
            Ready to get started?
          </h2>
          <p className="text-xl mb-10" style={{ color: '#8896AD' }}>
            Join hundreds of teams automating their data pipelines with OrbitX.
          </p>

          <button
            onClick={handleGoogleSignIn}
            className="inline-flex items-center gap-3 px-8 py-5 font-semibold text-lg transition-all group uppercase tracking-wider"
            style={{ background: 'linear-gradient(135deg, #00D4FF, #00B4D8)', color: '#0F1729', borderRadius: '4px' }}
          >
            <GoogleIcon />
            Sign up with Google
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12" style={{ backgroundColor: '#0F1729', borderTop: '1px solid rgba(0, 212, 255, 0.1)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link to="/" className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 flex items-center justify-center" style={{ border: '2px solid #00D4FF', borderRadius: '4px' }}>
                  <span className="font-bold text-sm" style={{ color: '#00D4FF' }}>O</span>
                </div>
                <span className="text-lg font-bold uppercase tracking-widest" style={{ color: '#E8ECF4' }}>
                  OrbitX
                </span>
              </Link>
              <p className="text-sm" style={{ color: '#506080' }}>
                The modern data automation platform for teams of all sizes.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4 uppercase tracking-wider text-[11px]" style={{ color: '#8896AD' }}>Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="transition-colors hover:text-[#00D4FF]" style={{ color: '#506080' }}>Features</a></li>
                <li><a href="#pricing" className="transition-colors hover:text-[#00D4FF]" style={{ color: '#506080' }}>Pricing</a></li>
                <li><Link to="/dashboard" className="transition-colors hover:text-[#00D4FF]" style={{ color: '#506080' }}>Dashboard</Link></li>
                <li><Link to="/workflows" className="transition-colors hover:text-[#00D4FF]" style={{ color: '#506080' }}>Workflows</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-4 uppercase tracking-wider text-[11px]" style={{ color: '#8896AD' }}>Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="transition-colors hover:text-[#00D4FF]" style={{ color: '#506080' }}>Documentation</a></li>
                <li><a href="#" className="transition-colors hover:text-[#00D4FF]" style={{ color: '#506080' }}>API Reference</a></li>
                <li><a href="#" className="transition-colors hover:text-[#00D4FF]" style={{ color: '#506080' }}>Changelog</a></li>
                <li><a href="#" className="transition-colors hover:text-[#00D4FF]" style={{ color: '#506080' }}>Status</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4 uppercase tracking-wider text-[11px]" style={{ color: '#8896AD' }}>Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="transition-colors hover:text-[#00D4FF]" style={{ color: '#506080' }}>About</a></li>
                <li><a href="#" className="transition-colors hover:text-[#00D4FF]" style={{ color: '#506080' }}>Blog</a></li>
                <li><a href="#" className="transition-colors hover:text-[#00D4FF]" style={{ color: '#506080' }}>Careers</a></li>
                <li><a href="#" className="transition-colors hover:text-[#00D4FF]" style={{ color: '#506080' }}>Contact</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(0, 212, 255, 0.08)' }}>
            <p className="text-sm" style={{ color: '#506080' }}>
              &copy; {new Date().getFullYear()} OrbitX. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="transition-colors hover:text-[#00D4FF]" style={{ color: '#506080' }}>Privacy Policy</a>
              <a href="#" className="transition-colors hover:text-[#00D4FF]" style={{ color: '#506080' }}>Terms of Service</a>
              <a href="#" className="transition-colors hover:text-[#00D4FF]" style={{ color: '#506080' }}>Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
