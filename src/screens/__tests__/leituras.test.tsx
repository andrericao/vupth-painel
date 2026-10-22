import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ApiError } from "../../lib/api";
import * as A from "../../lib/admin";
import * as L from "../../lib/lucro";
import { Alertas } from "../Alertas";
import { Dinheiro } from "../Dinheiro";
import { Hoje } from "../Hoje";
import { Auditoria, Estabelecimentos, Usuarios } from "../Listas";

jest.mock("../../lib/admin", () => ({
  ...jest.requireActual("../../lib/admin"),
  lerOverview: jest.fn(),
  lerSerie: jest.fn(),
  lerFinanceiro: jest.fn(),
  lerAlertas: jest.fn(),
  listarUsuarios: jest.fn(),
  listarLojas: jest.fn(),
  listarAuditoria: jest.fn(),
}));
jest.mock("../../lib/lucro", () => ({ ...jest.requireActual("../../lib/lucro"), buscarLucro: jest.fn() }));
const m = A as jest.Mocked<typeof A>;

const funil = (x: number) => ({ signups: x, attendances_created: x, finished: x, cancelled: x, removed: x, late: x });
const din = (x: number) => ({
  gross_revenue: x,
  professionals_net: x,
  gateway_fee: x,
  app_fee: x,
  pending_amount: x,
  awaiting_amount: x,
  paid_amount: x,
  penalties_generated: x,
  penalties_charged: x,
});
const janela = { from: "2026-10-22T00:00:00-03:00", to: "2026-10-22T12:00:00-03:00" };
const pagina = <T,>(items: T[], total = items.length) => ({ items, page: 0, size: 20, total });

beforeEach(() => {
  jest.clearAllMocks();
  (L.buscarLucro as jest.Mock).mockResolvedValue({
    period: janela,
    group_by: "day",
    items: [],
    totals: { key: "total", attendances: 0, service: { amount: 0, asaas_fee: 0, app_profit: 0 }, penalty: { amount: 0, asaas_fee: 0, app_profit: 0 }, total: { amount: 0, asaas_fee: 0, app_profit: 0 } },
    services_without_split: 0,
  });
});

describe("Hoje", () => {
  it("mostra os números com a diferença contra a semana passada e a série por hora", async () => {
    m.lerOverview.mockResolvedValue({
      period: janela,
      compare_period: janela,
      health: { open_stores: 4, professionals_working: 7, active_attendances: 2 },
      funnel: funil(5),
      funnel_compare: funil(3),
      money: din(100),
      money_compare: din(100),
    });
    m.lerSerie.mockResolvedValue({
      metric: "cuts",
      granularity: "hour",
      points: [
        { at: "2026-10-22T09:00:00", value: 2 },
        { at: "2026-10-22T10:00:00", value: 4 },
      ],
    });
    render(<Hoje />);
    expect(screen.getByTestId("carregando")).toBeTruthy();
    expect(await screen.findByTestId("numero-Lojas abertas agora")).toBeTruthy();
    expect(screen.getAllByText("+2 vs. semana passada").length).toBeGreaterThan(0);
    expect(screen.getAllByText("igual vs. semana passada").length).toBeGreaterThan(0);
    expect(await screen.findByTestId("serie")).toBeTruthy();
    expect(screen.getByText("10:00")).toBeTruthy();
  });

  it("sem permissão avisa; tentar de novo busca outra vez; sem série não mostra o bloco", async () => {
    m.lerOverview.mockRejectedValueOnce(new ApiError(403, "ADMIN_PERMISSION_DENIED", "negado"));
    m.lerSerie.mockResolvedValue({ metric: "cuts", granularity: "hour", points: [] });
    render(<Hoje />);
    expect(await screen.findByText(/não tem a permissão/)).toBeTruthy();
    expect(screen.queryByTestId("serie")).toBeNull();
    m.lerOverview.mockRejectedValueOnce(new Error("fora do ar"));
    fireEvent.press(screen.getByTestId("tentar"));
    expect(await screen.findByText("fora do ar")).toBeTruthy();
  });
});

