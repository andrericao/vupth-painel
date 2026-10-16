/** @type {import('tailwindcss').Config} */
// Cores do app (vupth-partner/tailwind.config.js, tokens `vupth`): o painel fala a mesma identidade.
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      borderRadius: { card: "20px" },
      colors: {
        vupth: {
          green: "#9FE870",
          forest: "#163300",
          forestSoft: "#223D0D",
          greenTint: "#E2F6D5",
          surface: "#F3F5F1",
          textPrimary: "#163300",
          textSecondary: "#454745",
          textPlaceholder: "#6B706B",
          border: "#D7DDD3",
          danger: "#B3261E",
          dangerTint: "#FCE8E6",
          amber: "#8A5A00",
          amberTint: "#FFF1D6",
        },
      },
    },
  },
  plugins: [],
};
