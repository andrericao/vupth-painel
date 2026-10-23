import * as api from "../api";
import { buscarLucro, intervaloDe, rotuloDaLinha, type LinhaLucro } from "../lucro";

jest.mock("../api");
const chamar = api.api as jest.Mock;

const p = { amount: 0, asaas_fee: 0, app_profit: 0 };
const linha = (key: string): LinhaLucro => ({ key, attendances: 1, service: p, penalty: p, total: p });

describe("lucro", () => {
  it("intervaloDe: hoje sem datas; 7 dias e mês com o fuso da loja", () => {
    expect(intervaloDe("hoje", "2026-10-18")).toEqual({});
    expect(intervaloDe("7dias", "2026-10-18")).toEqual({
      from: "2026-10-12T00:00:00-03:00",
      to: "2026-10-19T00:00:00-03:00",
    });
    expect(intervaloDe("mes", "2026-10-31")).toEqual({
      from: "2026-10-01T00:00:00-03:00",
      to: "2026-11-01T00:00:00-03:00",
    });
  });

  it("buscarLucro monta a consulta", async () => {
    chamar.mockResolvedValue({});
    await buscarLucro("day", "hoje", "2026-10-18");
    expect(chamar).toHaveBeenLastCalledWith("/admin/finance/cuts-and-penalties?group_by=day");
    await buscarLucro("month", "mes", "2026-10-18");
    const url = chamar.mock.calls.at(-1)[0] as string;
    expect(url).toContain("group_by=month");
    expect(url).toContain("from=2026-10-01T00%3A00%3A00-03%3A00");
  });

  it("rotuloDaLinha", () => {
    expect(rotuloDaLinha(linha("2026-10-18"), "day")).toBe("18/10/2026");
    expect(rotuloDaLinha(linha("2026-10"), "month")).toBe("10/2026");
    expect(rotuloDaLinha(linha("abcdef1234"), "attendance")).toBe("#abcdef12");
  });
});
