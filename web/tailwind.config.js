/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist Variable', 'Noto Sans Thai', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Geist Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono Variable', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Aligned with the hardcoded pixel sizes the redesigned pages use,
        // so both Tailwind-scale classes (text-sm, text-base) and
        // literal text-[13px]/text-[14px] values produce consistent sizing.
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['14px', { lineHeight: '1.55' }],
        lg: ['16px', { lineHeight: '1.4' }],
        xl: ['20px', { lineHeight: '1.3' }],
        '2xl': ['24px', { lineHeight: '1.2' }],
        '3xl': ['30px', { lineHeight: '1.1' }],
      },
      colors: {
        /* Raw neutral — slate scale */
        neutral: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        /* Raw primary — blue */
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        /* Accent — amber */
        accent: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        /* Backward compat — brand via CSS variables */
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
        },
        /* Semantic surfaces */
        surface: {
          primary: 'rgb(var(--surface-primary) / <alpha-value>)',
          secondary: 'rgb(var(--surface-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--surface-tertiary) / <alpha-value>)',
          dark: 'rgb(var(--surface-dark) / <alpha-value>)',
        },
        /* Semantic text */
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)',
          inverse: 'rgb(var(--text-inverse) / <alpha-value>)',
        },
        /* Semantic borders */
        border: {
          DEFAULT: 'rgb(var(--border-default) / <alpha-value>)',
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
          primary: 'rgb(var(--border-primary) / <alpha-value>)',
          secondary: 'rgb(var(--border-secondary) / <alpha-value>)',
        },
        /* Status */
        success: {
          light: 'rgb(var(--success-light) / <alpha-value>)',
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          dark: 'rgb(var(--success-dark) / <alpha-value>)',
        },
        warning: {
          light: 'rgb(var(--warning-light) / <alpha-value>)',
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          dark: 'rgb(var(--warning-dark) / <alpha-value>)',
        },
        error: {
          light: 'rgb(var(--error-light) / <alpha-value>)',
          DEFAULT: 'rgb(var(--error) / <alpha-value>)',
          dark: 'rgb(var(--error-dark) / <alpha-value>)',
        },
        info: {
          light: 'rgb(var(--info-light) / <alpha-value>)',
          DEFAULT: 'rgb(var(--info) / <alpha-value>)',
          dark: 'rgb(var(--info-dark) / <alpha-value>)',
        },

        /* ── Light Professional tokens ── */
        // Function form supports Tailwind opacity modifiers (/50, /30 etc.)
        'navy': ({ opacityValue }) => opacityValue !== undefined ? `rgba(11,26,94,${opacityValue})` : '#0B1A5E',
        'blue-primary': ({ opacityValue }) => opacityValue !== undefined ? `rgba(24,72,243,${opacityValue})` : '#1848F3',
        'blue-primary-hover': 'var(--blue-primary-hover)',
        'blue-soft': ({ opacityValue }) => opacityValue !== undefined ? `rgba(238,242,254,${opacityValue})` : '#EEF2FE',
        'blue-border': ({ opacityValue }) => opacityValue !== undefined ? `rgba(194,212,249,${opacityValue})` : '#C2D4F9',

        'bg-page': ({ opacityValue }) => opacityValue !== undefined ? `rgba(247,249,252,${opacityValue})` : '#F7F9FC',
        'bg-card': ({ opacityValue }) => opacityValue !== undefined ? `rgba(255,255,255,${opacityValue})` : '#FFFFFF',
        'bg-row-alt': ({ opacityValue }) => opacityValue !== undefined ? `rgba(250,251,253,${opacityValue})` : '#FAFBFD',
        'bg-row-hv': ({ opacityValue }) => opacityValue !== undefined ? `rgba(242,245,251,${opacityValue})` : '#F2F5FB',
        'bg-muted': ({ opacityValue }) => opacityValue !== undefined ? `rgba(241,245,249,${opacityValue})` : '#F1F5F9',

        'line-1': ({ opacityValue }) => opacityValue !== undefined ? `rgba(229,234,242,${opacityValue})` : '#E5EAF2',
        'line-2': ({ opacityValue }) => opacityValue !== undefined ? `rgba(211,218,230,${opacityValue})` : '#D3DAE6',
        'line-soft': ({ opacityValue }) => opacityValue !== undefined ? `rgba(238,242,247,${opacityValue})` : '#EEF2F7',

        'text-1': ({ opacityValue }) => opacityValue !== undefined ? `rgba(14,23,42,${opacityValue})` : '#0E172A',
        'text-2': ({ opacityValue }) => opacityValue !== undefined ? `rgba(59,69,87,${opacityValue})` : '#3B4557',
        'text-3': ({ opacityValue }) => opacityValue !== undefined ? `rgba(100,116,139,${opacityValue})` : '#64748B',
        'text-4': ({ opacityValue }) => opacityValue !== undefined ? `rgba(148,162,184,${opacityValue})` : '#94A2B8',

        'success-bg': 'var(--success-bg)',
        'success-border': 'var(--success-border)',
        'warning-bg': 'var(--warning-bg)',
        'warning-border': 'var(--warning-border)',
        'danger': 'var(--danger)',
        'danger-bg': 'var(--danger-bg)',
        'danger-border': 'var(--danger-border)',
        'violet': 'var(--violet)',
        'violet-bg': 'var(--violet-bg)',
        'violet-border': 'var(--violet-border)',
      },
      borderRadius: {
        'none': '0',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        'full': '9999px',
      },
      boxShadow: {
        'none': 'none',
        'sm': 'var(--shadow-sm)',
        'DEFAULT': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-sm': '0 0 10px rgba(59, 130, 246, 0.1)',
        'dark-sm': '0 1px 3px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03)',
        'dark': '0 2px 6px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.04)',
        'dark-md': '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'dark-lg': '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
      },
      transitionDuration: {
        'fast': '120ms',
        'DEFAULT': '200ms',
        'slow': '300ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
