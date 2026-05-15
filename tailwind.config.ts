import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: '#ffffff',
        panel: '#fafafa',
        border: '#e5e7eb',
        accent: '#111827',
        tool: '#16a34a',
        warn: '#d97706',
        danger: '#dc2626',
      }
    }
  },
  plugins: []
} satisfies Config
