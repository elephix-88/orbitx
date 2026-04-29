import { useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, ArrowLeft, Zap, Search, Table, Database } from 'lucide-react';
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

const PLATFORMS = [
  { label: 'Facebook Ads', icon: <FacebookIcon size={13} className="text-white" />, bg: '#1877F2' },
  { label: 'Google Ads',   icon: <Search className="w-3 h-3 text-white" />,          bg: '#4285F4' },
  { label: 'TikTok Ads',  icon: <Zap className="w-3 h-3 text-white" />,             bg: '#010101' },
];

const DESTINATIONS = [
  { label: 'BigQuery',      icon: <Database className="w-3 h-3 text-white" />, bg: '#4285F4' },
  { label: 'Google Sheets', icon: <Table className="w-3 h-3 text-white" />,   bg: '#0F9D58' },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay },
});

const LoginPage = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { googleAuth, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const from = (location.state as any)?.from?.pathname || '/dashboard';
  const initialized = useRef(false);

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (initialized.current) return; // Guard against React StrictMode double-invoke
    initialized.current = true;

    const script = document.createElement('script');
    script.src   = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });
      // renderButton is the most reliable path — works with or without FedCM
      window.google?.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { theme: 'outline', size: 'large', width: 300, text: 'continue_with' }
      );
    };
    return () => { script.parentNode?.removeChild(script); };
  }, []);

  const handleGoogleCallback = async (response: any) => {
    try {
      await googleAuth(response.credential);
      navigate(from, { replace: true });
    } catch { /* handled in store */ }
  };

  return (
    <div className="min-h-screen bg-bg-page flex flex-col">
      {/* Dot-grid texture */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #D3DAE6 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.45,
        }}
      />
      {/* Ambient glow */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-180px', left: '50%', transform: 'translateX(-50%)',
          width: '900px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(24,72,243,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Nav */}
      <motion.header {...fadeUp(0)} className="relative z-10 flex items-center justify-between px-8 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 flex items-center justify-center rounded-md"
            style={{ background: 'linear-gradient(135deg, #1848F3 0%, #6D28D9 100%)' }}
          >
            <span className="text-sm font-bold text-white">O</span>
          </div>
          <span className="text-base font-semibold text-text-1 tracking-tight">OrbitX</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-text-3 hover:text-text-1 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </Link>
      </motion.header>

      {/* Main */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <motion.div {...fadeUp(0.08)} className="w-full max-w-3xl">

          {/* Card */}
          <div className="bg-bg-card border border-line-1 rounded-2xl shadow-lg shadow-black/[0.06] overflow-hidden flex">

            {/* ── Left panel ── */}
            <div className="hidden md:flex flex-col justify-between w-[42%] flex-shrink-0 p-8 border-r border-line-1 bg-bg-muted">

              <motion.div {...fadeUp(0.18)}>
                <div className="w-6 h-0.5 bg-blue-primary rounded-full mb-5" />
                <p className="text-lg font-bold text-text-1 tracking-tight leading-snug mb-2">
                  All your ad data,<br />
                  <span className="text-blue-primary">one pipeline.</span>
                </p>
                <p className="text-sm text-text-2 leading-relaxed">
                  Connect Facebook, Google, and TikTok to your warehouse in minutes.
                </p>
              </motion.div>

              {/* Animated platform flow */}
              <div className="space-y-2.5 my-6">
                {/* Sources */}
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-4 mb-2">Sources</p>
                {PLATFORMS.map((p, i) => (
                  <motion.div
                    key={p.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.28 + i * 0.09 }}
                    className="flex items-center gap-2.5"
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: p.bg }}
                    >
                      {p.icon}
                    </div>
                    <span className="text-xs font-medium text-text-2">{p.label}</span>
                  </motion.div>
                ))}

                {/* Connector */}
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.4, delay: 0.58 }}
                  className="flex items-center gap-2 py-1 origin-left"
                >
                  <div className="flex-1 h-px bg-line-2" />
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                    className="w-5 h-5 rounded-full bg-blue-soft border border-blue-border flex items-center justify-center"
                  >
                    <Zap className="w-3 h-3 text-blue-primary" />
                  </motion.div>
                  <div className="flex-1 h-px bg-line-2" />
                </motion.div>

                {/* Destinations */}
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-4 mb-2">Destinations</p>
                {DESTINATIONS.map((d, i) => (
                  <motion.div
                    key={d.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.64 + i * 0.09 }}
                    className="flex items-center gap-2.5"
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: d.bg }}
                    >
                      {d.icon}
                    </div>
                    <span className="text-xs font-medium text-text-2">{d.label}</span>
                  </motion.div>
                ))}
              </div>

              <motion.div {...fadeUp(0.72)}>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-bg border border-success-border">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span className="text-[11px] font-medium text-success">Free during Public Beta</span>
                </div>
              </motion.div>
            </div>

            {/* ── Right — form ── */}
            <div className="flex-1 flex flex-col justify-center p-8 sm:p-10">

              <motion.div {...fadeUp(0.2)} className="mb-7">
                <h1 className="text-2xl font-bold text-text-1 tracking-tight mb-1.5">
                  Sign in to OrbitX
                </h1>
                <p className="text-sm text-text-2">One click to get started.</p>
              </motion.div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 p-3.5 flex items-start gap-3 bg-danger-bg border border-danger-border rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-danger" />
                  <p className="text-sm text-danger flex-1">{error}</p>
                  <button onClick={clearError} aria-label="Dismiss" className="text-danger hover:text-danger/80 cursor-pointer text-lg leading-none">×</button>
                </motion.div>
              )}

              {/* Google sign-in */}
              <motion.div {...fadeUp(0.3)} className="mb-8">
                {isLoading ? (
                  <div className="flex items-center justify-center py-5">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-primary" />
                  </div>
                ) : GOOGLE_CLIENT_ID ? (
                  /* Google renders its button here — single instance, no prompt() conflicts */
                  <div id="google-signin-button" className="flex justify-center" />
                ) : (
                  /* Dev fallback when no client ID configured */
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-bg-card border border-line-1 text-text-1 font-medium text-sm rounded-xl hover:bg-bg-row-hv transition-colors cursor-pointer shadow-sm"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>
                )}
              </motion.div>

              {/* Terms */}
              <motion.p {...fadeUp(0.4)} className="text-[11px] text-text-4 leading-relaxed">
                By continuing, you agree to our{' '}
                <Link to="/terms" className="text-text-3 underline underline-offset-2 hover:text-blue-primary transition-colors">Terms</Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-text-3 underline underline-offset-2 hover:text-blue-primary transition-colors">Privacy Policy</Link>.
              </motion.p>
            </div>
          </div>

          <motion.p {...fadeUp(0.45)} className="text-center text-xs text-text-4 mt-5">
            © {new Date().getFullYear()} OrbitX · All rights reserved
          </motion.p>
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
