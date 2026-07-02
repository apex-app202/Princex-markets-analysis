/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: '#00C853',
        rise: '#00C853',
        fall: '#FF3B30',
        gold: '#FFD700',
      },
    },
  },
  plugins: [],
};
