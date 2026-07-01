/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        gt: {
          base:     '#070c14',
          surface:  '#0c1525',
          card:     '#111827',
          elevated: '#1a2235',
          border:   'rgba(255,255,255,0.07)',
        },
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
}