describe("Usuários, Estabelecimentos e Auditoria", () => {
  it("usuários: lista, busca volta à primeira página e pagina", async () => {
    m.listarUsuarios.mockResolvedValue(
      pagina(
        [
          { id: "u1", name: "Ana", email: "ana@x.com", roles: ["CLIENT", "ZZ"], active: true, deleted: false, created_at: "2026-10-01T12:00:00Z" },
          { id: "u2", name: "Beto", email: "beto@x.com", roles: [], active: false, deleted: false, created_at: "2026-10-01T12:00:00Z" },
          { id: "u3", name: "Caio", email: "caio@x.com", roles: ["ADMIN"], active: true, deleted: true, created_at: "2026-10-01T12:00:00Z" },
        ],
        45,
      ),
    );
    render(<Usuarios />);
    expect(await screen.findByText("Ana")).toBeTruthy();
    expect(screen.getByText(/Cliente, ZZ/)).toBeTruthy();
    expect(screen.getByText("Inativo")).toBeTruthy();
    expect(screen.getByText("Excluído")).toBeTruthy();
    expect(screen.getByText(/Página 1 de 3/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("proxima"));
    await waitFor(() => expect(m.listarUsuarios).toHaveBeenLastCalledWith("", 1));
    fireEvent.changeText(screen.getByTestId("busca"), "ana");
    fireEvent.press(screen.getByTestId("buscar"));
    await waitFor(() => expect(m.listarUsuarios).toHaveBeenLastCalledWith("ana", 0));
    fireEvent.press(await screen.findByTestId("proxima"));
    fireEvent.press(await screen.findByTestId("anterior"));
    await waitFor(() => expect(m.listarUsuarios).toHaveBeenLastCalledWith("ana", 0));
  });

  it("lista vazia", async () => {
    m.listarLojas.mockResolvedValue(pagina([]));
    render(<Estabelecimentos />);
    expect(await screen.findByTestId("vazio")).toBeTruthy();
  });

  it("estabelecimentos: aberta e fechada", async () => {
    m.listarLojas.mockResolvedValue(
      pagina([
        { id: "l1", name: "Barbearia A", status: "ACTIVE", open_status: "OPEN", owner_id: "o", owner_name: "Dono", professionals: 1, created_at: "2026-10-01T12:00:00Z" },
        { id: "l2", name: "Barbearia B", status: "ACTIVE", open_status: "CLOSED", owner_id: "o", owner_name: "Dono", professionals: 3, created_at: "2026-10-01T12:00:00Z" },
      ]),
    );
    render(<Estabelecimentos />);
    expect(await screen.findByText("Barbearia A")).toBeTruthy();
    expect(screen.getByText("Aberta")).toBeTruthy();
    expect(screen.getByText("Fechada")).toBeTruthy();
    expect(screen.getByText(/1 profissional ·/)).toBeTruthy();
  });

  it("auditoria: método, caminho, status e quem", async () => {
    m.listarAuditoria.mockResolvedValue(
      pagina([
        { id: "a1", admin_id: "x", admin_email: "adm@x.com", method: "GET", path: "/admin/users", query: "q=a", status: 200, created_at: "2026-10-22T12:00:00Z" },
        { id: "a2", admin_id: "x", admin_email: "adm@x.com", method: "POST", path: "/admin/campaigns", status: 422, created_at: "2026-10-22T12:00:00Z" },
      ]),
    );
    render(<Auditoria />);
    expect(await screen.findByText("GET /admin/users?q=a")).toBeTruthy();
    expect(screen.getByText("422")).toBeTruthy();
    expect(m.listarAuditoria).toHaveBeenCalledWith(0);
  });
});

describe("Alertas", () => {
  const alertas = (x: Partial<A.Alertas> = {}): A.Alertas => ({
    payments_stuck_hours: 24,
    payments_stuck_count: 1,
    payments_stuck_amount: 35,
    payments_stuck: [{ attendance_id: "abcdef12-0000", amount: 35, finished_at: "2026-10-21T12:00:00Z" }],
    referral_unpaid_count: 2,
    referral_unpaid_amount: 10,
    not_measured: ["push_refused", "outra"],
    ...x,
  });

  it("pagamentos parados, indicações e o que ainda não é medido; troca a janela", async () => {
    m.lerAlertas.mockResolvedValue(alertas());
    render(<Alertas />);
    expect(await screen.findByText(/#abcdef12/)).toBeTruthy();
    expect(screen.getByText(/Ainda não medido pelo Backend: Push recusado, outra\./)).toBeTruthy();
    fireEvent.press(screen.getByText("3 dias"));
    await waitFor(() => expect(m.lerAlertas).toHaveBeenLastCalledWith(72));
  });

  it("nada parado e tudo medido", async () => {
    m.lerAlertas.mockResolvedValue(alertas({ payments_stuck: [], payments_stuck_count: 0, not_measured: [] }));
    render(<Alertas />);
    expect(await screen.findByTestId("sem-parados")).toBeTruthy();
    expect(screen.queryByText(/Ainda não medido/)).toBeNull();
  });
});

describe("Dinheiro: números do período", () => {
  it("mostra faturamento, situação dos pagamentos e indicações", async () => {
    m.lerFinanceiro.mockResolvedValue({
      period: janela,
      money: din(50),
      by_payment_status: [
        { status: "PAID", count: 3, amount: 90 },
        { status: "OUTRO", count: 1, amount: 5 },
      ],
      referral: { credits_total: 20, credits_paid: 5, credits_unpaid: 15 },
    });
    render(<Dinheiro hoje="2026-10-22" />);
    expect(await screen.findByText(/Pago: 3/)).toBeTruthy();
    expect(screen.getByText(/OUTRO: 1/)).toBeTruthy();
    expect(screen.getByText(/a pagar/)).toBeTruthy();
    expect(m.lerFinanceiro).toHaveBeenCalledWith("2026-10-01T00:00:00-03:00", "2026-10-23T00:00:00-03:00");
  });
});
