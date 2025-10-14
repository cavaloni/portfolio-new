import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#060713',
        'night-soft': '#0d0f1f',
        accent: '#00f5ff',
        'accent-soft': '#5cf2ff',
        highlight: '#ffb347',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 25px 45px rgba(15, 23, 42, 0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config;
