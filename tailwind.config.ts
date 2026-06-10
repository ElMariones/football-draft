import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pitch: {
          DEFAULT: '#0d5e2a',
          dark: '#073d1a',
          light: '#1a8a3f',
        },
        gold: {
          DEFAULT: '#FFD700',
          dark: '#B8860B',
        },
        cl: {
          DEFAULT: '#3DA9FC',
          dark: '#0C2D52',
          light: '#A0D8FF',
        },
        ll: {
          DEFAULT: '#C8102E',
          dark: '#7B0A1E',
        },
        wc: {
          DEFAULT: '#00DFA2',
          dark: '#014737',
          light: '#7CF5D5',
          gold: '#F5C542',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 215, 0, 0.9)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
