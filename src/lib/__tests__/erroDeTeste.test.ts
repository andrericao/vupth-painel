import { ApiError } from "../api";
import { erroDeTeste } from "../erroDeTeste";

describe("erroDeTeste", () => {
  it("traduz o que o Backend manda", () => {
    expect(erroDeTeste(new ApiError(409, "TEST_RUN_STORE_NOT_IN_TEST", "x"))).toMatch(/não está mais neste teste/);
    expect(erroDeTeste(new ApiError(403, "ADMIN_PERMISSION_DENIED", "x"))).toMatch(/permissão/);
    expect(erroDeTeste(new ApiError(404, null, "x"))).toBe("Loja ou teste não encontrado.");
    expect(erroDeTeste(new ApiError(500, null, "Erro do servidor"))).toBe("Erro do servidor");
    expect(erroDeTeste(new Error("Sem conexão"))).toBe("Sem conexão");
    expect(erroDeTeste("?")).toBe("Não deu para concluir.");
  });
});
