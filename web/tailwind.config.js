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
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      colors: {
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
        /* Blueprint palette */
        blueprint: {
          bg: '#0F1729',
          panel: '#1A2744',
          'panel-light': '#223355',
          cyan: '#00D4FF',
          'cyan-dim': '#0099BB',
          amber: '#FFB800',
          'amber-dim': '#CC9300',
          coral: '#FF4D6A',
          mint: '#00E5A0',
          chalk: '#E8ECF4',
          'chalk-dim': '#8896AD',
          grid: 'rgba(0, 212, 255, 0.06)',
          'grid-line': 'rgba(0, 212, 255, 0.08)',
          wire: 'rgba(0, 212, 255, 0.2)',
        },
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        error: 'rgb(var(--error) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',
        surface: {
          primary: 'rgb(var(--surface-primary) / <alpha-value>)',
          secondary: 'rgb(var(--surface-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--surface-tertiary) / <alpha-value>)',
          dark: 'rgb(var(--surface-dark) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)',
          inverse: 'rgb(var(--text-inverse) / <alpha-value>)',
        },
        border: {
          primary: 'rgb(var(--border-primary) / <alpha-value>)',
          secondary: 'rgb(var(--border-secondary) / <alpha-value>)',
        },
      },
      boxShadow: {
        'none': 'none',
        'sm': '0 0 8px rgba(0, 212, 255, 0.05)',
        'DEFAULT': '0 0 12px rgba(0, 212, 255, 0.08)',
        'md': '0 0 16px rgba(0, 212, 255, 0.1)',
        'lg': '0 0 24px rgba(0, 212, 255, 0.12)',
        'glow': '0 0 12px rgba(0, 212, 255, 0.2)',
        'glow-amber': '0 0 12px rgba(255, 184, 0, 0.2)',
        'glow-coral': '0 0 12px rgba(255, 77, 106, 0.2)',
        'glow-mint': '0 0 12px rgba(0, 229, 160, 0.2)',
      },
      backgroundImage: {
        'blueprint-grid': `
          linear-gradient(rgba(0, 212, 255, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 212, 255, 0.06) 1px, transparent 1px)
        `,
        'blueprint-grid-lg': `
          linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid-sm': '16px 16px',
        'grid-md': '24px 24px',
        'grid-lg': '32px 32px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-cyan': 'pulseCyan 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseCyan: {
          '0%, 100%': { boxShadow: '0 0 4px rgba(0, 212, 255, 0.2)' },
          '50%': { boxShadow: '0 0 12px rgba(0, 212, 255, 0.4)' },
        },
      },
    },
  },
  plugins: [],
};
