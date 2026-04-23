import { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Check,
  Sparkles,
  Zap,
  Database,
  Search,
  Table,
  CircleCheck,
} from 'lucide-react';
import { FacebookIcon } from '@/components/icons/BrandIcons';
import { useAuthStore } from '@/store/authStore';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Miniature product mockup matching the landing hero style
const LoginMockup = () => (
  <div className="relative w-full h-full">
    {/* dot-grid backdrop */}
    <div
      className="absolute inset-0 opacity-60"
      style={{
        backgroundImage: 'radial-gradient(circle, #D3DAE6 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    />

    <div className="relative h-full w-full px-6 py-6">
      {/* Facebook source */}
      <div className="absolute left-[4%] top-[20%] w-[160px] bg-bg-card border border-line-1 rounded-lg shadow-md">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-line-1">
          <div className="w-6 h-6 flex items-center justify-center rounded-md" style={{ backgroundColor: '#1877F2' }}>
            <FacebookIcon size={12} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-text-1 truncate">Facebook Ads</div>
            <div className="text-[9px] text-text-3">Source</div>
          </div>
        </div>
        <div className="px-3 py-1.5 flex items-center justify-between">
          <span className="text-[9px] text-text-3 font-mono">12 campaigns</span>
          <span className="inline-flex items-center gap-1 text-[9px] text-success font-medium">
            <span className="w-1 h-1 rounded-full bg-success" /> Live
          </span>
        </div>
      </div>

      {/* Google source */}
      <div className="absolute left-[4%] top-[58%] w-[160px] bg-bg-card border border-line-1 rounded-lg shadow-md">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-line-1">
          <div className="w-6 h-6 flex items-center justify-center rounded-md bg-bg-muted">
            <Search className="w-3 h-3 text-text-1" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-text-1 truncate">Google Ads</div>
            <div className="text-[9px] text-text-3">Source</div>
          </div>
        </div>
        <div className="px-3 py-1.5 flex items-center justify-between">
          <span className="text-[9px] text-text-3 font-mono">8 campaigns</span>
          <span className="inline-flex items-center gap-1 text-[9px] text-success font-medium">
            <span className="w-1 h-1 rounded-full bg-success" /> Live
          </span>
        </div>
      </div>

      {/* Transform */}
      <div className="absolute left-1/2 top-[36%] -translate-x-1/2 w-[170px] bg-bg-card border-2 border-blue-primary rounded-lg shadow-lg">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-border bg-blue-soft">
          <div className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-primary">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-text-1 truncate">Unify Schema</div>
            <div className="text-[9px] text-blue-primary font-medium">Transform</div>
          </div>
        </div>
        <div className="px-3 py-1.5 space-y-0.5">
          <div className="flex items-center gap-1 text-[9px] text-text-2">
            <Check className="w-2 h-2 text-success" /> Normalize IDs
          </div>
          <div className="flex items-center gap-1 text-[9px] text-text-2">
            <Check className="w-2 h-2 text-success" /> Convert to USD
          </div>
        </div>
      </div>

      {/* BigQuery destination */}
      <div className="absolute right-[4%] top-[20%] w-[160px] bg-bg-card border border-line-1 rounded-lg shadow-md">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-line-1">
          <div className="w-6 h-6 flex items-center justify-center rounded-md" style={{ backgroundColor: '#4285F4' }}>
            <Database className="w-3 h-3 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-text-1 truncate">BigQuery</div>
            <div className="text-[9px] text-text-3">Destination</div>
          </div>
        </div>
        <div className="px-3 py-1.5 flex items-center justify-between">
          <span className="text-[9px] text-text-3 font-mono">2.4M rows</span>
          <span className="inline-flex items-center gap-1 text-[9px] text-success font-medium">
            <CircleCheck className="w-2.5 h-2.5" /> Synced
          </span>
        </div>
      </div>

      {/* Sheets destination */}
      <div className="absolute right-[4%] top-[58%] w-[160px] bg-bg-card border border-line-1 rounded-lg shadow-md">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-line-1">
          <div className="w-6 h-6 flex items-center justify-center rounded-md" style={{ backgroundColor: '#0F9D58' }}>
            <Table className="w-3 h-3 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-text-1 truncate">Google Sheets</div>
            <div className="text-[9px] text-text-3">Destination</div>
          </div>
        </div>
        <div className="px-3 py-1.5 flex items-center justify-between">
          <span className="text-[9px] text-text-3 font-mono">180K rows</span>
          <span className="inline-flex items-center gap-1 text-[9px] text-success font-medium">
            <CircleCheck className="w-2.5 h-2.5" /> Synced
          </span>
        </div>
      </div>

      {/* Animated connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M 22 25 C 35 25, 38 40, 48 40" stroke="#1848F3" strokeWidth="0.3" fill="none" opacity="0.4" vectorEffect="non-scaling-stroke" />
        <path d="M 22 63 C 35 63, 38 44, 48 44" stroke="#1848F3" strokeWidth="0.3" fill="none" opacity="0.4" vectorEffect="non-scaling-stroke" />
        <path d="M 62 40 C 72 40, 75 25, 82 25" stroke="#1848F3" strokeWidth="0.3" fill="none" opacity="0.4" vectorEffect="non-scaling-stroke" />
        <path d="M 62 44 C 72 44, 75 63, 82 63" stroke="#1848F3" strokeWidth="0.3" fill="none" opacity="0.4" vectorEffect="non-scaling-stroke" />
        <circle r="0.8" fill="#1877F2">
          <animateMotion dur="2.4s" repeatCount="indefinite" path="M 22 25 C 35 25, 38 40, 48 40" />
        </circle>
        <circle r="0.8" fill="#4285F4">
          <animateMotion dur="2.4s" begin="0.6s" repeatCount="indefinite" path="M 22 63 C 35 63, 38 44, 48 44" />
        </circle>
        <circle r="0.8" fill="#1848F3">
          <animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="M 62 40 C 72 40, 75 25, 82 25" />
        </circle>
        <circle r="0.8" fill="#0F9D58">
          <animateMotion dur="2.4s" begin="1.8s" repeatCount="indefinite" path="M 62 44 C 72 44, 75 63, 82 63" />
        </circle>
      </svg>

      {/* Running toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-bg-card border border-line-1 rounded-full shadow-md">
        <span className="inline-flex items-center gap-1.5 text-[10px] text-text-2">
          <span className="pulse-ring w-1.5 h-1.5 rounded-full bg-blue-primary" />
          <span className="font-medium">Running</span>
        </span>
        <span className="w-px h-3 bg-line-1" />
        <span className="text-[10px] text-text-3 font-mono">1,248 rows/sec</span>
      </div>
    </div>
  </div>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { googleAuth, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('Google Client ID not configured');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        });

        window.google.accounts.id.renderButton(document.getElementById('google-signin-button'), {
          theme: 'outline',
          size: 'large',
          width: 360,
          text: 'continue_with',
        });
      }
    };

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handleGoogleCallback = async (response: any) => {
    try {
      await googleAuth(response.credential);
      navigate(from, { replace: true });
    } catch {
      // handled in store
    }
  };

  return (
    <div className="min-h-screen flex bg-bg-page">
      {/* Left — branded product preview */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-bg-card border-r border-line-1">
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to="/" className="flex items-center gap-2.5 w-fit">
            <div className="w-9 h-9 flex items-center justify-center bg-blue-primary rounded-md">
              <span className="text-lg font-semibold text-white">O</span>
            </div>
            <span className="text-lg font-semibold text-text-1 tracking-tight">OrbitX</span>
          </Link>

          {/* Product preview card */}
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 bg-blue-soft border border-blue-border rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-blue-primary" />
              <span className="text-xs font-medium text-blue-primary">Public Beta</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-semibold text-text-1 tracking-tight leading-[1.15] mb-4">
              Marketing data,
              <br />
              <span className="text-blue-primary">unified and automated.</span>
            </h1>

            <p className="text-sm text-text-2 leading-relaxed max-w-md mb-8">
              Sign in to build your first pipeline. Pipe Facebook, Google, and TikTok ad data into your warehouse — no code required.
            </p>

            <div className="relative aspect-[16/10] bg-bg-page border border-line-1 rounded-xl shadow-md overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-7 flex items-center gap-1.5 px-3 border-b border-line-1 bg-bg-muted">
                <span className="w-2 h-2 rounded-full bg-line-2" />
                <span className="w-2 h-2 rounded-full bg-line-2" />
                <span className="w-2 h-2 rounded-full bg-line-2" />
                <span className="ml-2 text-[10px] font-mono text-text-3">workflows / unified-marketing</span>
              </div>
              <div className="absolute inset-x-0 top-7 bottom-0">
                <LoginMockup />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-text-3">
            <span>© {new Date().getFullYear()} OrbitX</span>
            <div className="flex items-center gap-4">
              <Link to="#" className="hover:text-text-1 transition-colors">Privacy</Link>
              <Link to="#" className="hover:text-text-1 transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="w-9 h-9 flex items-center justify-center bg-blue-primary rounded-md">
                <span className="text-lg font-semibold text-white">O</span>
              </div>
              <span className="text-lg font-semibold text-text-1 tracking-tight">OrbitX</span>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="w-10 h-1 bg-blue-primary rounded-full mb-5" />
            <h2 className="text-3xl font-semibold text-text-1 tracking-tight mb-2">
              Welcome back
            </h2>
            <p className="text-sm text-text-2">
              Sign in with your Google account to continue to OrbitX.
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 flex items-start gap-3 bg-danger-bg border border-danger-border rounded-lg"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" />
              <p className="text-sm text-danger flex-1">{error}</p>
              <button
                onClick={clearError}
                aria-label="Dismiss"
                className="text-danger hover:text-danger/80 cursor-pointer text-lg leading-none"
              >
                ×
              </button>
            </motion.div>
          )}

          {/* Card */}
          <div className="bg-bg-card border border-line-1 rounded-xl p-6 shadow-sm mb-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-primary" />
              </div>
            ) : GOOGLE_CLIENT_ID ? (
              <div id="google-signin-button" className="flex justify-center" />
            ) : (
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-blue-primary hover:bg-blue-primary-hover text-white font-medium text-sm rounded-lg transition-colors cursor-pointer"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            )}

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-line-1" />
              <span className="text-[10px] uppercase tracking-wider text-text-4 font-semibold">
                Trusted sign-in
              </span>
              <div className="flex-1 h-px bg-line-1" />
            </div>

            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5 text-xs text-text-2">
                <Check className="w-3.5 h-3.5 mt-0.5 text-blue-primary flex-shrink-0" />
                OAuth tokens encrypted at rest, never exposed to the browser
              </li>
              <li className="flex items-start gap-2.5 text-xs text-text-2">
                <Check className="w-3.5 h-3.5 mt-0.5 text-blue-primary flex-shrink-0" />
                No credit card required during Public Beta
              </li>
              <li className="flex items-start gap-2.5 text-xs text-text-2">
                <Check className="w-3.5 h-3.5 mt-0.5 text-blue-primary flex-shrink-0" />
                Your data flows directly to your warehouse — we never keep a copy
              </li>
            </ul>
          </div>

          <p className="text-xs text-text-3 mb-6 leading-relaxed">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="font-medium text-text-2 underline hover:text-blue-primary">
              Terms
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="font-medium text-text-2 underline hover:text-blue-primary">
              Privacy Policy
            </Link>
            .
          </p>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-primary hover:text-blue-primary-hover transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement | null, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default LoginPage;
