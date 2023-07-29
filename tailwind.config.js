/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/*.{ejs,js}", "./views/**/*.{ejs,js}"],
  theme: {
    extend: {
      spacing: {
        '128': '32rem',
        '144': '36rem',
      }
    },
  },
  plugins: [],
}
