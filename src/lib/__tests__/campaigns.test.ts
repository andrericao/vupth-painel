import * as api from "../api";
import {
  criarCampanha,
  descreverBeneficio,
  diaSP,
  editarCampanha,
  encerrarCampanha,
  formularioDe,
  formularioVazio,
  listarCampanhas,
  numero,
  ocupacao,
  paraRequest,
  pausarCampanha,
  retomarCampanha,
  validar,
  type Campaign,
  type Formulario,
} from "../campaigns";

const campanha = (x: Partial<Campaign> = {}): Campaign => ({
  id: "c1",
  name: "Lançamento",
  type: "DISCOUNT",
  visibility: "PUBLIC",
  value_amount: 10,
  starts_at: "2026-10-16T03:00:00Z",
  ends_at: "2026-11-01T02:59:59Z",
  redemptions: 3,
  new_clients_only: false,
  active: true,
  status: "RUNNING",
  ...x,
});

const valido = (x: Partial<Formulario> = {}): Formulario => ({
  ...formularioVazio("2026-10-16"),
  nome: "Lançamento",
  valor: "10",
  fim: "2026-10-31",
  ...x,
});

describe("chamadas", () => {
  const spy = jest.spyOn(api, "api").mockResolvedValue({} as never);
  afterAll(() => spy.mockRestore());

  it("cada rota do /admin/campaigns", async () => {
    const r = paraRequest(valido());
    await listarCampanhas();
    await criarCampanha(r);
    await editarCampanha("c1", r);
    await pausarCampanha("c1");
    await retomarCampanha("c1");
    await encerrarCampanha("c1");
    expect(spy.mock.calls).toEqual([
      ["/admin/campaigns"],
      ["/admin/campaigns", { method: "POST", body: r }],
      ["/admin/campaigns/c1", { method: "PUT", body: r }],
      ["/admin/campaigns/c1/pause", { method: "PATCH" }],
      ["/admin/campaigns/c1/resume", { method: "PATCH" }],
      ["/admin/campaigns/c1/end", { method: "PATCH" }],
    ]);
  });
});

describe("numero", () => {
  it("lê vírgula, ponto de milhar e vazio", () => {
    expect(numero("1.234,5")).toBe(1234.5);
    expect(numero(" 10 ")).toBe(10);
    expect(numero("")).toBeNull();
    expect(numero("abc")).toBeNull();
  });
});

describe("validar", () => {
  it("formulário válido não tem erro", () => {
    expect(validar(valido())).toEqual({});
    expect(validar(valido({ beneficio: "taxa-zero", valor: "" }))).toEqual({});
    expect(validar(valido({ limite: "50", codigo: "ABC_1-x" }))).toEqual({});
  });

  it("cada regra", () => {
    expect(validar(valido({ nome: " " })).nome).toBeDefined();
    expect(validar(valido({ nome: "x".repeat(81) })).nome).toBe("Até 80 letras.");
    expect(validar(valido({ descricao: "x".repeat(301) })).descricao).toBeDefined();
    expect(validar(valido({ visibilidade: "PRIVATE" })).codigo).toBe("A campanha privada precisa de cupom.");
    expect(validar(valido({ codigo: "com espaço" })).codigo).toBeDefined();
    expect(validar(valido({ valor: "" })).valor).toBe("Informe o valor.");
    expect(validar(valido({ valor: "0" })).valor).toBe("Informe o valor.");
    expect(validar(valido({ beneficio: "porcento", valor: "101" })).valor).toBe("Até 100%.");
    expect(validar(valido({ modo: "link", beneficio: "taxa-zero", valor: "" })).valor).toBeDefined();
    expect(validar(valido({ modo: "link", valor: "150" })).valor).toBeUndefined();
    expect(validar(valido({ inicio: "16/10" })).inicio).toBeDefined();
    expect(validar(valido({ inicio: "16/10" })).fim).toBeUndefined();
    expect(validar(valido({ fim: "" })).fim).toBeDefined();
    expect(validar(valido({ fim: "2026-10-15" })).fim).toBe("O fim tem de ser depois do início.");
    expect(validar(valido({ limite: "0" })).limite).toBeDefined();
    expect(validar(valido({ limite: "1,5" })).limite).toBeDefined();
  });
});

