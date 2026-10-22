import * as api from "../api";
import {
  lerAlertas,
  lerFinanceiro,
  lerOverview,
  lerSerie,
  listarAuditoria,
  listarLojas,
  listarUsuarios,
  podeVer,
  variacao,
} from "../admin";
import { guardarPermissoes, lerSessao, salvarSessao } from "../session";

jest.mock("../api");
const chamar = api.api as jest.Mock;

describe("admin", () => {
  beforeEach(() => chamar.mockResolvedValue({}));

  it("monta as consultas de leitura", async () => {
    await lerOverview();
    expect(chamar).toHaveBeenLastCalledWith("/admin/overview");
    await lerSerie("cuts", "hour");
    expect(chamar).toHaveBeenLastCalledWith("/admin/series?metric=cuts&granularity=hour");
    await lerFinanceiro();
    expect(chamar).toHaveBeenLastCalledWith("/admin/finance");
    await lerFinanceiro("a", "b");
    expect(chamar).toHaveBeenLastCalledWith("/admin/finance?from=a&to=b");
    await lerAlertas(72);
    expect(chamar).toHaveBeenLastCalledWith("/admin/alerts?hours=72");
    await listarUsuarios(" ana ", 2);
    expect(chamar).toHaveBeenLastCalledWith("/admin/users?q=ana&page=2&size=20");
    await listarLojas("", 0);
    expect(chamar).toHaveBeenLastCalledWith("/admin/establishments?page=0&size=20");
    await listarAuditoria(1);
    expect(chamar).toHaveBeenLastCalledWith("/admin/audit?page=1&size=20");
  });

  it("variacao: igual, mais e menos", () => {
    expect(variacao(3, 3)).toBe("igual");
    expect(variacao(5, 3)).toBe("+2");
    expect(variacao(1, 3)).toBe("−2");
    expect(variacao(10.5, 10)).toBe("+0,5");
  });

  it("podeVer: sem lista vê tudo; com lista, só a permissão da tela", () => {
    expect(podeVer("/usuarios")).toBe(true);
    expect(podeVer("/usuarios", ["OVERVIEW"])).toBe(false);
    expect(podeVer("/", ["OVERVIEW"])).toBe(true);
    expect(podeVer("/desconhecida", [])).toBe(true);
  });

  it("guarda as permissões na sessão", () => {
    guardarPermissoes(["X"]);
    expect(lerSessao()).toBeNull();
    salvarSessao({ accessToken: "t", refreshToken: "r", nome: "A", email: "a@x.com" });
    guardarPermissoes(["OVERVIEW", "USERS"]);
    expect(lerSessao()?.permissoes).toEqual(["OVERVIEW", "USERS"]);
  });
});
