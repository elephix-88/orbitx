import { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

// Google Icon Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
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

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { googleAuth, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Initialize Google Sign-In
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('Google Client ID not configured');
      return;
    }

    // Load Google Identity Services script
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

        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'outline',
            size: 'large',
            width: 400,
            text: 'continue_with',
          }
        );
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
      // Error handled by store
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0F1729' }}>
      {/* Left Side -- Blueprint geometric branding */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden" style={{ backgroundColor: '#0F1729' }}>
        {/* Blueprint grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0, 212, 255, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Geometric decorations - blueprint style */}
        <div className="absolute top-32 right-16 w-32 h-32 rounded-full hidden lg:block" style={{ border: '2px solid rgba(0, 212, 255, 0.2)' }} />
        <div className="absolute bottom-24 left-16 w-24 h-[2px]" style={{ background: 'linear-gradient(to right, #FFB800, transparent)' }} />
        <div className="absolute top-1/3 left-1/4 w-16 h-16 rotate-45" style={{ border: '1px solid rgba(0, 212, 255, 0.15)' }} />

        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center" style={{ border: '2px solid #00D4FF', borderRadius: '4px' }}>
              <span className="text-2xl font-bold tracking-tight" style={{ color: '#00D4FF' }}>O</span>
            </div>
            <span className="text-2xl font-bold uppercase tracking-widest" style={{ color: '#E8ECF4' }}>OrbitX</span>
          </Link>

          <div>
            <h1 className="text-4xl font-bold uppercase tracking-tight leading-tight mb-8" style={{ color: '#E8ECF4' }}>
              Automate<br />your data<br />workflows
            </h1>
            <div className="w-16 h-[2px] mb-8" style={{ background: 'linear-gradient(to right, #00D4FF, transparent)' }} />
            <p className="text-lg leading-relaxed" style={{ color: '#8896AD' }}>
              Connect your data sources, transform your data, and load it into your destinations.
            </p>
          </div>

          <p className="text-sm uppercase tracking-widest" style={{ color: '#506080' }}>
            &copy; 2024 OrbitX
          </p>
        </div>
      </div>

      {/* Right Side -- Login */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ backgroundColor: '#1A2744' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden mb-16">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center" style={{ border: '2px solid #00D4FF', borderRadius: '4px' }}>
                <span className="text-xl font-bold" style={{ color: '#00D4FF' }}>O</span>
              </div>
              <span className="text-xl font-bold uppercase tracking-widest" style={{ color: '#E8ECF4' }}>
                OrbitX
              </span>
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="text-3xl font-bold uppercase tracking-tight mb-3" style={{ color: '#E8ECF4' }}>
              Welcome
            </h2>
            <div className="w-12 h-[2px] mb-4" style={{ background: 'linear-gradient(to right, #00D4FF, transparent)' }} />
            <p className="text-base" style={{ color: '#8896AD' }}>
              Sign in with your Google account to continue
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 flex items-center gap-3"
              style={{
                backgroundColor: 'rgba(255, 77, 106, 0.1)',
                borderLeft: '4px solid #FF4D6A',
                borderRadius: '4px',
              }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#FF4D6A' }} />
              <p className="text-sm" style={{ color: '#FF4D6A' }}>{error}</p>
              <button
                onClick={clearError}
                className="ml-auto font-bold"
                style={{ color: '#FF4D6A' }}
              >
                x
              </button>
            </motion.div>
          )}

          {/* Google Sign-In Button */}
          <div className="mb-12">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00D4FF' }} />
              </div>
            ) : GOOGLE_CLIENT_ID ? (
              <div id="google-signin-button" className="flex justify-center" />
            ) : (
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 font-bold uppercase tracking-wider text-sm transition-colors"
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  color: '#E8ECF4',
                  borderRadius: '4px',
                }}
              >
                <GoogleIcon />
                Continue with Google
              </button>
            )}
          </div>

          <div className="mb-8">
            <p className="text-xs uppercase tracking-wider" style={{ color: '#506080' }}>
              By continuing, you agree to our{' '}
              <Link to="/terms" className="font-bold underline" style={{ color: '#00D4FF' }}>
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="font-bold underline" style={{ color: '#00D4FF' }}>
                Privacy Policy
              </Link>
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors"
            style={{ color: '#00D4FF' }}
          >
            &larr; Back to home
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

// Add Google types
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
