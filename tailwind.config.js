/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        sv: {
          bg: "#020617",          // azul bem escuro
          surface: "#0f172a",     // azul escuro
          accent: "#ef4444",      // vermelho SecurityVision
          accentSoft: "#f97373",  // vermelho mais suave
        },
      },
    },
  },
  plugins: [],
};
