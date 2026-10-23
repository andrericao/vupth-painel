import {
  brParaIso,
  isoParaBr,
  mascaraData,
  mascaraPercentual,
  mascaraValor,
  somenteNumeros,
  valorParaCampo,
} from "../mascaras";

describe("máscaras", () => {
  it("somenteNumeros tira o que não é dígito e corta no máximo", () => {
    expect(somenteNumeros("a1b2c3")).toBe("123");
    expect(somenteNumeros("1234567", 3)).toBe("123");
  });

  it("data: as barras entram sozinhas e sobra nada além de 8 dígitos", () => {
    expect(mascaraData("1")).toBe("1");
    expect(mascaraData("16")).toBe("16");
    expect(mascaraData("161")).toBe("16/1");
    expect(mascaraData("1610")).toBe("16/10");
    expect(mascaraData("16102")).toBe("16/10/2");
    expect(mascaraData("16/10/2026 99")).toBe("16/10/2026");
    expect(mascaraData("ab")).toBe("");
  });

  it("brParaIso e isoParaBr", () => {
    expect(brParaIso("16/10/2026")).toBe("2026-10-16");
    expect(brParaIso("29/02/2028")).toBe("2028-02-29");
    expect(brParaIso("31/02/2026")).toBeNull();
    expect(brParaIso("16/13/2026")).toBeNull();
    expect(brParaIso("16/10")).toBeNull();
    expect(isoParaBr("2026-10-16")).toBe("16/10/2026");
    expect(isoParaBr("lixo")).toBe("lixo");
  });

  it("valor: centavos viram reais com vírgula e milhar", () => {
    expect(mascaraValor("")).toBe("");
    expect(mascaraValor("0")).toBe("");
    expect(mascaraValor("5")).toBe("0,05");
    expect(mascaraValor("50")).toBe("0,50");
    expect(mascaraValor("1250")).toBe("12,50");
    expect(mascaraValor("R$ 1.234,56")).toBe("1.234,56");
    expect(mascaraValor("12345678901")).toBe("1.234.567,89");
    expect(valorParaCampo(10)).toBe("10,00");
    expect(valorParaCampo(5.5)).toBe("5,50");
  });

  it("percentual: dígitos e uma vírgula, 2 decimais, até 100", () => {
    expect(mascaraPercentual("")).toBe("");
    expect(mascaraPercentual("abc")).toBe("");
    expect(mascaraPercentual("15")).toBe("15");
    expect(mascaraPercentual("007")).toBe("7");
    expect(mascaraPercentual("12,345")).toBe("12,34");
    expect(mascaraPercentual("12,3,4")).toBe("12,34");
    expect(mascaraPercentual(",5")).toBe("0,5");
    expect(mascaraPercentual("101")).toBe("100");
    expect(mascaraPercentual("1234")).toBe("100");
    expect(mascaraPercentual("100,5")).toBe("100");
    expect(mascaraPercentual("99,99")).toBe("99,99");
  });
});
