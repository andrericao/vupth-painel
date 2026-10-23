import * as api from "../api";
import {
  criarCampanha,
  avisoBeneficio,
  descreverBeneficio,
  descreverBonificacao,
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
  fim: "31/10/2026",
  ...x,
});

const link = (x: Partial<Formulario> = {}): Formulario =>
  valido({ modo: "link", valor: "5", pctProfissional: "60", pctDono: "40", quemConta: "ANY_PROFESSIONAL", pagamento: "WEEKLY", diaPagamento: "1", ...x });

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
    expect(validar(link({ beneficio: "taxa-zero", valor: "" })).valor).toBeDefined();
    expect(validar(link({ valor: "150" })).valor).toBeUndefined();
    expect(validar(valido({ inicio: "16/10" })).inicio).toBeDefined();
    expect(validar(valido({ inicio: "16/10" })).fim).toBeUndefined();
    expect(validar(valido({ fim: "" })).fim).toBeDefined();
    expect(validar(valido({ fim: "15/10/2026" })).fim).toBe("O fim tem de ser depois do início.");
    expect(validar(valido({ limite: "0" })).limite).toBeDefined();
    expect(validar(valido({ limite: "1,5" })).limite).toBeDefined();
  });
});

describe("bonificação (DEC-73)", () => {
  it("link completo passa; cupom ignora os campos", () => {
    expect(validar(link())).toEqual({});
    expect(validar(link({ pagamento: "MONTHLY", diaPagamento: "28" }))).toEqual({});
    expect(validar(link({ pctProfissional: "33,33", pctDono: "66,67" }))).toEqual({});
    expect(validar(valido({ pctProfissional: "x" }))).toEqual({});
  });

  it("cada regra do Backend", () => {
    const vazio = validar(link({ pctProfissional: "", pctDono: "", quemConta: "", pagamento: "", diaPagamento: "" }));
    expect(Object.keys(vazio).sort()).toEqual(["pagamento", "pctDono", "pctProfissional", "quemConta"]);
    expect(validar(link({ pctProfissional: "101" })).pctProfissional).toBe("De 0 a 100.");
    expect(validar(link({ pctDono: "-1" })).pctDono).toBe("De 0 a 100.");
    expect(validar(link({ pctDono: "50" })).pctDono).toBe("O profissional e o dono somam 100%.");
    expect(validar(link({ diaPagamento: "8" })).diaPagamento).toBe("Escolha o dia da semana.");
    expect(validar(link({ diaPagamento: "" })).diaPagamento).toBe("Escolha o dia da semana.");
    expect(validar(link({ pagamento: "MONTHLY", diaPagamento: "29" })).diaPagamento).toBe("Um dia de 1 a 28.");
    expect(validar(link({ pagamento: "MONTHLY", diaPagamento: "1,5" })).diaPagamento).toBeDefined();
    expect(validar(link({ pagamento: "MONTHLY", diaPagamento: "0" })).diaPagamento).toBeDefined();
  });

  it("paraRequest manda os 5 campos só na indicação", () => {
    expect(paraRequest(link())).toMatchObject({
      type: "REFERRAL_BONUS",
      referral_professional_percent: 60,
      referral_owner_percent: 40,
      referral_scope: "ANY_PROFESSIONAL",
      payout_period: "WEEKLY",
      payout_day: 1,
    });
    expect(paraRequest(link({ quemConta: "", pagamento: "", diaPagamento: "" }))).toMatchObject({
      referral_scope: null,
      payout_period: null,
      payout_day: null,
    });
    expect(paraRequest(valido({ pctProfissional: "60", quemConta: "ANY_PROFESSIONAL", pagamento: "WEEKLY", diaPagamento: "1" }))).toMatchObject({
      referral_professional_percent: null,
      referral_scope: null,
      payout_period: null,
      payout_day: null,
    });
  });

  it("formularioDe traz a bonificação de volta", () => {
    expect(
      formularioDe(
        campanha({ type: "REFERRAL_BONUS", referral_professional_percent: 60.5, referral_owner_percent: 39.5, referral_scope: "REFERRER_ESTABLISHMENT", payout_period: "MONTHLY", payout_day: 5 }),
      ),
    ).toMatchObject({ pctProfissional: "60,5", pctDono: "39,5", quemConta: "REFERRER_ESTABLISHMENT", pagamento: "MONTHLY", diaPagamento: "5" });
    expect(formularioDe(campanha())).toMatchObject({ pctProfissional: "", quemConta: "", pagamento: "", diaPagamento: "" });
  });

  it("descreverBonificacao", () => {
    const base = campanha({ type: "REFERRAL_BONUS", referral_professional_percent: 60, referral_owner_percent: 40, referral_scope: "ANY_PROFESSIONAL", payout_period: "WEEKLY", payout_day: 3 });
    expect(descreverBonificacao(base)).toBe("Profissional 60% · dono 40% · qualquer profissional · toda quarta");
    expect(descreverBonificacao({ ...base, payout_period: "MONTHLY", payout_day: 5, referral_scope: undefined })).toBe("Profissional 60% · dono 40% · todo dia 5 do mês");
    expect(descreverBonificacao({ ...base, payout_day: undefined })).toMatch(/toda segunda$/);
    expect(descreverBonificacao(campanha())).toBeNull();
    expect(descreverBonificacao(campanha({ type: "REFERRAL_BONUS" }))).toBeNull();
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
      benefit_base: "WITH_FEE",
      referral_professional_percent: null,
      referral_owner_percent: null,
      referral_scope: null,
      payout_period: null,
      payout_day: null,
    });
  });

  it("a base do valor (com ou sem taxa) vai só no desconto", () => {
    expect(paraRequest(valido({ baseDoValor: "WITHOUT_FEE" })).benefit_base).toBe("WITHOUT_FEE");
    expect(paraRequest(valido({ beneficio: "taxa-zero", baseDoValor: "WITHOUT_FEE" })).benefit_base).toBeNull();
    expect(paraRequest(link()).benefit_base).toBeNull();
  });

  it("cupom em %, privado, com limite e público", () => {
    const r = paraRequest(
      valido({ beneficio: "porcento", valor: "15,5", visibilidade: "PRIVATE", codigo: " X1 ", limite: "50", publico: "CLIENT", descricao: "d", soClientesNovos: true }),
    );
    expect(r).toMatchObject({ value_amount: null, value_percent: 15.5, code: "X1", max_redemptions: 50, audience: "CLIENT", description: "d", new_clients_only: true, weekdays: null });
  });

  it("taxa zero não manda valor; link vira REFERRAL_BONUS em reais", () => {
    expect(paraRequest(valido({ beneficio: "taxa-zero", valor: "9" }))).toMatchObject({ type: "FEE_WAIVER", value_amount: null, value_percent: null });
    expect(paraRequest(link({ beneficio: "porcento" }))).toMatchObject({ type: "REFERRAL_BONUS", value_amount: 5, value_percent: null });
  });
});

