/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0b0c',
        panel: '#141416',
        panel2: '#1c1c1f',
        line: '#2a2a2e',
        text: '#f4f1ea',
        dim: '#8a8a8f',
        volt: '#d4ff2e',
        bad: '#ff3b30',
        warn: '#ff8a3d',
      },
      fontFamily: {
        display: ['Oswald', 'system-ui', 'sans-serif'],
        body: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"Spline Sans Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        app: '480px',
      },
      boxShadow: {
        volt: '0 0 0 1px #d4ff2e, 0 0 24px -4px rgba(212,255,46,0.45)',
      },
    },
  },
  plugins: [],
}
