import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ApiError } from "../../lib/api";
import * as L from "../../lib/lucro";
import type { LinhaLucro, RelatorioLucro } from "../../lib/lucro";
import { Dinheiro, mensagemDoErro } from "../Dinheiro";

jest.mock("../../lib/lucro", () => ({ ...jest.requireActual("../../lib/lucro"), buscarLucro: jest.fn() }));
const buscar = L.buscarLucro as jest.Mock;

const parte = (a: number, f: number, p: number) => ({ amount: a, asaas_fee: f, app_profit: p });
const linha = (x: Partial<LinhaLucro> = {}): LinhaLucro => ({
  key: "2026-10-18",
  attendances: 2,
  service: parte(60, 2, 8),
  penalty: parte(10, 0.5, 4),
  total: parte(70, 2.5, 12),
  ...x,
});
const relatorio = (x: Partial<RelatorioLucro> = {}): RelatorioLucro => ({
  period: { from: "2026-10-01T00:00:00-03:00", to: "2026-10-19T00:00:00-03:00" },
  group_by: "day",
  items: [linha()],
  totals: linha({ key: "total" }),
  services_without_split: 0,
  ...x,
});

beforeEach(() => jest.clearAllMocks());

describe("Dinheiro", () => {
  it("mostra o total e cada dia com corte, multa e lucro", async () => {
    buscar.mockResolvedValue(relatorio());
    render(<Dinheiro hoje="2026-10-18" />);
    expect(screen.getByTestId("carregando")).toBeTruthy();
    expect(await screen.findByText("18/10/2026")).toBeTruthy();
    expect(screen.getByText("Total do período")).toBeTruthy();
    expect(screen.getAllByText("2 atendimentos").length).toBe(2);
    expect(screen.getAllByTestId("parte-Multa").length).toBe(2);
    expect(buscar).toHaveBeenCalledWith("day", "mes", "2026-10-18");
  });

  it("troca o período e o agrupamento e busca de novo; por atendimento mostra o pago em", async () => {
    buscar.mockResolvedValue(relatorio());
    render(<Dinheiro hoje="2026-10-18" />);
    await screen.findByText("18/10/2026");
    fireEvent.press(screen.getByText("7 dias"));
    await waitFor(() => expect(buscar).toHaveBeenLastCalledWith("day", "7dias", "2026-10-18"));
    buscar.mockResolvedValue(
      relatorio({
        group_by: "attendance",
        items: [linha({ key: "abcdef12-0000", attendance_id: "abcdef12-0000", attendances: 1, paid_at: "2026-10-18T15:00:00Z" })],
      }),
    );
    fireEvent.press(screen.getByText("Por atendimento"));
    expect(await screen.findByText("#abcdef12")).toBeTruthy();
    expect(screen.getByText(/Pago em 18\/10\/2026/)).toBeTruthy();
    expect(screen.getByText("1 atendimento")).toBeTruthy();
    expect(screen.getByText("2 atendimentos")).toBeTruthy();
  });

  it("avisa dos cortes antigos sem divisão e do período vazio", async () => {
    buscar.mockResolvedValue(relatorio({ items: [], services_without_split: 3 }));
    render(<Dinheiro hoje="2026-10-18" />);
    expect(await screen.findByTestId("vazio")).toBeTruthy();
    expect(screen.getByText(/3 corte\(s\) antigos sem a divisão/)).toBeTruthy();
  });

  it("erro aparece e tentar de novo busca outra vez; 403 explica a permissão", async () => {
    buscar.mockRejectedValueOnce(new ApiError(403, "ADMIN_PERMISSION_DENIED", "negado"));
    render(<Dinheiro hoje="2026-10-18" />);
    expect(await screen.findByText(/permissão de Financeiro/)).toBeTruthy();
    buscar.mockResolvedValue(relatorio());
    fireEvent.press(screen.getByTestId("tentar"));
    expect(await screen.findByText("18/10/2026")).toBeTruthy();
    expect(mensagemDoErro(new Error("fora do ar"))).toBe("fora do ar");
    expect(mensagemDoErro("x")).toBe("Não deu para carregar.");
  });
});
