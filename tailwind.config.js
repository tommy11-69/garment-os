/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./404.html",
    "./500.html",
    "./pages/**/*.html",
    "./auth/**/*.html",
    "./components/**/*.html",
    "./js/**/*.js"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f0fa',
          100: '#cce1f5',
          500: '#0059b5',
          600: '#004a99',
          700: '#003b7a',
        },
        brand: '#0059b5',
        success: '#008A00',
        danger: '#E53935',
        warning: '#F57C00',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
