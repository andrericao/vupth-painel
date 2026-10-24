import { margemDoAppCent, precoDoClienteCent } from "../preco";
import { gastam, itemDaCampanha, itemDoFormulario, simular, somar, type ItemSimulado } from "../simulacao";
import { formularioVazio, type Campaign } from "../campaigns";

const P = { corteReais: 50, cortesPorPessoa: 2, pessoas: 10 };
const desconto = (x: Partial<ItemSimulado> = {}): ItemSimulado => ({
  nome: "D",
  tipo: "DISCOUNT",
  valorReais: 10,
  valorPercent: null,
  limite: 20,
  ...x,
});

describe("preco (a mesma tabela do Backend)", () => {
  it.each([
    [1000, 1290, 91],
    [3000, 3290, 91],
    [5000, 5390, 179],
  ])("recebe %i → preço %i, app %i", (recebe, preco, app) => {
    expect(precoDoClienteCent(recebe)).toBe(preco);
    expect(margemDoAppCent(recebe)).toBe(app);
  });

  it("sobe de R$ 1 em R$ 1 até passar na prova real e arredonda o centavo do cartão para cima", () => {
    expect(precoDoClienteCent(1001)).toBe(1290);
    expect(precoDoClienteCent(1290)).toBeGreaterThanOrEqual(1290);
  });
});

describe("simular", () => {
  it("desconto em R$: custo, ganho e saldo", () => {
    const l = simular(desconto(), P); // 20 pessoas × 2 cortes = 40
    expect(l).toMatchObject({ pessoas: 20, cortes: 40, custoDesconto: 400, bonificacao: 0 });
    expect(l.ganho).toBeCloseTo(40 * 1.79);
    expect(l.saldo).toBeCloseTo(40 * 1.79 - 400);
    expect(l.teto).toBeCloseTo(400);
  });

  it("o desconto nunca passa do valor do corte; em % usa o preço do cliente", () => {
    expect(simular(desconto({ valorReais: 999, limite: 1 }), { ...P, cortesPorPessoa: 1 }).custoDesconto).toBeCloseTo(53.9);
    expect(simular(desconto({ valorReais: null, valorPercent: 10, limite: 1 }), { ...P, cortesPorPessoa: 1 }).custoDesconto).toBeCloseTo(5.39);
  });

  it("sem limite usa as pessoas da simulação e não tem teto", () => {
    const l = simular(desconto({ limite: null }), P);
    expect(l.pessoas).toBe(10);
    expect(l.teto).toBeNull();
  });

  it("link paga a bonificação por corte e rende a margem; taxa zero não rende", () => {
    const link = simular({ ...desconto(), tipo: "REFERRAL_BONUS", valorReais: 5, limite: 2 }, P);
    expect(link.bonificacao).toBe(20);
    expect(link.custoDesconto).toBe(0);
    expect(link.ganho).toBeCloseTo(4 * 1.79);
    const zero = simular({ ...desconto(), tipo: "FEE_WAIVER", valorReais: null }, P);
    expect(zero).toMatchObject({ custoDesconto: 0, ganho: 0, saldo: 0, teto: 0 });
    expect(simular({ ...desconto(), tipo: "REFERRAL_BONUS", valorReais: null, limite: 1 }, P).bonificacao).toBe(0);
    expect(simular(desconto({ valorReais: null, valorPercent: null }), P).custoDesconto).toBe(0);
  });

  it("somar: soma tudo e o teto some se alguma campanha não tem limite", () => {
    const a = simular(desconto(), P);
    const b = simular(desconto({ limite: 5 }), P);
    const t = somar([a, b]);
    expect(t.custoDesconto).toBeCloseTo(a.custoDesconto + b.custoDesconto);
    expect(t.saldo).toBeCloseTo(a.saldo + b.saldo);
    expect(t.teto).toBeCloseTo((a.teto ?? 0) + (b.teto ?? 0));
    expect(somar([a, simular(desconto({ limite: null }), P)]).teto).toBeNull();
    expect(somar([]).teto).toBe(0);
  });
});

describe("itens", () => {
  const c = (x: Partial<Campaign>): Campaign =>
    ({ id: "c1", name: "N", type: "DISCOUNT", visibility: "PUBLIC", starts_at: "", ends_at: "", redemptions: 0, new_clients_only: false, active: true, status: "RUNNING", ...x }) as Campaign;

  it("da campanha existente e do formulário", () => {
    expect(itemDaCampanha(c({ value_percent: 10, max_redemptions: 5 }))).toEqual({
      id: "c1", nome: "N", tipo: "DISCOUNT", valorReais: null, valorPercent: 10, limite: 5,
    });
    expect(itemDaCampanha(c({ value_amount: 7 })).limite).toBeNull();
    const f = { ...formularioVazio("2026-10-22"), beneficio: "porcento" as const, valor: "10", limite: "30" };
    expect(itemDoFormulario(f, "x")).toEqual({ id: "x", nome: "Esta campanha", tipo: "DISCOUNT", valorReais: null, valorPercent: 10, limite: 30 });
    expect(itemDoFormulario({ ...f, modo: "link", nome: " L ", limite: "" })).toMatchObject({ tipo: "REFERRAL_BONUS", nome: "L", valorReais: 10, limite: null });
    expect(itemDoFormulario({ ...f, beneficio: "taxa-zero" }).tipo).toBe("FEE_WAIVER");
  });

  it("só gasta quem não encerrou", () => {
    expect(gastam(c({ status: "PAUSED" }))).toBe(true);
    expect(gastam(c({ status: "ENDED" }))).toBe(false);
  });
});
