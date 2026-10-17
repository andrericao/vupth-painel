import {
  aceitarConvite,
  alternar,
  cancelarConvite,
  convidar,
  listarConvites,
  listarUsuariosDoPainel,
  mensagemDeAcesso,
  mudarPermissoes,
  revogarAcesso,
  validarConvite,
} from "../acessos";

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => "[]" } as Response);
  global.fetch = fetchMock;
  sessionStorage.clear();
});

const chamada = () => ({ url: fetchMock.mock.calls[0][0] as string, ...fetchMock.mock.calls[0][1] });

describe("acessos", () => {
  it("alternar liga e desliga, na ordem do contrato", () => {
    expect(alternar([], "AUDIT")).toEqual(["AUDIT"]);
    expect(alternar(["AUDIT"], "USERS")).toEqual(["USERS", "AUDIT"]);
    expect(alternar(["USERS", "AUDIT"], "USERS")).toEqual(["AUDIT"]);
  });

  it("validarConvite: e-mail e pelo menos uma tela", () => {
    expect(validarConvite("x", [])).toEqual({ email: "Digite um e-mail válido.", permissoes: "Marque pelo menos uma tela." });
    expect(validarConvite(" a@b.co ", ["USERS"])).toEqual({ email: undefined, permissoes: undefined });
  });

  it("mensagemDeAcesso traduz os códigos e deixa o resto", () => {
    for (const c of [
      "ADMIN_PERMISSION_DENIED",
      "ADMIN_ALREADY_MEMBER",
      "ADMIN_PERMISSIONS_REQUIRED",
      "ADMIN_OWNER_PROTECTED",
      "ADMIN_SELF_CHANGE",
      "ADMIN_INVITATION_INVALID",
    ])
      expect(mensagemDeAcesso(c, "padrão")).not.toBe("padrão");
    expect(mensagemDeAcesso(null, "padrão")).toBe("padrão");
  });

  it("chama os endpoints do contrato", async () => {
    await listarConvites();
    expect(chamada().url).toMatch(/\/admin\/invitations$/);
    fetchMock.mockClear();
    await convidar(" a@b.co ", ["USERS"]);
    expect(chamada()).toMatchObject({ method: "POST", body: JSON.stringify({ email: "a@b.co", permissions: ["USERS"] }) });
    fetchMock.mockClear();
    await cancelarConvite("i1");
    expect(chamada()).toMatchObject({ method: "DELETE" });
    expect(chamada().url).toMatch(/\/admin\/invitations\/i1$/);
    fetchMock.mockClear();
    await listarUsuariosDoPainel();
    expect(chamada().url).toMatch(/\/admin\/users-admin$/);
    fetchMock.mockClear();
    await mudarPermissoes("u1", ["AUDIT"]);
    expect(chamada()).toMatchObject({ method: "PATCH", body: JSON.stringify({ permissions: ["AUDIT"] }) });
    fetchMock.mockClear();
    await revogarAcesso("u1");
    expect(chamada()).toMatchObject({ method: "DELETE" });
    fetchMock.mockClear();
    await aceitarConvite("tok", "senha1");
    expect(chamada()).toMatchObject({ method: "POST", body: JSON.stringify({ token: "tok", password: "senha1" }) });
  });
});
