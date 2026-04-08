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
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '1.5' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['14px', { lineHeight: '1.5' }],
        lg: ['16px', { lineHeight: '1.4' }],
        xl: ['20px', { lineHeight: '1.3' }],
        '2xl': ['24px', { lineHeight: '1.2' }],
        '3xl': ['30px', { lineHeight: '1.1' }],
      },
      colors: {
        /* Raw neutral — zinc scale */
        neutral: {
          50: '#F5F5F5',
          100: '#E8E8EC',
          200: '#D4D4DB',
          300: '#B0B0BC',
          400: '#8A8A9A',
          500: '#6B6B7A',
          600: '#4A4A56',
          700: '#373741',
          800: '#282830',
          900: '#1C1C21',
          950: '#111114',
        },
        /* Raw primary — yellow */
        primary: {
          50: '#FEFCE8',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#FACC15',
          500: '#EAB308',
          600: '#CA8A04',
          700: '#A16207',
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
        'sm': '0 1px 3px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03)',
        'DEFAULT': '0 2px 6px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.04)',
        'md': '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'lg': '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'glow': '0 0 20px rgba(250, 204, 21, 0.15)',
        'glow-sm': '0 0 10px rgba(250, 204, 21, 0.1)',
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
