/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'relay-purple': '#4615C8',
        'relay-light': '#A7AAFF',
      },
      keyframes: {
        'spin-wheel': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(var(--spin-degrees))' },
        },
      },
      animation: {
        'spin-wheel':
          'spin-wheel 4s cubic-bezier(0.17, 0.67, 0.12, 0.99) forwards',
      },
    },
  },
  plugins: [],
}