describe("paraRequest", () => {
  it("cupom em reais, para todos", () => {
    expect(paraRequest(valido({ descricao: " ", dias: ["FRIDAY", "MONDAY"] }))).toEqual({
      name: "Lançamento",
      description: null,
      code: null,
      type: "DISCOUNT",
      visibility: "PUBLIC",
      audience: null,
      value_amount: 10,
      value_percent: null,
      starts_at: "2026-10-16T00:00:00-03:00",
      ends_at: "2026-10-31T23:59:59-03:00",
      weekdays: "MONDAY,FRIDAY",
      max_redemptions: null,
      new_clients_only: false,
    });
  });

  it("cupom em %, privado, com limite e público", () => {
    const r = paraRequest(
      valido({ beneficio: "porcento", valor: "15,5", visibilidade: "PRIVATE", codigo: " X1 ", limite: "50", publico: "CLIENT", descricao: "d", soClientesNovos: true }),
    );
    expect(r).toMatchObject({ value_amount: null, value_percent: 15.5, code: "X1", max_redemptions: 50, audience: "CLIENT", description: "d", new_clients_only: true, weekdays: null });
  });

  it("taxa zero não manda valor; link vira REFERRAL_BONUS em reais", () => {
    expect(paraRequest(valido({ beneficio: "taxa-zero", valor: "9" }))).toMatchObject({ type: "FEE_WAIVER", value_amount: null, value_percent: null });
    expect(paraRequest(valido({ modo: "link", beneficio: "porcento", valor: "5" }))).toMatchObject({ type: "REFERRAL_BONUS", value_amount: 5, value_percent: null });
  });
});

describe("formularioDe", () => {
  it("volta da campanha para o formulário", () => {
    expect(formularioDe(campanha({ weekdays: "MONDAY,TUESDAY", max_redemptions: 50, code: "X", description: "d", audience: "OWNER" }))).toEqual({
      modo: "cupom",
      nome: "Lançamento",
      descricao: "d",
      visibilidade: "PUBLIC",
      codigo: "X",
      publico: "OWNER",
      beneficio: "reais",
      valor: "10",
      inicio: "2026-10-16",
      fim: "2026-10-31",
      dias: ["MONDAY", "TUESDAY"],
      limite: "50",
      soClientesNovos: false,
    });
  });

  it("link, %, taxa zero e sem valor", () => {
    expect(formularioDe(campanha({ type: "REFERRAL_BONUS" })).modo).toBe("link");
    expect(formularioDe(campanha({ value_amount: undefined, value_percent: 12.5 }))).toMatchObject({ beneficio: "porcento", valor: "12,5" });
    expect(formularioDe(campanha({ type: "FEE_WAIVER", value_amount: undefined }))).toMatchObject({ beneficio: "taxa-zero", valor: "" });
  });

  it("diaSP usa o fuso de São Paulo", () => {
    expect(diaSP("2026-10-16T02:59:59Z")).toBe("2026-10-15");
  });
});

describe("leitura", () => {
  it("descreverBeneficio", () => {
    expect(descreverBeneficio(campanha())).toBe("Desconto de R$ 10,00");
    expect(descreverBeneficio(campanha({ value_amount: undefined, value_percent: 7.5 }))).toBe("Desconto de 7,5%");
    expect(descreverBeneficio(campanha({ type: "FEE_WAIVER" }))).toBe("Taxa zero");
    expect(descreverBeneficio(campanha({ type: "REFERRAL_BONUS", value_amount: 5 }))).toBe("Link · R$ 5,00 por corte");
    expect(descreverBeneficio(campanha({ value_amount: undefined }))).toBe("Desconto de R$ 0,00");
  });

  it("ocupacao", () => {
    expect(ocupacao(campanha())).toBeNull();
    expect(ocupacao(campanha({ max_redemptions: 4 }))).toBe(0.75);
    expect(ocupacao(campanha({ max_redemptions: 2 }))).toBe(1);
  });
});
