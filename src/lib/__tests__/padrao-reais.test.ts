import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

import { formatarReais } from "../format";

// Padrão único de valor em reais (André, 22/10): "R$ 53,90", nunca "R$ 53.90" nem "R$53,90".
function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (nome === "__tests__" || nome === "node_modules") return [];
    return statSync(caminho).isDirectory() ? arquivos(caminho) : /\.(ts|tsx)$/.test(nome) ? [caminho] : [];
  });
}

describe("valor em reais", () => {
  const raiz = join(__dirname, "..", "..", "..");
  const codigo = [...arquivos(join(raiz, "src")), ...arquivos(join(raiz, "app"))];

  it("o código das telas não tem 'R$ 12.34' nem 'R$12,34'", () => {
    expect(codigo.length).toBeGreaterThan(10);
    const ruins = codigo.filter((f) => /R\$\s?\d+\.\d{2}\b|R\$\d/.test(readFileSync(f, "utf8")));
    expect(ruins).toEqual([]);
  });

  it("ninguém monta o valor na mão: nada de toFixed fora do formatarReais", () => {
    const soltos = codigo.filter((f) => /toFixed\(/.test(readFileSync(f, "utf8")));
    expect(soltos).toEqual([]);
  });

  it("formatarReais: símbolo, espaço comum, ponto no milhar, vírgula e duas casas", () => {
    expect(formatarReais(53.9)).toBe("R$ 53,90");
    expect(formatarReais(27.9)).toBe("R$ 27,90");
    expect(formatarReais(1234.56)).toBe("R$ 1.234,56");
    expect(formatarReais(0)).toBe("R$ 0,00");
    expect(formatarReais(5)).not.toMatch(/ /);
  });
});
