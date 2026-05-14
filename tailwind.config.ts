import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: '#1e1e1e',
        panel: '#252526',
        border: '#3c3c3c',
        accent: '#6366f1',
        tool: '#4ec9b0',
        warn: '#febc2e',
        danger: '#f44747',
      }
    }
  },
  plugins: []
} satisfies Config
