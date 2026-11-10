/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ph: {
          DEFAULT: '#FF6154',
          hover:   '#f04d3f',
          dark:    '#d64235',
          light:   '#fff0ee',
          muted:   '#ffe4e2',
          glow:    'rgba(255, 97, 84, 0.25)',
        },
        brand: {
          50:  '#fff5f4',
          100: '#ffe8e5',
          200: '#ffd5d0',
          300: '#ffb3aa',
          400: '#ff8475',
          500: '#FF6154',
          600: '#e54739',
          700: '#c23427',
          800: '#a12d23',
          900: '#842b23',
        },
        indigo:  { DEFAULT: '#6366f1', light: '#eef2ff' },
        neutral: {
          50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4',
          300: '#d6d3d1', 400: '#a8a29e', 500: '#78716c',
          600: '#57534e', 700: '#44403c', 800: '#292524', 900: '#1c1917',
          950: '#0c0a09',
        },
      },
      fontFamily: {
        sans: ['Inter','system-ui','-apple-system','sans-serif'],
        mono: ['JetBrains Mono','monospace'],
      },
      fontSize: {
        '10': ['10px', '14px'],
        '11': ['11px', '15px'],
        '12': ['12px', '16px'],
        '13': ['13px', '18px'],
      },
      boxShadow: {
        xs:  '0 1px 2px rgba(0,0,0,0.04)',
        sm:  '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        md:  '0 4px 12px -2px rgba(0,0,0,0.08), 0 2px 6px -1px rgba(0,0,0,0.04)',
        lg:  '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
        xl:  '0 20px 35px -10px rgba(0,0,0,0.14), 0 10px 12px -7px rgba(0,0,0,0.06)',
        ph:  '0 4px 18px rgba(255,97,84,0.3)',
        'ph-lg': '0 8px 28px rgba(255,97,84,0.4)',
        'glow-ph': '0 0 24px rgba(255,97,84,0.35)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.2s ease both',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};
