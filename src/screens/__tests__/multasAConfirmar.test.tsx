import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import * as A from "../../lib/admin";
import { ApiError } from "../../lib/api";
import { MultasAConfirmar } from "../MultasAConfirmar";

jest.mock("../../lib/admin", () => ({
  ...jest.requireActual("../../lib/admin"),
  listarPagamentosDeMulta: jest.fn(),
  confirmarPagamentoDeMulta: jest.fn(),
}));
const m = A as jest.Mocked<typeof A>;

const pag = (id: string, created: string): A.PagamentoDeMulta => ({
  id,
  amount: 12.5,
  status: "PENDING",
  client_id: "c1c1c1c1-0000",
  client_name: "Ana",
  created_at: created,
  expires_at: "2026-10-25T10:00:00-03:00",
});

beforeEach(() => {
  jest.clearAllMocks();
  m.listarPagamentosDeMulta.mockResolvedValue([pag("p2", "2026-10-24T11:00:00-03:00"), pag("p1", "2026-10-24T10:00:00-03:00")]);
});

describe("Multas a confirmar", () => {
  it("lista os pagamentos e pede confirmação antes de confirmar", async () => {
    m.confirmarPagamentoDeMulta.mockResolvedValue(pag("p1", "x"));
    render(<MultasAConfirmar />);
    await waitFor(() => expect(screen.getByTestId("pagamento-p1")).toBeTruthy());
    fireEvent.press(screen.getByTestId("receber-p1"));
    expect(m.confirmarPagamentoDeMulta).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("confirmar-p1"));
    await waitFor(() => expect(m.confirmarPagamentoDeMulta).toHaveBeenCalledWith("p1"));
    await waitFor(() => expect(screen.getByText(/Recebimento confirmado/)).toBeTruthy());
    expect(m.listarPagamentosDeMulta).toHaveBeenCalledTimes(2);
  });

  it("cancelar volta ao botão", async () => {
    render(<MultasAConfirmar />);
    await waitFor(() => expect(screen.getByTestId("receber-p1")).toBeTruthy());
    fireEvent.press(screen.getByTestId("receber-p1"));
    fireEvent.press(screen.getByTestId("cancelar-p1"));
    expect(screen.getByTestId("receber-p1")).toBeTruthy();
  });

  it("pagamento vencido explica em português", async () => {
    m.confirmarPagamentoDeMulta.mockRejectedValue(new ApiError(409, "PENALTY_PAYMENT_EXPIRED", "x"));
    render(<MultasAConfirmar />);
    await waitFor(() => expect(screen.getByTestId("receber-p1")).toBeTruthy());
    fireEvent.press(screen.getByTestId("receber-p1"));
    fireEvent.press(screen.getByTestId("confirmar-p1"));
    await waitFor(() => expect(screen.getByText(/venceu e as multas já foram/)).toBeTruthy());
  });

  it("sem pagamentos mostra o vazio", async () => {
    m.listarPagamentosDeMulta.mockResolvedValue([]);
    render(<MultasAConfirmar />);
    await waitFor(() => expect(screen.getByTestId("vazio")).toBeTruthy());
  });
});
