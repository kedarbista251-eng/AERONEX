/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060B15',
          900: '#0B132B',
          850: '#111D3E',
          800: '#1C2541',
          700: '#2A385B',
          600: '#3A4B75',
        },
        cyan: {
          400: '#38BDF8',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
