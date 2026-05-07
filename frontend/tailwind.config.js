/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        guardian: {
          accent: '#00ff9d',
          'accent-dim': '#00cc7d',
          bg: 'rgb(var(--g-bg) / <alpha-value>)',
          card: 'rgb(var(--g-card) / <alpha-value>)',
          'card-hover': 'rgb(var(--g-card-hover) / <alpha-value>)',
          border: 'rgb(var(--g-border) / <alpha-value>)',
          'border-light': 'rgb(var(--g-border-light) / <alpha-value>)',
        },
      },
      textColor: {
        primary: 'rgb(var(--g-text-primary) / <alpha-value>)',
        secondary: 'rgb(var(--g-text-secondary) / <alpha-value>)',
        muted: 'rgb(var(--g-text-muted) / <alpha-value>)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 255, 157, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 255, 157, 0.4)' },
        },
      },
    },
  },
  plugins: [],
}
