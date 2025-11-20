/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#0f172a',
        mint: '#67e8f9',
        coral: '#fb7185',
      },
    },
  },
  plugins: [],
}
