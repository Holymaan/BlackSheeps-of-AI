/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './*.{js,ts,jsx,tsx}', './admin/**/*.{js,ts,jsx,tsx}', './api/**/*.{js,ts,jsx,tsx}', './design-system/**/*.{js,ts,jsx,tsx}', './locales/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Primary — school bus yellow */
        'bus-yellow': {
          DEFAULT: '#F5B800',
          light:   '#FEF3C7',
          dark:    '#D97706',
          darker:  '#B45309',
        },
        /* Secondary — civic navy */
        'bus-navy': {
          DEFAULT: '#1B4F8A',
          light:   '#EFF6FF',
          dark:    '#0F3566',
          muted:   '#BFDBFE',
        },
        /* Semantic */
        brand: {
          primary:   '#F5B800',
          secondary: '#1B4F8A',
        },
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs':   ['0.75rem',  { lineHeight: '1rem' }],
        'sm':   ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem',     { lineHeight: '1.5rem' }],
        'lg':   ['1.125rem', { lineHeight: '1.75rem' }],
        'xl':   ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl':  ['1.5rem',   { lineHeight: '2rem' }],
        '3xl':  ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl':  ['2.25rem',  { lineHeight: '2.5rem' }],
        '5xl':  ['3rem',     { lineHeight: '1' }],
      },
      borderRadius: {
        'sm':  '4px',
        'md':  '8px',
        'lg':  '12px',
        'xl':  '16px',
        '2xl': '24px',
      },
      boxShadow: {
        'sm':    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md':    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
        'lg':    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
        'brand': '0 4px 14px 0 rgb(245 184 0 / 0.35)',
        'navy':  '0 4px 14px 0 rgb(27 79 138 / 0.25)',
      },
      animation: {
        'fade-in':  'fadeIn 200ms ease',
        'slide-up': 'slideUp 200ms ease',
        'spin-slow': 'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
