import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

import { CORES, VERSAO } from "../tema";

const caminho = join(__dirname, "../../../vupth-docs/fontes/design/tokens.json");
const tokens = existsSync(caminho) ? JSON.parse(readFileSync(caminho, "utf8")) : null;
const comJson = tokens ? describe : describe.skip;

const luz = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const razao = (a: string, b: string) => {
  const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

comJson("tema do painel × tokens.json da Design", () => {
  it("a versão é a do JSON", () => {
    expect(VERSAO).toBe(tokens.versao);
  });

  it.each(["claro", "escuro"] as const)("as cores do tema %s batem com o JSON", (tema) => {
    const esperado = Object.fromEntries(Object.entries(tokens.cor).map(([k, v]) => [k, (v as Record<string, string>)[tema]]));
    expect(CORES[tema]).toEqual(esperado);
  });

  it("fontes, escala e raios do tailwind batem com o JSON", () => {
    const cfg = require("../../tailwind.config.js").theme.extend; // eslint-disable-line @typescript-eslint/no-require-imports
    const fam = tokens.tipografia.familia;
    expect(cfg.fontFamily).toEqual({ body: [fam.body], mono: [fam.mono], heading: [fam.heading], display: [fam.display] });
    for (const [nome, e] of Object.entries(tokens.tipografia.escala) as [string, { px: number; letterSpacing: number }][]) {
      const chave = { xxxl: "3xl", xxl: "2xl" }[nome] ?? nome;
      expect(cfg.fontSize[chave][0]).toBe(`${e.px}px`);
      expect(parseFloat(cfg.fontSize[chave][1].letterSpacing ?? "0")).toBe(e.letterSpacing);
    }
    expect([cfg.borderRadius.card, cfg.borderRadius.hero]).toEqual([`${tokens.raio.card}px`, `${tokens.raio.hero}px`]);
  });

  it("os pares de verificação medem o contraste mínimo", () => {
    for (const p of tokens.verificacao) {
      expect(razao(CORES[p.tema as "claro" | "escuro"][p.texto], CORES[p.tema as "claro" | "escuro"][p.fundo])).toBeGreaterThanOrEqual(p.minimo);
    }
  });
});

describe("hex solto", () => {
  it("as telas e os componentes não escrevem cor à mão", () => {
    const ler = (d: string): string[] =>
      readdirSync(d).flatMap((f) => {
        const p = join(d, f);
        if (statSync(p).isDirectory()) return f === "__tests__" ? [] : ler(p);
        return /\.tsx$/.test(f) ? [p] : [];
      });
    for (const arq of [...ler(join(__dirname, "../components")), ...ler(join(__dirname, "../screens")), ...ler(join(__dirname, "../../app"))]) {
      expect({ arq, hex: readFileSync(arq, "utf8").match(/["'`]#[0-9a-fA-F]{3,8}\b/g) }).toEqual({ arq, hex: null });
    }
  });
});
