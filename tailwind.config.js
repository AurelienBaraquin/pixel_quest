/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",          // Scanne les fichiers à la racine (App.tsx, index.tsx...)
    "./components/**/*.{js,ts,jsx,tsx}", // Scanne le dossier components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}