describe("formularioDe", () => {
  it("a base do valor volta da campanha", () => {
    expect(formularioDe(campanha({ benefit_base: "WITHOUT_FEE" })).baseDoValor).toBe("WITHOUT_FEE");
  });

  it("volta da campanha para o formulário", () => {
    expect(formularioDe(campanha({ weekdays: "MONDAY,TUESDAY", max_redemptions: 50, code: "X", description: "d", audience: "OWNER" }))).toEqual({
      modo: "cupom",
      nome: "Lançamento",
      descricao: "d",
      visibilidade: "PUBLIC",
      codigo: "X",
      publico: "OWNER",
      beneficio: "reais",
      baseDoValor: "WITH_FEE",
      valor: "10,00",
      inicio: "16/10/2026",
      fim: "31/10/2026",
      dias: ["MONDAY", "TUESDAY"],
      limite: "50",
      soClientesNovos: false,
      pctProfissional: "",
      pctDono: "",
      quemConta: "",
      pagamento: "",
      diaPagamento: "",
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
  it("avisoBeneficio diz dinheiro no link e desconto no cupom", () => {
    expect(avisoBeneficio("link")).toMatch(/dinheiro/);
    expect(avisoBeneficio("cupom")).toMatch(/desconto/);
  });

  it("descreverBeneficio", () => {
    expect(descreverBeneficio(campanha())).toBe("Desconto de R$ 10,00");
    expect(descreverBeneficio(campanha({ value_amount: undefined, value_percent: 7.5 }))).toBe("Desconto de 7,5%");
    expect(descreverBeneficio(campanha({ type: "FEE_WAIVER" }))).toBe("Taxa zero");
    expect(descreverBeneficio(campanha({ type: "REFERRAL_BONUS", value_amount: 5 }))).toBe("Dinheiro · R$ 5,00 por corte");
    expect(descreverBeneficio(campanha({ value_amount: undefined }))).toBe("Desconto de R$ 0,00");
  });

  it("ocupacao", () => {
    expect(ocupacao(campanha())).toBeNull();
    expect(ocupacao(campanha({ max_redemptions: 4 }))).toBe(0.75);
    expect(ocupacao(campanha({ max_redemptions: 2 }))).toBe(1);
  });
});
