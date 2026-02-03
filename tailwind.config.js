/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Background layers
        bg: {
          primary: '#0F0F12',
          secondary: '#1A1A1F',
          tertiary: '#252529',
        },
        // Text
        text: {
          primary: '#F5F5F7',
          secondary: '#A1A1A6',
          muted: '#6E6E73',
        },
        // Accent - Warm amber
        accent: {
          primary: '#F59E0B',
          secondary: '#D97706',
          muted: '#92400E',
        },
        // Semantic
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        // Analysis highlights
        fallacy: '#F87171',
        bias: '#FBBF24',
        gender: '#A78BFA',
        racial: '#F472B6',
        strength: '#34D399',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Source Sans 3', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
