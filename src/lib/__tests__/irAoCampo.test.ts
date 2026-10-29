import { irAoCampo, primeiroCampoComErro } from "../irAoCampo";

describe("primeiroCampoComErro", () => {
  it("devolve o primeiro na ordem da tela, não na do objeto", () => {
    expect(primeiroCampoComErro({ teto: "x", nome: "y" })).toBe("nome");
  });
  it("traduz a chave para o testID", () => {
    expect(primeiroCampoComErro({ pctDono: "x" })).toBe("pct-dono");
  });
  it("devolve null sem erro", () => {
    expect(primeiroCampoComErro({})).toBeNull();
  });
});

describe("irAoCampo", () => {
  it("não quebra sem alvo ou fora da web", () => {
    expect(() => irAoCampo(null)).not.toThrow();
    expect(() => irAoCampo("nome")).not.toThrow();
  });
});
