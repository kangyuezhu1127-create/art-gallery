/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Tight"', '"Noto Sans SC"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Inter Tight"', '"Noto Sans SC"', 'sans-serif'],
        cn: ['"Noto Sans SC"', '"Inter Tight"', 'sans-serif'],
        typewriter: ['"Special Elite"', '"Courier New"', 'monospace'],
      },
      colors: {
        papercut: '#D72638',  // 剪纸红
        ink: '#0a0a0a',
        paper: '#ffffff',
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(var(--r, 0deg))' },
          '50%':       { transform: 'translate(4px, -8px) rotate(calc(var(--r, 0deg) + 4deg))' },
        },
        riseIn: {
          '0%':   { opacity: 0, transform: 'translateY(24px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        cutSnip: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%':       { transform: 'rotate(-18deg)' },
        },
      },
      animation: {
        floaty:  'floaty 6s ease-in-out infinite',
        riseIn:  'riseIn 0.7s ease-out both',
        cutSnip: 'cutSnip 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
