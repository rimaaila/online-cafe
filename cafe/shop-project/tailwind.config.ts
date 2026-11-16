import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F4FAEA',
          100: '#E9F6D8',
          200: '#D3EDB2',
          300: '#BCE288',
          400: '#A5D561',
          500: '#8CC63F', // main light green
          600: '#70A82E',
          700: '#4F8A1E', // deep herb
          800: '#3A6717',
          900: '#2A4A12',
        },
        accent: { DEFAULT: '#F4A03A', dark: '#D9852A' },
        cream: '#FAFDF5',
        ink: '#1F2A1C',
        sage: '#6B7A66',
        line: '#DCE6D2',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
