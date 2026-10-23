import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";

import { ApiError } from "../../lib/api";
import * as A from "../../lib/admin";
import * as L from "../../lib/lucro";
import { Alertas } from "../Alertas";
import { comDivisao, Dinheiro } from "../Dinheiro";
import { Dividas } from "../Dividas";
import { Hoje } from "../Hoje";
import { Auditoria, Estabelecimentos, Usuarios } from "../Listas";
import { Multas } from "../Multas";
import { Premios } from "../Premios";
import { Suporte } from "../Suporte";
import { Testes } from "../Testes";

jest.mock("../../lib/admin", () => ({
  ...jest.requireActual("../../lib/admin"),
  lerOverview: jest.fn(),
  lerSerie: jest.fn(),
  lerFinanceiro: jest.fn(),
  lerAlertas: jest.fn(),
  listarUsuarios: jest.fn(),
  listarLojas: jest.fn(),
  listarAuditoria: jest.fn(),
  listarSuporte: jest.fn(),
  listarMultas: jest.fn(),
  listarTestes: jest.fn(),
  lerDividaReal: jest.fn(),
  mudarDividaReal: jest.fn(),
  listarDividas: jest.fn(),
  quitarDivida: jest.fn(),
  listarPremiosPendentes: jest.fn(),
  liberarPremio: jest.fn(),
  iniciarTeste: jest.fn(),
  tirarDoTeste: jest.fn(),
  finalizarTeste: jest.fn(),
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

describe("Suporte", () => {
  const msg = (id: string, categoria: string | undefined, extra: Partial<A.MensagemSuporte> = {}): A.MensagemSuporte => ({
    id,
    name: `Pessoa ${id}`,
    email: `pessoa${id}@gmail.com`,
    profile: "CLIENT",
    category: categoria,
    subject: `Assunto ${id}`,
    message: `Texto longo da mensagem ${id}`,
    created_at: "2026-10-22T12:00:00Z",
    ...extra,
  });

  it("lista, filtra por categoria, abre a mensagem e só mostra o e-mail depois do clique", async () => {
    m.listarSuporte.mockResolvedValue(pagina([msg("1", "Pagamento"), msg("2", "Conta", { subject: undefined, profile: undefined }), msg("3", undefined)], 45));
    render(<Suporte />);
    expect(await screen.findByText("Assunto 1")).toBeTruthy();
    expect(screen.getByText("Sem assunto")).toBeTruthy();
    expect(screen.getAllByText("p***@gmail.com · mostrar").length).toBe(3);
    expect(screen.queryByText(/pessoa1@gmail.com/)).toBeNull();
    fireEvent.press(screen.getByTestId("email-1"));
    expect(screen.getByText("pessoa1@gmail.com · ocultar")).toBeTruthy();
    fireEvent.press(screen.getByTestId("email-1"));
    expect(screen.queryByText(/pessoa1@gmail.com/)).toBeNull();
    expect(screen.queryByTestId("texto-1")).toBeNull();
    fireEvent.press(screen.getByTestId("msg-1"));
    expect(screen.getByTestId("texto-1")).toBeTruthy();
    fireEvent.press(screen.getByTestId("msg-1"));
    expect(screen.queryByTestId("texto-1")).toBeNull();
    fireEvent.press(screen.getByText("Conta"));
    expect(screen.queryByText("Assunto 1")).toBeNull();
    expect(screen.getByText("Sem assunto")).toBeTruthy();
    fireEvent.press(screen.getByText("Pagamento"));
    expect(screen.getByText("Assunto 1")).toBeTruthy();
    fireEvent.press(screen.getByTestId("proxima"));
    await waitFor(() => expect(m.listarSuporte).toHaveBeenLastCalledWith(1));
  });

  it("sem mensagem; e categoria sem mensagens", async () => {
    m.listarSuporte.mockResolvedValue(pagina([]));
    render(<Suporte />);
    expect(await screen.findByText("Nenhuma mensagem ainda.")).toBeTruthy();
  });

  it("categoria escolhida sem mensagens na página seguinte, e erro de permissão", async () => {
    m.listarSuporte.mockResolvedValueOnce(pagina([msg("1", "Pagamento")], 40));
    render(<Suporte />);
    await screen.findByText("Assunto 1");
    fireEvent.press(screen.getByText("Pagamento"));
    m.listarSuporte.mockResolvedValueOnce(pagina([msg("2", "Conta")], 40));
    fireEvent.press(screen.getByTestId("proxima"));
    expect(await screen.findByText("Nenhuma mensagem nesta categoria.")).toBeTruthy();
    m.listarSuporte.mockRejectedValueOnce(new ApiError(403, "ADMIN_PERMISSION_DENIED", "negado"));
    fireEvent.press(screen.getByTestId("anterior"));
    expect(await screen.findByText(/não tem a permissão/)).toBeTruthy();
  });
});

describe("Ordem: do mais novo ao mais antigo", () => {
  it("pagamentos parados, usuários e dias do lucro aparecem com o mais novo no topo", async () => {
    m.lerAlertas.mockResolvedValue({
      payments_stuck_hours: 24,
      payments_stuck_count: 2,
      payments_stuck_amount: 70,
      payments_stuck: [
        { attendance_id: "aaaaaaaa-0000", amount: 35, finished_at: "2026-10-20T12:00:00Z" },
        { attendance_id: "bbbbbbbb-0000", amount: 35, finished_at: "2026-10-22T12:00:00Z" },
      ],
      referral_unpaid_count: 0,
      referral_unpaid_amount: 0,
      not_measured: [],
    });
    const { unmount } = render(<Alertas />);
    await screen.findByText(/#aaaaaaaa/);
    const ids = screen.getAllByText(/^#(aaaaaaaa|bbbbbbbb)/).map((n) => String(n.props.children[1]));
    expect(ids).toEqual(["bbbbbbbb", "aaaaaaaa"]);
    unmount();

    const u = (id: string, nome: string, dia: string) => ({
      id,
      name: nome,
      email: `${id}@x.com`,
      roles: [],
      active: true,
      deleted: false,
      created_at: dia,
    });
    m.listarUsuarios.mockResolvedValue(
      pagina([u("1", "Antiga", "2026-10-01T12:00:00Z"), u("2", "Recente", "2026-10-21T12:00:00Z")]),
    );
    render(<Usuarios />);
    await screen.findByText("Recente");
    const nomes = screen.getAllByText(/^(Antiga|Recente)$/).map((n) => n.props.children);
    expect(nomes).toEqual(["Recente", "Antiga"]);
  });
});

const loja = (id: string, nome: string, x: Partial<A.LojaLinha> = {}): A.LojaLinha => ({
  id,
  name: nome,
  status: "ACTIVE",
  open_status: "OPEN",
  owner_id: "o",
  owner_name: "Dono",
  professionals: 2,
  created_at: "2026-10-01T12:00:00Z",
  ...x,
});

describe("Estabelecimentos: iniciar e tirar do teste", () => {
  it("marca lojas, pede o nome, inicia e recarrega; a loja em teste tem selo e sai pela linha", async () => {
    m.listarLojas
      .mockResolvedValueOnce(pagina([loja("l1", "Barbearia A"), loja("l2", "Barbearia B"), loja("l3", "Barbearia C", { active_test_id: "t9", active_test_name: "Piloto antigo" })]))
      .mockResolvedValue(pagina([loja("l1", "Barbearia A", { active_test_id: "t1", active_test_name: "Piloto" })]));
    m.iniciarTeste.mockResolvedValue({} as A.Teste);
    m.tirarDoTeste.mockResolvedValue({} as A.Teste);
    render(<Estabelecimentos />);
    await screen.findByText("Barbearia A");
    expect(screen.getByText("TESTE: Piloto antigo")).toBeTruthy();
    expect(screen.queryByTestId("marcar-l3")).toBeNull();
    expect(screen.queryByTestId("nome-do-teste")).toBeNull();
    fireEvent.press(screen.getByTestId("marcar-l1"));
    fireEvent.press(screen.getByTestId("marcar-l2"));
    fireEvent.press(screen.getByTestId("marcar-l2"));
    expect(screen.getByText("Iniciar teste com 1 loja")).toBeTruthy();
    fireEvent.press(screen.getByTestId("marcar-l2"));
    expect(screen.getByText("Iniciar teste com 2 lojas")).toBeTruthy();
    expect(screen.getByTestId("iniciar-teste")).toBeDisabled();
    fireEvent.changeText(screen.getByTestId("nome-do-teste"), "  Piloto ");
    fireEvent.press(screen.getByTestId("iniciar-teste"));
    await waitFor(() => expect(m.iniciarTeste).toHaveBeenCalledWith("  Piloto ", ["l1", "l2"]));
    expect(await screen.findByText("TESTE: Piloto")).toBeTruthy();
    expect(screen.queryByTestId("nome-do-teste")).toBeNull();
    fireEvent.press(screen.getByTestId("tirar-l1"));
    await waitFor(() => expect(m.tirarDoTeste).toHaveBeenCalledWith("t1", "l1"));
  });

  it("limpar as marcas, e os erros do Backend em português", async () => {
    m.listarLojas.mockResolvedValue(pagina([loja("l1", "Barbearia A")]));
    m.iniciarTeste.mockRejectedValueOnce(new ApiError(409, "TEST_RUN_ALREADY_ACTIVE", "x")).mockRejectedValueOnce(new ApiError(422, null, "x")).mockRejectedValueOnce(new Error("Sem conexão"));
    render(<Estabelecimentos />);
    fireEvent.press(await screen.findByTestId("marcar-l1"));
    fireEvent.press(screen.getByTestId("limpar-marcas"));
    expect(screen.queryByTestId("iniciar-teste")).toBeNull();
    fireEvent.press(screen.getByTestId("marcar-l1"));
    fireEvent.changeText(screen.getByTestId("nome-do-teste"), "T");
    fireEvent.press(screen.getByTestId("iniciar-teste"));
    expect(await screen.findByText(/já está em outro teste ativo/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("iniciar-teste"));
    expect(await screen.findByText(/Dê um nome ao teste/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("iniciar-teste"));
    expect(await screen.findByText("Sem conexão")).toBeTruthy();
  });

  it("busca volta à primeira página", async () => {
    m.listarLojas.mockResolvedValue(pagina([loja("l1", "Barbearia A")], 45));
    render(<Estabelecimentos />);
    await screen.findByText("Barbearia A");
    fireEvent.press(screen.getByTestId("proxima"));
    await waitFor(() => expect(m.listarLojas).toHaveBeenLastCalledWith("", 1));
    fireEvent.changeText(screen.getByTestId("busca"), "bar");
    fireEvent.press(screen.getByTestId("buscar"));
    await waitFor(() => expect(m.listarLojas).toHaveBeenLastCalledWith("bar", 0));
  });
});

describe("Dívidas por fora", () => {
  const dividas: A.DividaLinha[] = [
    { professional_id: "aaaaaaaa-1", amount: 10, simulated: true },
    { professional_id: "bbbbbbbb-2", amount: 20, simulated: false },
    { professional_id: "cccccccc-3", amount: 35.5, simulated: false },
  ];

  it("mostra o real e o simulado, reais primeiro; quita só a real, com confirmação", async () => {
    m.lerDividaReal.mockResolvedValue({ real: false });
    m.listarDividas.mockResolvedValueOnce(dividas).mockResolvedValue([dividas[0]]);
    m.quitarDivida.mockResolvedValue({ settled_amount: 35.5 });
    render(<Dividas />);
    await screen.findByTestId("divida-cccccccc-3-real");
    expect(screen.getAllByTestId(/^divida-/).map((n) => n.props.testID)).toEqual([
      "divida-cccccccc-3-real",
      "divida-bbbbbbbb-2-real",
      "divida-aaaaaaaa-1-simulada",
    ]);
    expect(screen.getByText("De teste")).toBeTruthy();
    expect(screen.queryByTestId("quitar-aaaaaaaa-1")).toBeNull();
    fireEvent.press(screen.getByTestId("quitar-cccccccc-3"));
    expect(m.quitarDivida).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("confirmar-quitar-cccccccc-3"));
    await waitFor(() => expect(m.quitarDivida).toHaveBeenCalledWith("cccccccc-3"));
    expect(await screen.findByText(/Quitado: R\$ 35,50/)).toBeTruthy();
    expect(await screen.findByTestId("divida-aaaaaaaa-1-simulada")).toBeTruthy();
    expect(screen.queryByTestId("divida-cccccccc-3-real")).toBeNull();
  });

  it("o interruptor pede confirmação, liga e desliga, e o i explica", async () => {
    m.lerDividaReal.mockResolvedValueOnce({ real: false }).mockResolvedValueOnce({ real: true }).mockResolvedValue({ real: false });
    m.listarDividas.mockResolvedValue([]);
    m.mudarDividaReal.mockResolvedValue({ real: true });
    render(<Dividas />);
    expect(await screen.findByTestId("vazio")).toBeTruthy();
    expect(screen.getByLabelText("Como é calculado: Dívidas novas")).toBeTruthy();
    fireEvent.press(screen.getByTestId("mudar-flag"));
    fireEvent.press(screen.getByTestId("cancelar-flag"));
    expect(m.mudarDividaReal).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("mudar-flag"));
    expect(screen.getByTestId("aviso-flag")).toHaveTextContent(/passam a ser reais/);
    fireEvent.press(screen.getByTestId("confirmar-flag"));
    await waitFor(() => expect(m.mudarDividaReal).toHaveBeenCalledWith(true));
    expect(await screen.findByText("Reais")).toBeTruthy();
    fireEvent.press(screen.getByTestId("mudar-flag"));
    expect(screen.getByTestId("aviso-flag")).toHaveTextContent(/Voltar as dívidas novas para teste/);
    m.mudarDividaReal.mockResolvedValueOnce({ real: false });
    fireEvent.press(screen.getByTestId("confirmar-flag"));
    await waitFor(() => expect(m.mudarDividaReal).toHaveBeenLastCalledWith(false));
  });

  it("erro ao quitar aparece na tela", async () => {
    m.lerDividaReal.mockResolvedValue({ real: true });
    m.listarDividas.mockResolvedValue([dividas[1]]);
    m.quitarDivida.mockRejectedValueOnce(new ApiError(403, "ADMIN_PERMISSION_DENIED", "negado"));
    render(<Dividas />);
    fireEvent.press(await screen.findByTestId("quitar-bbbbbbbb-2"));
    fireEvent.press(screen.getByTestId("confirmar-quitar-bbbbbbbb-2"));
    expect(await screen.findByText(/não tem a permissão/)).toBeTruthy();
  });
});

describe("Testes", () => {
  const teste = (id: string, x: Partial<A.Teste> = {}): A.Teste => ({
    id,
    name: "Piloto",
    started_at: "2026-10-20T12:00:00Z",
    ended_at: null,
    active: true,
    attendances: 3,
    symbolic_amount: 120,
    establishments: [
      { establishment_id: "l1", establishment_name: "Barbearia A", joined_at: "2026-10-20T12:00:00Z", left_at: null },
      { establishment_id: "l2", establishment_name: "Barbearia B", joined_at: "2026-10-20T12:00:00Z", left_at: "2026-10-21T12:00:00Z" },
    ],
    ...x,
  });

  it("lista do mais novo ao mais antigo com lojas, saída e total; finaliza com confirmação", async () => {
    m.listarTestes
      .mockResolvedValueOnce(pagina([teste("velho", { name: "Antigo", active: false, ended_at: "2026-10-22T12:00:00Z", attendances: 1 }), teste("novo", { started_at: "2026-10-23T12:00:00Z" })]))
      .mockResolvedValue(pagina([]));
    m.finalizarTeste.mockResolvedValue({} as A.Teste);
    render(<Testes />);
    await screen.findByTestId("teste-novo");
    expect(screen.getAllByTestId(/^teste-/).map((n) => n.props.testID)).toEqual(["teste-novo", "teste-velho"]);
    expect(screen.getAllByText(/saiu/)).toHaveLength(2);
    expect(screen.getByText("Finalizado")).toBeTruthy();
    expect(screen.getByText("1 atendimento", { exact: false })).toBeTruthy();
    expect(screen.queryByTestId("finalizar-velho")).toBeNull();
    fireEvent.press(screen.getByTestId("finalizar-novo"));
    expect(m.finalizarTeste).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("confirmar-novo"));
    await waitFor(() => expect(m.finalizarTeste).toHaveBeenCalledWith("novo"));
    expect(await screen.findByTestId("vazio")).toBeTruthy();
  });

  it("erro ao finalizar e busca pelo nome", async () => {
    m.listarTestes.mockResolvedValue(pagina([teste("t1")]));
    m.finalizarTeste.mockRejectedValueOnce(new ApiError(409, "TEST_RUN_ALREADY_ENDED", "x"));
    render(<Testes />);
    fireEvent.press(await screen.findByTestId("finalizar-t1"));
    fireEvent.press(screen.getByTestId("confirmar-t1"));
    expect(await screen.findByText("Este teste já foi finalizado.")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("busca"), "pil");
    fireEvent.press(screen.getByTestId("buscar"));
    await waitFor(() => expect(m.listarTestes).toHaveBeenLastCalledWith("pil", 0));
  });
});

describe("Multas", () => {
  const multa = (id: string, x: Partial<A.MultaLinha> = {}): A.MultaLinha => ({
    id,
    type: "LATE_ARRIVAL",
    client_id: "u1",
    client_name: "Ana",
    establishment_id: "e1",
    establishment_name: "Barbearia",
    amount: 5,
    state: "GENERATED",
    test: false,
    created_at: "2026-10-20T12:00:00Z",
    ...x,
  });

  it("lista do mais novo ao mais antigo, marca as de teste e filtra por tipo, teste e busca", async () => {
    m.listarMultas.mockResolvedValue({
      items: [
        multa("velha"),
        multa("nova", { type: "NO_SHOW", state: "CHARGED", test: true, created_at: "2026-10-22T12:00:00Z", client_name: "Bia" }),
      ],
      page: 0,
      size: 20,
      total: 2,
    });
    render(<Multas />);
    expect(await screen.findByTestId("multa-nova")).toBeTruthy();
    expect(m.listarMultas).toHaveBeenLastCalledWith("", "", "", 0);
    expect(screen.getAllByTestId(/^multa-/).map((n) => n.props.testID)).toEqual(["multa-nova", "multa-velha"]);
    expect(within(screen.getByTestId("multa-nova")).getByText("Falta")).toBeTruthy();
    expect(screen.getAllByText("Teste")).toHaveLength(1);
    fireEvent.press(screen.getByTestId("tipo-LATE_CANCEL"));
    await waitFor(() => expect(m.listarMultas).toHaveBeenLastCalledWith("LATE_CANCEL", "", "", 0));
    fireEvent.press(screen.getByTestId("teste-true"));
    await waitFor(() => expect(m.listarMultas).toHaveBeenLastCalledWith("LATE_CANCEL", "true", "", 0));
    fireEvent.changeText(screen.getByTestId("busca"), "  Ana ");
    fireEvent.press(screen.getByTestId("buscar"));
    await waitFor(() => expect(m.listarMultas).toHaveBeenLastCalledWith("LATE_CANCEL", "true", "  Ana ", 0));
  });

  it("sem multa no filtro, e erro de permissão", async () => {
    m.listarMultas.mockResolvedValueOnce({ items: [], page: 0, size: 20, total: 0 });
    render(<Multas />);
    expect(await screen.findByTestId("vazio")).toBeTruthy();
    m.listarMultas.mockRejectedValueOnce(new ApiError(403, "ADMIN_PERMISSION_DENIED", "negado"));
    fireEvent.press(screen.getByTestId("tipo-NO_SHOW"));
    expect(await screen.findByText(/não tem a permissão/)).toBeTruthy();
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

  it("push recusado e 5xx: última hora, 24 horas e uma barra por hora, com o i", async () => {
    const serie = (n: number) => ({
      last_hour: n,
      last_24h: n * 3,
      by_hour: [
        { hour: "2026-10-23T10:00:00Z", count: 0 },
        { hour: "2026-10-23T11:00:00Z", count: n },
      ],
    });
    m.lerAlertas.mockResolvedValue(alertas({ push_refused: serie(4), http_5xx: serie(0), not_measured: [] }));
    render(<Alertas />);
    expect(await screen.findByTestId("serie-push")).toBeTruthy();
    expect(screen.getByTestId("serie-5xx")).toBeTruthy();
    expect(screen.getAllByTestId("barra-push")).toHaveLength(2);
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByLabelText("Como é calculado: Push recusado")).toBeTruthy();
    expect(screen.getByLabelText("Como é calculado: Erros 5xx da API")).toBeTruthy();
    expect(screen.queryByText(/Ainda não medido/)).toBeNull();
  });

  it("nada parado e tudo medido", async () => {
    m.lerAlertas.mockResolvedValue(alertas({ payments_stuck: [], payments_stuck_count: 0, not_measured: [] }));
    render(<Alertas />);
    expect(await screen.findByTestId("sem-parados")).toBeTruthy();
    expect(screen.queryByText(/Ainda não medido/)).toBeNull();
  });
});

describe("Dinheiro: o i de cada card", () => {
  const fin = {
    period: janela,
    money: din(50),
    by_payment_status: [{ status: "PAID", count: 146, amount: 4547.8 }],
    referral: { credits_total: 0, credits_paid: 0, credits_unpaid: 0 },
  };
  const parteZero = { amount: 0, asaas_fee: 0, app_profit: 0 };
  const lucro = (attendances: number, semDivisao: number) => ({
    period: janela,
    group_by: "day" as const,
    items: [],
    totals: { key: "total", attendances, service: parteZero, penalty: parteZero, total: parteZero },
    services_without_split: semDivisao,
  });

  it("o teste aparece à parte, simbólico, com o i; sem teste o card não existe", async () => {
    (L.buscarLucro as jest.Mock).mockResolvedValue(lucro(2, 0));
    m.lerFinanceiro.mockResolvedValueOnce({ ...fin, pilot: { attendances: 1, amount: 35 } });
    const { unmount } = render(<Dinheiro hoje="2026-10-22" />);
    expect(await screen.findByTestId("teste-simbolico")).toHaveTextContent(/1 atendimento · R\$ 35,00/);
    expect(screen.getByLabelText("Como é calculado: Teste (simbólico)")).toBeTruthy();
    unmount();
    m.lerFinanceiro.mockResolvedValueOnce(fin);
    render(<Dinheiro hoje="2026-10-22" />);
    await screen.findByText("Indicações (créditos)");
    expect(screen.queryByTestId("teste-simbolico")).toBeNull();
  });

  it("toque abre a dica do cálculo, outro toque e o Esc fecham; o fim lembra dos antigos", async () => {
    const ouvintes: Record<string, (e: { key: string }) => void> = {};
    (globalThis as { document?: unknown }).document = {
      addEventListener: (t: string, f: (e: { key: string }) => void) => (ouvintes[t] = f),
      removeEventListener: (t: string) => delete ouvintes[t],
    };
    m.lerFinanceiro.mockResolvedValue(fin);
    render(<Dinheiro hoje="2026-10-22" />);
    await screen.findByTestId("numero-Taxa do app");
    expect(screen.queryByTestId("dica-Taxa do app")).toBeNull();
    fireEvent.press(screen.getByTestId("info-Taxa do app"));
    expect(screen.getByText(/os 2% mais a sobra do arredondamento/)).toBeTruthy();
    expect(within(screen.getByTestId("dica-Taxa do app")).getByText(/Atendimentos antigos, sem a divisão gravada, entram só no faturamento bruto\.$/)).toBeTruthy();
    expect(screen.getByTestId("info-Taxa do app").props.accessibilityState).toEqual({ expanded: true });
    act(() => ouvintes.keydown({ key: "a" }));
    expect(screen.getByTestId("dica-Taxa do app")).toBeTruthy();
    act(() => ouvintes.keydown({ key: "Escape" }));
    expect(screen.queryByTestId("dica-Taxa do app")).toBeNull();
    fireEvent.press(screen.getByTestId("info-Multas geradas"));
    expect(screen.getByText("Multas criadas no período.")).toBeTruthy();
    fireEvent(screen.getByTestId("info-Multas geradas"), "blur");
    expect(screen.queryByTestId("dica-Multas geradas")).toBeNull();
    fireEvent.press(screen.getByTestId("info-Faturamento bruto"));
    fireEvent.press(screen.getByTestId("info-Faturamento bruto"));
    expect(screen.queryByTestId("dica-Faturamento bruto")).toBeNull();
    delete (globalThis as { document?: unknown }).document;
  });

  it("os blocos do lucro também têm o i (corte, multa e total)", async () => {
    m.lerFinanceiro.mockResolvedValue(fin);
    (L.buscarLucro as jest.Mock).mockResolvedValue({
      ...lucro(2, 0),
      items: [{ key: "2026-10-22", attendances: 2, service: parteZero, penalty: parteZero, total: parteZero }],
    });
    render(<Dinheiro hoje="2026-10-22" />);
    await screen.findByText("22/10/2026");
    fireEvent.press(screen.getAllByTestId("info-Corte")[0]);
    expect(screen.getByText(/lucro é zero de propósito/)).toBeTruthy();
  });

  it("comDivisao: sem relatório ou com tudo dividido não avisa; com falta, conta X de Y", () => {
    const por = [{ count: 100 }, { count: 46 }];
    expect(comDivisao(por, null)).toBeNull();
    expect(comDivisao(por, lucro(146, 0))).toBeNull();
    expect(comDivisao(por, lucro(2, 0))).toMatch(/^2 de 146 atendimentos com a divisão gravada/);
    expect(comDivisao(por, lucro(2, 5))).toMatch(/^0 de 146/);
  });

  it("mostra o aviso X de Y junto dos cards quando falta divisão", async () => {
    m.lerFinanceiro.mockResolvedValue(fin);
    (L.buscarLucro as jest.Mock).mockResolvedValue(lucro(2, 0));
    render(<Dinheiro hoje="2026-10-22" />);
    expect(await screen.findByText(/^2 de 146 atendimentos com a divisão gravada/)).toBeTruthy();
  });
});

describe("Dinheiro: números do período", () => {
  it("mostra faturamento, situação dos pagamentos e indicações", async () => {
    m.lerFinanceiro.mockResolvedValue({
      period: janela,
      money: din(50),
      by_payment_status: [
        { status: "PAID", count: 3, amount: 90 },
        { status: "NONE", count: 30, amount: 952.1 },
        { status: "AWAITING_CONFIRMATION", count: 2, amount: 40 },
        { status: "OUTRO", count: 1, amount: 5 },
      ],
      referral: { credits_total: 20, credits_paid: 5, credits_unpaid: 15 },
    });
    render(<Dinheiro hoje="2026-10-22" />);
    expect(await screen.findByText(/Pago: 3/)).toBeTruthy();
    expect(screen.getByText(/OUTRO: 1/)).toBeTruthy();
    expect(screen.getByText(/Sem pagamento registrado: 30/)).toBeTruthy();
    expect(screen.queryByText(/NONE/)).toBeNull();
    expect(screen.getByText(/não é valor devido nem pago/)).toBeTruthy();
    expect(screen.getByText(/Aguardando confirmação: 2/)).toBeTruthy();
    expect(screen.getByText(/a pagar/)).toBeTruthy();
    expect(m.lerFinanceiro).toHaveBeenCalledWith("2026-10-01T00:00:00-03:00", "2026-10-23T00:00:00-03:00");
  });
});

describe("Prêmios do compartilhe e ganhe", () => {
  const premios: A.PremioPendente[] = [
    { campaign_id: "c1", campaign_name: "Indique", beneficiary_id: "b1", beneficiary_name: "Ana", amount: 15, credits: 3 },
    { campaign_id: "c1", campaign_name: "Indique", beneficiary_id: "bbbbbbbb-2", amount: 5, credits: 1 },
  ];

  it("lista, pede confirmação e libera só aquela pessoa", async () => {
    m.listarPremiosPendentes.mockResolvedValueOnce(premios).mockResolvedValue([premios[1]]);
    m.liberarPremio.mockResolvedValue({ released_credits: 3, released_at: "2026-10-23T12:00:00Z" });
    render(<Premios />);
    await screen.findByTestId("premio-c1-b1");
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.getByText("Pessoa #bbbbbbbb")).toBeTruthy();
    expect(screen.getByText("R$ 20,00")).toBeTruthy();
    fireEvent.press(screen.getByTestId("liberar-c1-b1"));
    expect(m.liberarPremio).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("confirmar-liberar-c1-b1"));
    await waitFor(() => expect(m.liberarPremio).toHaveBeenCalledWith("c1", "b1"));
    expect(await screen.findByText("Liberado: 3 prêmios.")).toBeTruthy();
    expect(screen.queryByTestId("premio-c1-b1")).toBeNull();
  });

  it("cancelar não libera; vazio avisa; erro aparece", async () => {
    m.listarPremiosPendentes.mockResolvedValueOnce([premios[0]]).mockResolvedValue([]);
    m.liberarPremio.mockRejectedValue(new ApiError(409, "JA_LIBERADO", "Já liberado."));
    render(<Premios />);
    await screen.findByTestId("premio-c1-b1");
    fireEvent.press(screen.getByTestId("liberar-c1-b1"));
    fireEvent.press(screen.getByTestId("cancelar-liberar-c1-b1"));
    expect(screen.getByTestId("liberar-c1-b1")).toBeTruthy();
    fireEvent.press(screen.getByTestId("liberar-c1-b1"));
    fireEvent.press(screen.getByTestId("confirmar-liberar-c1-b1"));
    expect(await screen.findByText("Já liberado.")).toBeTruthy();
    expect(screen.getByTestId("premio-c1-b1")).toBeTruthy();
  });

  it("sem prêmio esperando, avisa", async () => {
    m.listarPremiosPendentes.mockResolvedValue([]);
    render(<Premios />);
    expect(await screen.findByTestId("vazio")).toBeTruthy();
  });
});
