import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import * as C from "../../lib/contas";
import { Contas } from "../Contas";

jest.mock("../../lib/contas", () => ({ ...jest.requireActual("../../lib/contas"), listarContas: jest.fn(), lerTotais: jest.fn() }));
const m = C as jest.Mocked<typeof C>;

const totais = (account: string, x: number): C.TotaisDaConta => ({
  account,
  attendances: x,
  pix_payments: x,
  other_payments: 0,
  list_total: x,
  coupon_discount: 0,
  entries: x,
  fees: 1.99,
  net: x - 1.99,
  professional_part: 0,
  app_part: x,
  bonus: 0,
  leftover: 0,
  balance: x,
  services_without_split: 0,
});
const contas: C.Conta[] = [
  { id: "1", key: "ASAAS", name: "Asaas", provider: "ASAAS", pix_fee: 1.99, active: true, connected: true, mode: "SANDBOX" },
  { id: "2", key: "PJ", name: "Conta PJ", provider: "MANUAL", pix_fee: 0, active: true },
];

beforeEach(() => {
  jest.clearAllMocks();
  m.listarContas.mockResolvedValue(contas);
  m.lerTotais.mockImplementation(async (conta) => ({
    period: {},
    account: conta,
    totals: totais(conta, 10),
    by_account: conta === "all" ? [totais("ASAAS", 4), totais("PJ", 6)] : undefined,
  }));
});

describe("Contas", () => {
  it("abre na aba Totais, com uma aba por conta e o resumo por conta", async () => {
    render(<Contas hoje="2026-10-24" />);
    await waitFor(() => expect(screen.getByTestId("aba-ASAAS")).toBeTruthy());
    expect(screen.getByTestId("aba-all").props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId("aba-PJ")).toBeTruthy();
    expect(m.lerTotais).toHaveBeenCalledWith("all", "mes", "2026-10-24");
    await waitFor(() => expect(screen.getByTestId("conta-ASAAS")).toBeTruthy());
    expect(screen.getByTestId("conta-PJ")).toBeTruthy();
    expect(screen.queryByTestId("dados-da-conta")).toBeNull();
  });

  it("a aba de uma conta busca só ela e mostra a tarifa e a conexão", async () => {
    render(<Contas hoje="2026-10-24" />);
    await waitFor(() => expect(screen.getByTestId("aba-ASAAS")).toBeTruthy());
    fireEvent.press(screen.getByTestId("aba-ASAAS"));
    await waitFor(() => expect(m.lerTotais).toHaveBeenCalledWith("ASAAS", "mes", "2026-10-24"));
    await waitFor(() => expect(screen.getByTestId("dados-da-conta")).toBeTruthy());
    expect(screen.getByText(/Conectada · teste \(sandbox\)/)).toBeTruthy();
    expect(screen.queryByTestId("conta-PJ")).toBeNull();
  });

  it("a conta PJ mostra Pix a R$ 0,00 e o resumo leva à aba da conta", async () => {
    render(<Contas hoje="2026-10-24" />);
    await waitFor(() => expect(screen.getByTestId("conta-PJ")).toBeTruthy());
    fireEvent.press(screen.getByTestId("conta-PJ"));
    await waitFor(() => expect(screen.getByTestId("dados-da-conta")).toBeTruthy());
    expect(screen.getByText(/Pix: R\$\s?0,00/)).toBeTruthy();
  });

  it("troca o período e avisa serviços sem divisão", async () => {
    m.lerTotais.mockResolvedValue({ period: {}, account: "all", totals: { ...totais("all", 3), services_without_split: 2 } });
    render(<Contas hoje="2026-10-24" />);
    await waitFor(() => expect(screen.getByTestId("sem-divisao")).toBeTruthy());
    fireEvent.press(screen.getByTestId("periodo-7dias"));
    await waitFor(() => expect(m.lerTotais).toHaveBeenCalledWith("all", "7dias", "2026-10-24"));
  });

  it("erro de leitura mostra o aviso", async () => {
    m.listarContas.mockRejectedValue(new Error("falhou"));
    render(<Contas hoje="2026-10-24" />);
    await waitFor(() => expect(screen.getByText("falhou")).toBeTruthy());
  });
});
