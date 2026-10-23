/** @type {import('tailwindcss').Config} */
// Cores: src/tema.js, que espelha o tokens.json da Design (claro e escuro). O className usa o nome do token.
const plugin = require("tailwindcss/plugin");
const { CORES } = require("./src/tema");

const variaveis = (tema) => Object.fromEntries(Object.entries(tema).map(([k, v]) => [`--vupth-${k}`, v]));

module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      borderRadius: { card: "20px", hero: "24px" },
      colors: {
        vupth: Object.fromEntries(Object.keys(CORES.claro).map((k) => [k, `var(--vupth-${k})`])),
      },
    },
  },
  plugins: [
    plugin(({ addBase }) =>
      addBase({
        ":root": variaveis(CORES.claro),
        "@media (prefers-color-scheme: dark)": { ":root": variaveis(CORES.escuro) },
      }),
    ),
  ],
};
