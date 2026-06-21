/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#6E20B8',
          lightPurple: '#A555E8',
          orange: '#F28C28',
          darkBlue: '#1E3A8A',
        }
      }
    },
  },
  plugins: [],
}
