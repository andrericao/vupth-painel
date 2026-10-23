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
      // Fontes do tokens.json (tipografia.familia); o nome é a chave do useFonts em app/_layout.tsx.
      // A ordem importa: a última classe de família vence (heading e display sobrepõem body).
      fontFamily: {
        body: ["Inter_400Regular"],
        mono: ["DMMono_500Medium"],
        heading: ["Archivo_700Bold"],
        display: ["Archivo_800ExtraBold"],
      },
      // Escala do tokens.json (tipografia.escala); base e 2xl/3xl ficam nos mesmos tamanhos de md, xxl e xxxl.
      fontSize: {
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["14px", { lineHeight: "20px" }],
        md: ["16px", { lineHeight: "24px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "26px" }],
        xl: ["22px", { lineHeight: "28px", letterSpacing: "-0.5px" }],
        "2xl": ["28px", { lineHeight: "34px", letterSpacing: "-1px" }],
        "3xl": ["34px", { lineHeight: "40px", letterSpacing: "-1.5px" }],
      },
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
