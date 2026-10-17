import { api, ApiError } from "../api";
import {
  concluirEntrada,
  confirmarConfiguracao,
  ehAdmin,
  entrar,
  etapaDoSegundoFator,
  iniciarConfiguracao,
  sair,
  verificarCodigo,
} from "../auth";
import { apiBaseUrl, API_URLS, SESSAO_MS } from "../config";
import { dataCurta, dataHora, dinheiro, hojeSP } from "../format";
import { lerSessao, liberarSessao, limparSessao, salvarSessao, trocarToken } from "../session";

function resposta(status: number, corpo?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (corpo === undefined ? "" : typeof corpo === "string" ? corpo : JSON.stringify(corpo)),
  } as Response;
}

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
  sessionStorage.clear();
});

describe("config", () => {
  it("staging é o padrão, e um nome que não existe também cai nele", () => {
    expect(apiBaseUrl(undefined)).toBe(API_URLS.staging);
    expect(apiBaseUrl("xyz")).toBe(API_URLS.staging);
    expect(apiBaseUrl("prod")).toBe(API_URLS.prod);
    expect(apiBaseUrl()).toBe(API_URLS.staging);
  });
});

describe("session", () => {
  const base = { accessToken: "a", refreshToken: "r", nome: "André", email: "a@b.c" };

  it("guarda por 15 minutos e expira", () => {
    salvarSessao(base, 1000);
    expect(lerSessao(1000 + SESSAO_MS - 1)?.nome).toBe("André");
    expect(lerSessao(1000 + SESSAO_MS)).toBeNull();
    expect(sessionStorage.getItem("vupth-painel:sessao")).toBeNull();
  });

  it("sem sessão, ou com lixo, é null e limpa", () => {
    expect(lerSessao()).toBeNull();
    sessionStorage.setItem("vupth-painel:sessao", "{lixo");
    expect(lerSessao()).toBeNull();
    expect(sessionStorage.getItem("vupth-painel:sessao")).toBeNull();
    sessionStorage.setItem("vupth-painel:sessao", JSON.stringify({ expiraEm: Date.now() + 9999 }));
    expect(lerSessao()).toBeNull();
  });

  it("limparSessao apaga", () => {
    salvarSessao(base);
    limparSessao();
    expect(lerSessao()).toBeNull();
  });

  it("sem sessionStorage (acesso negado), não quebra", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage")!;
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      get() {
        throw new Error("negado");
      },
    });
    expect(() => salvarSessao(base)).not.toThrow();
    expect(lerSessao()).toBeNull();
    Object.defineProperty(globalThis, "sessionStorage", original);
  });

  it("sessionStorage ausente também não quebra", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage")!;
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: undefined });
    expect(lerSessao()).toBeNull();
    Object.defineProperty(globalThis, "sessionStorage", original);
  });
});

