/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0a0f0d",
        panel: "#101816",
        line: "#1e2b27",
        neon: "#22c55e",
      },
    },
  },
  plugins: [],
};