describe("api", () => {
  it("manda o token, o corpo em JSON e devolve o JSON", async () => {
    salvarSessao({ accessToken: "tok", refreshToken: "r", nome: "n", email: "e" });
    fetchMock.mockResolvedValue(resposta(200, { ok: 1 }));
    await expect(api("/x", { method: "POST", body: { a: 1 } })).resolves.toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URLS.staging}/x`);
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe('{"a":1}');
  });

  it("sem sessão não manda token; sem corpo e resposta vazia dá null", async () => {
    fetchMock.mockResolvedValue(resposta(204));
    await expect(api("/x")).resolves.toBeNull();
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it("auth: false não lê a sessão", async () => {
    salvarSessao({ accessToken: "tok", refreshToken: "r", nome: "n", email: "e" });
    fetchMock.mockResolvedValue(resposta(200, "não é json"));
    await expect(api("/x", { auth: false })).resolves.toBeNull();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it("erro com code e message do Backend", async () => {
    fetchMock.mockResolvedValue(resposta(422, { code: "CAMPAIGN_INVALID", message: "O fim tem de ser depois do inicio." }));
    const e = await api("/x").catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 422, code: "CAMPAIGN_INVALID", message: "O fim tem de ser depois do inicio." });
  });

  it("401 limpa a sessão e usa a mensagem padrão", async () => {
    salvarSessao({ accessToken: "tok", refreshToken: "r", nome: "n", email: "e" });
    fetchMock.mockResolvedValue(resposta(401));
    const e = await api("/x").catch((x) => x);
    expect(e).toMatchObject({ status: 401, code: null, message: "Sua sessão acabou. Entre de novo." });
    expect(lerSessao()).toBeNull();
  });

  it("401 sem auth não mexe na sessão", async () => {
    salvarSessao({ accessToken: "tok", refreshToken: "r", nome: "n", email: "e" });
    fetchMock.mockResolvedValue(resposta(401, { code: 7 }));
    await api("/x", { auth: false }).catch(() => null);
    expect(lerSessao()).not.toBeNull();
  });

  it("status sem mensagem conhecida", async () => {
    fetchMock.mockResolvedValue(resposta(500, { message: "" }));
    await expect(api("/x")).rejects.toThrow("Erro 500 no servidor.");
  });

  it("sem rede", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api("/x")).rejects.toMatchObject({ status: 0 });
  });
});

describe("auth", () => {
  const ok = (roles: { role_type: string; is_active: boolean | null }[], extra = {}) => ({
    user: { first_name: "André", last_name: "R", email: "a@b.c", user_roles: roles, ...extra },
    tokens: { access_token: "A", refresh_token: "R" },
  });

  it("ehAdmin só com ADMIN ativo (null conta como ativo)", () => {
    expect(ehAdmin(ok([{ role_type: "ADMIN", is_active: true }]))).toBe(true);
    expect(ehAdmin(ok([{ role_type: "ADMIN", is_active: null }]))).toBe(true);
    expect(ehAdmin(ok([{ role_type: "ADMIN", is_active: false }]))).toBe(false);
    expect(ehAdmin(ok([{ role_type: "CLIENT", is_active: true }]))).toBe(false);
    expect(ehAdmin({ user: null, tokens: null })).toBe(false);
    expect(ehAdmin({ user: {}, tokens: null })).toBe(false);
  });

  it("entrar guarda a sessão do admin", async () => {
    fetchMock.mockResolvedValue(resposta(200, ok([{ role_type: "ADMIN", is_active: true }])));
    const s = await entrar(" a@b.c ", "x");
    expect(s).toMatchObject({ accessToken: "A", refreshToken: "R", nome: "André R", email: "a@b.c" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: "a@b.c", password: "x" });
    sair();
    expect(lerSessao()).toBeNull();
  });

  it("sem nome nem e-mail na resposta, usa o e-mail digitado", async () => {
    fetchMock.mockResolvedValue(
      resposta(200, ok([{ role_type: "ADMIN", is_active: true }], { first_name: undefined, last_name: undefined, email: undefined })),
    );
    await expect(entrar("z@b.c", "x")).resolves.toMatchObject({ nome: "z@b.c", email: "z@b.c" });
  });

  it("conta que não é admin, ou sem token, é recusada", async () => {
    fetchMock.mockResolvedValue(resposta(200, ok([{ role_type: "CLIENT", is_active: true }])));
    await expect(entrar("a@b.c", "x")).rejects.toMatchObject({ code: "NOT_ADMIN" });
    fetchMock.mockResolvedValue(resposta(200, { user: null, tokens: null }));
    await expect(entrar("a@b.c", "x")).rejects.toMatchObject({ code: "NOT_ADMIN" });
    fetchMock.mockResolvedValue(resposta(200));
    await expect(entrar("a@b.c", "x")).rejects.toMatchObject({ code: "NOT_ADMIN" });
    expect(lerSessao()).toBeNull();
  });
});

describe("segundo fator", () => {
  const admin = { user: { user_roles: [{ role_type: "ADMIN", is_active: true }] }, tokens: { access_token: "A", refresh_token: "R" } };
  async function logado() {
    fetchMock.mockResolvedValueOnce(resposta(200, admin));
    await entrar("a@b.c", "x");
  }

  it("a sessão da senha nasce pendente; status verified libera", async () => {
    await logado();
    expect(lerSessao()?.pendente).toBe(true);
    fetchMock.mockResolvedValueOnce(resposta(200, { totp_enabled: false, verified: true }));
    await expect(etapaDoSegundoFator()).resolves.toBe("pronto");
    expect(lerSessao()?.pendente).toBeUndefined();
  });

  it("fator desligado: o status vem sem verified, mas a rota do painel abre", async () => {
    await logado();
    fetchMock
      .mockResolvedValueOnce(resposta(200, { totp_enabled: false, verified: false }))
      .mockResolvedValueOnce(resposta(200, []));
    await expect(etapaDoSegundoFator()).resolves.toBe("pronto");
    expect(lerSessao()?.pendente).toBeUndefined();
  });

  it("sem a permissão da rota (403) o token vale: abre", async () => {
    await logado();
    fetchMock
      .mockResolvedValueOnce(resposta(200, { totp_enabled: false, verified: false }))
      .mockResolvedValueOnce(resposta(403, { code: "ADMIN_PERMISSION_DENIED" }));
    await expect(etapaDoSegundoFator()).resolves.toBe("pronto");
  });

  it("401 ADMIN_TOTP_REQUIRED decide entre cadastrar e pedir o código, sem derrubar a sessão", async () => {
    await logado();
    const exige = resposta(401, { code: "ADMIN_TOTP_REQUIRED" });
    fetchMock
      .mockResolvedValueOnce(resposta(200, { totp_enabled: false, verified: false }))
      .mockResolvedValueOnce(exige);
    await expect(etapaDoSegundoFator()).resolves.toBe("configurar");
    fetchMock
      .mockResolvedValueOnce(resposta(200, { totp_enabled: true, verified: false }))
      .mockResolvedValueOnce(exige);
    await expect(etapaDoSegundoFator()).resolves.toBe("codigo");
    expect(lerSessao()?.pendente).toBe(true);
  });

  it("outro erro na sondagem sobe", async () => {
    await logado();
    fetchMock
      .mockResolvedValueOnce(resposta(200, { totp_enabled: false, verified: false }))
      .mockResolvedValueOnce(resposta(500, {}));
    await expect(etapaDoSegundoFator()).rejects.toMatchObject({ status: 500 });
  });

  it("setup, confirmação (token do painel + códigos) e conclusão", async () => {
    await logado();
    fetchMock.mockResolvedValueOnce(resposta(200, { secret: "S", otpauth_uri: "otpauth://x" }));
    await expect(iniciarConfiguracao()).resolves.toEqual({ secret: "S", otpauth_uri: "otpauth://x" });
    fetchMock.mockResolvedValueOnce(resposta(200, { access_token: "P", expires_in: 900, recovery_codes: ["a", "b"] }));
    await expect(confirmarConfiguracao(" 123456 ")).resolves.toEqual(["a", "b"]);
    expect(JSON.parse(fetchMock.mock.calls.at(-1)[1].body)).toEqual({ code: "123456" });
    expect(lerSessao()).toMatchObject({ accessToken: "P", pendente: true });
    concluirEntrada();
    expect(lerSessao()?.pendente).toBeUndefined();
  });

  it("verificar troca o token e libera; código errado não derruba a sessão", async () => {
    await logado();
    fetchMock.mockResolvedValueOnce(resposta(401, { code: "ADMIN_TOTP_INVALID", message: "errado" }));
    await expect(verificarCodigo("000000")).rejects.toMatchObject({ code: "ADMIN_TOTP_INVALID" });
    expect(lerSessao()?.accessToken).toBe("A");
    fetchMock.mockResolvedValueOnce(resposta(200, { access_token: "P", expires_in: 900 }));
    await verificarCodigo("ABCDE-FGHJK");
    expect(lerSessao()).toMatchObject({ accessToken: "P" });
    expect(lerSessao()?.pendente).toBeUndefined();
  });

  it("sem sessão, trocar o token e liberar não fazem nada", () => {
    trocarToken("P", 900, true);
    liberarSessao();
    expect(lerSessao()).toBeNull();
  });
});

describe("format", () => {
  it("dinheiro, datas e hoje em São Paulo", () => {
    expect(dinheiro(12.5).replace(/\s/g, " ")).toBe("R$ 12,50");
    expect(dataCurta("2026-10-16T02:00:00Z")).toBe("15/10");
    expect(dataHora("2026-10-16T12:05:00Z")).toBe("16/10/2026, 09:05");
    expect(hojeSP(new Date("2026-10-16T02:00:00Z"))).toBe("2026-10-15");
    expect(hojeSP()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
