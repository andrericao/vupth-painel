import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ApiError } from "../../lib/api";
import * as auth from "../../lib/auth";
import { SegundoFator, erroDoCodigo } from "../SegundoFator";
import * as C from "../../lib/campaigns";
import type { Campaign } from "../../lib/campaigns";
import { CampanhaForm } from "../CampanhaForm";
import { Campanhas } from "../Campanhas";
import { Entrar } from "../Entrar";

jest.mock("../../lib/auth", () => ({
  entrar: jest.fn(),
  etapaDoSegundoFator: jest.fn(),
  iniciarConfiguracao: jest.fn(),
  confirmarConfiguracao: jest.fn(),
  verificarCodigo: jest.fn(),
  concluirEntrada: jest.fn(),
}));
jest.mock("../../lib/campaigns", () => ({
  ...jest.requireActual("../../lib/campaigns"),
  listarCampanhas: jest.fn(),
  lerFunil: jest.fn(),
  criarCampanha: jest.fn(),
  editarCampanha: jest.fn(),
  pausarCampanha: jest.fn(),
  retomarCampanha: jest.fn(),
  encerrarCampanha: jest.fn(),
}));

const m = C as jest.Mocked<typeof C>;
const entrarMock = auth.entrar as jest.Mock;
const a = auth as unknown as Record<string, jest.Mock>;

const campanha = (x: Partial<Campaign> = {}): Campaign => ({
  id: "c1",
  name: "Lançamento",
  type: "DISCOUNT",
  visibility: "PUBLIC",
  value_amount: 10,
  starts_at: "2026-10-16T03:00:00Z",
  ends_at: "2026-11-01T02:59:59Z",
  redemptions: 37,
  max_redemptions: 50,
  new_clients_only: false,
  active: true,
  status: "RUNNING",
  ...x,
});

beforeEach(() => {
  jest.clearAllMocks();
  a.etapaDoSegundoFator.mockResolvedValue("pronto");
});

describe("Entrar", () => {
  it("pede e-mail e senha antes de chamar", () => {
    render(<Entrar onEntrou={jest.fn()} />);
    fireEvent.press(screen.getByTestId("entrar"));
    expect(screen.getByText("Digite o e-mail.")).toBeTruthy();
    expect(screen.getByText("Digite a senha.")).toBeTruthy();
    expect(entrarMock).not.toHaveBeenCalled();
  });

  it("Enter no e-mail ou na senha entra; Enter repetido enquanto envia não duplica", async () => {
    let solta: (v: unknown) => void = () => {};
    entrarMock.mockReturnValue(new Promise((r) => (solta = r)));
    const onEntrou = jest.fn();
    render(<Entrar onEntrou={onEntrou} />);
    fireEvent.changeText(screen.getByTestId("email"), "a@b.c");
    fireEvent.changeText(screen.getByTestId("senha"), "x");
    fireEvent(screen.getByTestId("senha"), "submitEditing");
    fireEvent(screen.getByTestId("email"), "submitEditing");
    expect(entrarMock).toHaveBeenCalledTimes(1);
    solta({});
    await waitFor(() => expect(onEntrou).toHaveBeenCalled());
  });

  it("entra e avisa", async () => {
    entrarMock.mockResolvedValue({});
    const onEntrou = jest.fn();
    render(<Entrar onEntrou={onEntrou} />);
    fireEvent.changeText(screen.getByTestId("email"), "a@b.c");
    fireEvent.changeText(screen.getByTestId("senha"), "x");
    fireEvent.press(screen.getByTestId("entrar"));
    await waitFor(() => expect(onEntrou).toHaveBeenCalled());
    expect(entrarMock).toHaveBeenCalledWith("a@b.c", "x");
  });

  it("401 vira senha errada; o resto mostra a mensagem", async () => {
    render(<Entrar onEntrou={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId("email"), "a@b.c");
    fireEvent.changeText(screen.getByTestId("senha"), "x");
    entrarMock.mockRejectedValueOnce(new ApiError(401, null, "x"));
    fireEvent.press(screen.getByTestId("entrar"));
    expect(await screen.findByText("E-mail ou senha errados.")).toBeTruthy();
    entrarMock.mockRejectedValueOnce(new ApiError(403, "NOT_ADMIN", "Esta conta não tem acesso ao painel."));
    fireEvent.press(screen.getByTestId("entrar"));
    expect(await screen.findByText("Esta conta não tem acesso ao painel.")).toBeTruthy();
  });

  it("erros de rede e de servidor acordando, sem apagar o digitado", async () => {
    render(<Entrar onEntrou={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId("email"), "a@b.c");
    fireEvent.changeText(screen.getByTestId("senha"), "x".repeat(54));
    entrarMock.mockRejectedValueOnce(new ApiError(0, null, "x"));
    fireEvent.press(screen.getByTestId("entrar"));
    expect(await screen.findByText(/Sem conexão com o servidor/)).toBeTruthy();
    entrarMock.mockRejectedValueOnce(new ApiError(503, null, "x"));
    fireEvent.press(screen.getByTestId("entrar"));
    expect(await screen.findByText(/servidor está acordando/)).toBeTruthy();
    expect(screen.getByTestId("email").props.value).toBe("a@b.c");
    expect(screen.getByTestId("senha").props.value).toHaveLength(54);
    expect(screen.getByTestId("senha").props.maxLength).toBe(64);
  });

  it("olho mostra e oculta a senha", () => {
    render(<Entrar onEntrou={jest.fn()} />);
    expect(screen.getByTestId("senha").props.secureTextEntry).toBe(true);
    expect(screen.getByLabelText("Mostrar senha")).toBeTruthy();
    fireEvent.press(screen.getByTestId("senha-ver"));
    expect(screen.getByLabelText("Ocultar senha")).toBeTruthy();
    expect(screen.getByTestId("senha").props.secureTextEntry).toBe(false);
    fireEvent.press(screen.getByTestId("senha-ver"));
    expect(screen.getByTestId("senha").props.secureTextEntry).toBe(true);
  });
});

describe("Segundo fator", () => {
  it("depois da senha, pede o código e entra", async () => {
    entrarMock.mockResolvedValue({});
    a.etapaDoSegundoFator.mockResolvedValue("codigo");
    a.verificarCodigo.mockResolvedValue(undefined);
    const onEntrou = jest.fn();
    render(<Entrar onEntrou={onEntrou} />);
    fireEvent.changeText(screen.getByTestId("email"), "a@b.c");
    fireEvent.changeText(screen.getByTestId("senha"), "x");
    fireEvent.press(screen.getByTestId("entrar"));
    expect(await screen.findByText(/Abra o Google Authenticator/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("verificar"));
    expect(screen.getByText("Digite o código.")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("codigo"), "123456");
    fireEvent.press(screen.getByTestId("verificar"));
    await waitFor(() => expect(onEntrou).toHaveBeenCalled());
    expect(a.verificarCodigo).toHaveBeenCalledWith("123456");
  });

  it("código errado, travado e sem rede aparecem no campo", async () => {
    a.verificarCodigo.mockRejectedValueOnce(new ApiError(401, "ADMIN_TOTP_INVALID", "x"));
    render(<SegundoFator etapa="codigo" onPronto={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId("codigo"), "000000");
    fireEvent.press(screen.getByTestId("verificar"));
    expect(await screen.findByText(/Código errado/)).toBeTruthy();
    expect(screen.getByTestId("codigo").props.value).toBe("000000");
    a.verificarCodigo.mockRejectedValueOnce(new ApiError(429, "ADMIN_TOTP_LOCKED", "x"));
    fireEvent.press(screen.getByTestId("verificar"));
    expect(await screen.findByText(/Espere 15 minutos/)).toBeTruthy();
    expect(erroDoCodigo(new ApiError(0, null, "x"))).toMatch(/Sem conexão/);
    expect(erroDoCodigo(new ApiError(500, null, "falhou"))).toBe("falhou");
    expect(erroDoCodigo(new Error("outro"))).toBe("outro");
  });

  it("Enter no código verifica (entrada) e confirma (primeira vez, só com a chave pronta)", async () => {
    a.verificarCodigo.mockResolvedValue(undefined);
    const onPronto = jest.fn();
    const { unmount } = render(<SegundoFator etapa="codigo" onPronto={onPronto} />);
    fireEvent.changeText(screen.getByTestId("codigo"), "123456");
    fireEvent(screen.getByTestId("codigo"), "submitEditing");
    await waitFor(() => expect(onPronto).toHaveBeenCalled());
    expect(a.verificarCodigo).toHaveBeenCalledWith("123456");
    unmount();

    a.iniciarConfiguracao.mockResolvedValue({ secret: "ABCD EFGH", otpauth_uri: "otpauth://x" });
    a.confirmarConfiguracao.mockResolvedValue(["AAAAA-BBBBB"]);
    render(<SegundoFator etapa="configurar" onPronto={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId("codigo"), "222222");
    fireEvent(screen.getByTestId("codigo"), "submitEditing");
    expect(a.confirmarConfiguracao).not.toHaveBeenCalled();
    await screen.findByText("ABCD EFGH");
    fireEvent(screen.getByTestId("codigo"), "submitEditing");
    expect(await screen.findByText("AAAAA-BBBBB")).toBeTruthy();
    expect(a.confirmarConfiguracao).toHaveBeenCalledWith("222222");
  });

  it("primeira vez: mostra a chave, confirma e mostra os códigos de recuperação uma vez", async () => {
    a.iniciarConfiguracao.mockResolvedValue({ secret: "ABCD EFGH", otpauth_uri: "otpauth://x" });
    a.confirmarConfiguracao.mockResolvedValue(["AAAAA-BBBBB", "CCCCC-DDDDD"]);
    const onPronto = jest.fn();
    render(<SegundoFator etapa="configurar" onPronto={onPronto} />);
    expect(screen.getByTestId("carregando-chave")).toBeTruthy();
    expect(await screen.findByText("ABCD EFGH")).toBeTruthy();
    expect(screen.getByTestId("qr")).toBeTruthy();
    fireEvent.press(screen.getByTestId("confirmar"));
    expect(screen.getByText("Digite o código do aplicativo.")).toBeTruthy();
    a.confirmarConfiguracao.mockRejectedValueOnce(new ApiError(401, "ADMIN_TOTP_INVALID", "x"));
    fireEvent.changeText(screen.getByTestId("codigo"), "111111");
    fireEvent.press(screen.getByTestId("confirmar"));
    expect(await screen.findByText(/Código errado/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("confirmar"));
    expect(await screen.findByText("AAAAA-BBBBB")).toBeTruthy();
    expect(onPronto).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("guardei"));
    expect(a.concluirEntrada).toHaveBeenCalled();
    expect(onPronto).toHaveBeenCalled();
  });

  it("falha ao gerar a chave vira aviso e bloqueia o Confirmar", async () => {
    a.iniciarConfiguracao.mockRejectedValue(new ApiError(409, "ADMIN_TOTP_ALREADY_ENABLED", "Já ativado."));
    render(<SegundoFator etapa="configurar" onPronto={jest.fn()} />);
    expect(await screen.findByText("Já ativado.")).toBeTruthy();
    expect(screen.queryByTestId("qr")).toBeNull();
    expect(screen.getByTestId("confirmar").props.accessibilityState.disabled).toBe(true);
  });
});

describe("Campanhas", () => {
  it("lista, filtra e mostra as vagas", async () => {
    m.listarCampanhas.mockResolvedValue([
      campanha(),
      campanha({ id: "c2", name: "Parceiro", visibility: "PRIVATE", code: "PARC", status: "PAUSED", max_redemptions: undefined, audience: "OWNER" }),
      campanha({ id: "c3", name: "Velha", status: "ENDED", code: "OLD" }),
      campanha({ id: "c4", name: "Indique", type: "REFERRAL_BONUS", value_amount: 5, referral_professional_percent: 60, referral_owner_percent: 40, referral_scope: "ANY_PROFESSIONAL", payout_period: "WEEKLY", payout_day: 1 }),
    ]);
    render(<Campanhas hoje="2026-10-16" />);
    expect(screen.getByTestId("carregando")).toBeTruthy();
    expect(await screen.findByText("Lançamento")).toBeTruthy();
    expect(screen.getByText("2 no ar · 4 no total")).toBeTruthy();
    expect(screen.getAllByText("37 de 50")).toHaveLength(3);
    expect(screen.getByText("Profissional 60% · dono 40% · qualquer profissional · toda segunda")).toBeTruthy();
    expect(screen.getByText("37 aceitaram · sem limite")).toBeTruthy();
    expect(screen.queryByTestId("editar-c3")).toBeNull();
    fireEvent.press(screen.getByTestId("filtro-PAUSED"));
    expect(screen.queryByText("Lançamento")).toBeNull();
    expect(screen.getByText("Parceiro")).toBeTruthy();
    fireEvent.press(screen.getByTestId("filtro-SCHEDULED"));
    expect(screen.getByTestId("vazio")).toHaveTextContent("Nenhuma campanha neste filtro.");
  });

  it("cupom com Copiar (confirma, ou avisa se o navegador nega) e link com o como participar", async () => {
    const cupom = campanha({ code: "TESTE10" });
    const link = campanha({
      id: "c2",
      name: "Indique",
      type: "REFERRAL_BONUS",
      visibility: "PRIVATE",
      audience: "PROFESSIONAL",
      code: "PART1",
    });
    const aberto = campanha({ id: "c3", name: "Aberta", type: "REFERRAL_BONUS" });
    m.listarCampanhas.mockResolvedValue([cupom, link, aberto]);
    const escrever = jest.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("negado"));
    Object.defineProperty(navigator, "clipboard", { value: { writeText: escrever }, configurable: true });
    render(<Campanhas hoje="2026-10-16" />);
    await screen.findByText("Lançamento");
    expect(screen.getByTestId("codigo-c1")).toHaveTextContent("TESTE10");
    expect(screen.getByTestId("participar-c2")).toHaveTextContent(
      "Participa pelo bloco de campanhas da Home do Partner, tocando em Participar e informando o código de participação.",
    );
    expect(screen.getByTestId("participar-c3")).toHaveTextContent(/da Home do Client \(cliente\) ou Partner \(profissional e dono\), tocando em Participar\./);
    expect(screen.queryByTestId("participar-c1")).toBeNull();
    fireEvent.press(screen.getByTestId("copiar-c1"));
    expect(await screen.findByTestId("copiado-c1")).toHaveTextContent("Copiado");
    expect(escrever).toHaveBeenCalledWith("TESTE10");
    fireEvent.press(screen.getByTestId("copiar-c2"));
    expect(await screen.findByTestId("copiado-c2")).toHaveTextContent(/Não deu para copiar/);
  });

  it("simulação no fim do formulário: soma a nova com as ativas e sem preço some", async () => {
    m.listarCampanhas.mockResolvedValue([
      campanha({ code: "A", value_amount: 10, max_redemptions: 5 }),
      campanha({ id: "c9", name: "Velha", status: "ENDED" }),
    ]);
    render(<Campanhas hoje="2026-10-16" />);
    await screen.findByText("Lançamento");
    fireEvent.press(screen.getByTestId("criar"));
    fireEvent.changeText(screen.getByTestId("nome"), "Nova");
    fireEvent.changeText(screen.getByTestId("valor"), "1000");
    fireEvent.changeText(screen.getByTestId("limite"), "20");
    fireEvent.changeText(screen.getByTestId("sim-cortes"), "2");
    expect(screen.getByTestId("sim-nova")).toHaveTextContent(/Nova · 20 pessoas · 40 cortes/);
    expect(screen.getByTestId("sim-nova")).toHaveTextContent(/R\$ 400,00/);
    expect(screen.getByTestId("sim-ativa-0")).toHaveTextContent(/Lançamento · 5 pessoas · 10 cortes/);
    expect(screen.getByTestId("sim-total")).toHaveTextContent(/Total \(2 campanhas\)/);
    expect(screen.getByTestId("sim-total")).toHaveTextContent(/R\$ 500,00/);
    fireEvent.changeText(screen.getByTestId("sim-corte"), "");
    expect(screen.getByTestId("sim-vazia")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("sim-corte"), "5000");
    fireEvent.changeText(screen.getByTestId("limite"), "");
    fireEvent.changeText(screen.getByTestId("sim-pessoas"), "3");
    expect(screen.getByTestId("sim-nova")).toHaveTextContent(/3 pessoas/);
    expect(screen.getByTestId("sim-total")).toHaveTextContent(/sem limite/);
  });

  it("editar: a própria campanha não conta duas vezes na simulação", async () => {
    m.listarCampanhas.mockResolvedValue([campanha({ max_redemptions: 5 })]);
    render(<Campanhas hoje="2026-10-16" />);
    fireEvent.press(await screen.findByTestId("editar-c1"));
    expect(screen.queryByTestId("sim-ativa-0")).toBeNull();
    expect(screen.getByTestId("sim-total")).toHaveTextContent(/Total \(1 campanha\)/);
  });

  it("funil: link não medido, conta, corte, resgates com o nome, o i e erro com tentar de novo", async () => {
    m.listarCampanhas.mockResolvedValue([campanha()]);
    m.lerFunil
      .mockRejectedValueOnce(new Error("Sem conexão"))
      .mockResolvedValueOnce({
        campaign_id: "c1",
        name: "Lançamento",
        type: "REFERRAL_BONUS",
        from: "2026-10-16T03:00:00Z",
        to: "2026-11-16T03:00:00Z",
        link_opened: null,
        link_opened_measured: false,
        accounts_created: 7,
        first_cut_done: 3,
        redeemed: 2,
        redeemers: [
          { name: "Ana", redeemed_at: "2026-10-17T12:00:00Z" },
          { name: "Bia", redeemed_at: "2026-10-19T12:00:00Z" },
        ],
      })
      .mockResolvedValueOnce({
        campaign_id: "c1",
        name: "Lançamento",
        type: "REFERRAL_BONUS",
        from: "2026-10-16T03:00:00Z",
        to: "2026-11-16T03:00:00Z",
        link_opened: 9,
        link_opened_measured: true,
        accounts_created: 0,
        first_cut_done: 0,
        redeemed: 0,
        redeemers: [],
      });
    render(<Campanhas hoje="2026-10-16" />);
    fireEvent.press(await screen.findByTestId("funil-abrir-c1"));
    expect(await screen.findByText("Sem conexão")).toBeTruthy();
    fireEvent.press(screen.getByTestId("tentar"));
    expect(await screen.findByText("não medido")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    const nomes = screen.getAllByText(/^(Ana|Bia) ·/).map((n) => String(n.props.children[0]));
    expect(nomes).toEqual(["Bia", "Ana"]);
    expect(screen.getByLabelText("Como é calculado: Funil da campanha")).toBeTruthy();
    fireEvent.press(screen.getByTestId("funil-abrir-c1"));
    expect(screen.queryByTestId("funil-c1")).toBeNull();
    fireEvent.press(screen.getByTestId("funil-abrir-c1"));
    expect(await screen.findByTestId("sem-resgates-c1")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
  });

  it("sem campanha nenhuma", async () => {
    m.listarCampanhas.mockResolvedValue([]);
    render(<Campanhas hoje="2026-10-16" />);
    expect(await screen.findByTestId("vazio")).toHaveTextContent(/A primeira nasce aqui/);
  });

  it("erro ao carregar e tentar de novo", async () => {
    m.listarCampanhas.mockRejectedValueOnce(new Error("Sem conexão")).mockResolvedValueOnce([campanha()]);
    render(<Campanhas hoje="2026-10-16" />);
    expect(await screen.findByText("Sem conexão")).toBeTruthy();
    fireEvent.press(screen.getByTestId("tentar"));
    expect(await screen.findByText("Lançamento")).toBeTruthy();
    expect(screen.queryByText("Sem conexão")).toBeNull();
  });

  it("pausar, retomar e encerrar (com confirmação)", async () => {
    m.listarCampanhas.mockResolvedValue([campanha()]);
    m.pausarCampanha.mockResolvedValue(campanha({ status: "PAUSED", active: false }));
    m.retomarCampanha.mockResolvedValue(campanha());
    m.encerrarCampanha.mockResolvedValue(campanha({ status: "ENDED" }));
    render(<Campanhas hoje="2026-10-16" />);
    fireEvent.press(await screen.findByTestId("pausar-c1"));
    fireEvent.press(await screen.findByTestId("retomar-c1"));
    expect(m.pausarCampanha).toHaveBeenCalledWith("c1");
    fireEvent.press(await screen.findByTestId("pausar-c1"));
    expect(m.retomarCampanha).toHaveBeenCalledWith("c1");
    await waitFor(() => expect(screen.getByTestId("encerrar-c1")).not.toBeDisabled());
    fireEvent.press(screen.getByTestId("encerrar-c1"));
    expect(m.encerrarCampanha).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("confirmar-c1"));
    await waitFor(() => expect(screen.getByText("Encerrada")).toBeTruthy());
    expect(m.encerrarCampanha).toHaveBeenCalledWith("c1");
  });

  it("ação que falha mostra o erro", async () => {
    m.listarCampanhas.mockResolvedValue([campanha()]);
    m.pausarCampanha.mockRejectedValue(new Error("A campanha ja terminou; crie outra."));
    render(<Campanhas hoje="2026-10-16" />);
    fireEvent.press(await screen.findByTestId("pausar-c1"));
    expect(await screen.findByText("A campanha ja terminou; crie outra.")).toBeTruthy();
  });

  it("criar volta para a lista com a nova no topo; editar troca a linha", async () => {
    m.listarCampanhas.mockResolvedValue([campanha()]);
    m.criarCampanha.mockResolvedValue(campanha({ id: "n1", name: "Nova" }));
    m.editarCampanha.mockResolvedValue(campanha({ name: "Lançamento 2" }));
    render(<Campanhas hoje="2026-10-16" />);
    await screen.findByText("Lançamento");

    fireEvent.press(screen.getByTestId("criar"));
    fireEvent.press(screen.getByTestId("cancelar"));
    fireEvent.press(screen.getByTestId("criar"));
    fireEvent.changeText(screen.getByTestId("nome"), "Nova");
    fireEvent.changeText(screen.getByTestId("valor"), "5");
    fireEvent.changeText(screen.getByTestId("fim"), "31102026");
    fireEvent.press(screen.getByTestId("salvar"));
    expect(await screen.findByText("Nova")).toBeTruthy();
    expect(screen.getByText("Criada agora")).toBeTruthy();

    fireEvent.press(screen.getByTestId("editar-c1"));
    expect(screen.getByText("Editar campanha")).toBeTruthy();
    fireEvent.press(screen.getByTestId("salvar"));
    expect(await screen.findByText("Lançamento 2")).toBeTruthy();
    expect(m.editarCampanha).toHaveBeenCalledWith("c1", expect.objectContaining({ name: "Lançamento" }));
  });

  it("se a lista ainda não veio, criar funciona igual", async () => {
    m.listarCampanhas.mockReturnValue(new Promise(() => {}));
    m.criarCampanha.mockResolvedValue(campanha({ id: "n1", name: "Nova" }));
    render(<Campanhas hoje="2026-10-16" />);
    fireEvent.press(screen.getByTestId("criar"));
    fireEvent.changeText(screen.getByTestId("nome"), "Nova");
    fireEvent.press(screen.getByTestId("beneficio-taxa-zero"));
    fireEvent.changeText(screen.getByTestId("fim"), "31102026");
    fireEvent.press(screen.getByTestId("salvar"));
    expect(await screen.findByText("Nova")).toBeTruthy();
  });

  it("editar antes da lista chegar não quebra", async () => {
    let resolver: (l: Campaign[]) => void = () => {};
    m.listarCampanhas.mockReturnValue(new Promise((r) => (resolver = r)));
    m.editarCampanha.mockResolvedValue(campanha({ name: "Lançamento 2" }));
    m.pausarCampanha.mockResolvedValue(campanha({ status: "PAUSED" }));
    const { rerender } = render(<Campanhas hoje="2026-10-16" />);
    resolver([campanha()]);
    fireEvent.press(await screen.findByTestId("editar-c1"));
    rerender(<Campanhas hoje="2026-10-16" />);
    fireEvent.press(screen.getByTestId("salvar"));
    expect(await screen.findByText("Lançamento 2")).toBeTruthy();
  });
});

describe("CampanhaForm", () => {
  const props = { hoje: "2026-10-16", onPronto: jest.fn(), onCancelar: jest.fn() };

  it("valida no campo antes de mandar", () => {
    render(<CampanhaForm {...props} />);
    fireEvent.press(screen.getByTestId("salvar"));
    expect(screen.getByText("Dê um nome à campanha.")).toBeTruthy();
    expect(m.criarCampanha).not.toHaveBeenCalled();
  });

  it("link mostra os parâmetros da bonificação (DEC-73) e manda REFERRAL_BONUS", async () => {
    m.criarCampanha.mockResolvedValue(campanha());
    render(<CampanhaForm {...props} />);
    expect(screen.getByTestId("aviso-beneficio")).toHaveTextContent(/desconto/);
    fireEvent.press(screen.getByTestId("modo-link"));
    expect(screen.getByTestId("aviso-beneficio")).toHaveTextContent(/dinheiro/);
    expect(screen.getByTestId("parametros-bonificacao")).toBeTruthy();
    expect(screen.queryByTestId("beneficio")).toBeNull();
    expect(screen.getByText("Valor por corte (R$)")).toBeTruthy();
    fireEvent.press(screen.getByTestId("visibilidade-PRIVATE"));
    expect(screen.getByText("Código do cupom")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("nome"), "Indique");
    fireEvent.changeText(screen.getByTestId("descricao"), "d");
    fireEvent.changeText(screen.getByTestId("codigo"), "INDIQUE");
    fireEvent.changeText(screen.getByTestId("valor"), "300");
    fireEvent.changeText(screen.getByTestId("inicio"), "17102026");
    fireEvent.changeText(screen.getByTestId("fim"), "31102026");
    fireEvent.changeText(screen.getByTestId("limite"), "50");
    fireEvent.press(screen.getByTestId("salvar"));
    expect(screen.getByText("Escolha quem conta.")).toBeTruthy();
    expect(screen.getByText("Escolha semanal ou mensal.")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("pct-profissional"), "70");
    fireEvent.changeText(screen.getByTestId("pct-dono"), "30");
    fireEvent.press(screen.getByTestId("quem-conta-REFERRER_ESTABLISHMENT"));
    fireEvent.press(screen.getByTestId("pagamento-WEEKLY"));
    fireEvent.press(screen.getByTestId("salvar"));
    expect(screen.getByText("Escolha o dia da semana.")).toBeTruthy();
    fireEvent.press(screen.getByTestId("dia-semana-5"));
    fireEvent.press(screen.getByTestId("pagamento-MONTHLY"));
    fireEvent.press(screen.getByTestId("salvar"));
    expect(screen.getByText("Um dia de 1 a 28.")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("dia-mes"), "10");
    fireEvent.press(screen.getByTestId("publico-PROFESSIONAL"));
    fireEvent.press(screen.getByTestId("novos-sim"));
    fireEvent.press(screen.getByTestId("dias-SATURDAY"));
    fireEvent.press(screen.getByTestId("dias-MONDAY"));
    fireEvent.press(screen.getByTestId("dias-SATURDAY"));
    fireEvent.press(screen.getByTestId("salvar"));
    await waitFor(() => expect(props.onPronto).toHaveBeenCalled());
    expect(m.criarCampanha).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "REFERRAL_BONUS",
        visibility: "PRIVATE",
        code: "INDIQUE",
        audience: "PROFESSIONAL",
        value_amount: 3,
        max_redemptions: 50,
        weekdays: "MONDAY",
        new_clients_only: true,
        description: "d",
        starts_at: "2026-10-17T00:00:00-03:00",
        referral_professional_percent: 70,
        referral_owner_percent: 30,
        referral_scope: "REFERRER_ESTABLISHMENT",
        payout_period: "MONTHLY",
        payout_day: 10,
      }),
    );
  }, 20000);

  it("as máscaras aceitam só o que o campo permite", () => {
    render(<CampanhaForm {...props} />);
    fireEvent.changeText(screen.getByTestId("inicio"), "17ab102026999");
    expect(screen.getByTestId("inicio").props.value).toBe("17/10/2026");
    fireEvent.changeText(screen.getByTestId("valor"), "1250");
    expect(screen.getByTestId("valor").props.value).toBe("12,50");
    fireEvent.press(screen.getByTestId("beneficio-porcento"));
    fireEvent.changeText(screen.getByTestId("valor"), "150,567");
    expect(screen.getByTestId("valor").props.value).toBe("100");
    fireEvent.changeText(screen.getByTestId("limite"), "12a3");
    expect(screen.getByTestId("limite").props.value).toBe("123");
    fireEvent.press(screen.getByTestId("modo-link"));
    fireEvent.changeText(screen.getByTestId("pct-profissional"), "7x0,555");
    expect(screen.getByTestId("pct-profissional").props.value).toBe("70,55");
    fireEvent.press(screen.getByTestId("pagamento-MONTHLY"));
    fireEvent.changeText(screen.getByTestId("dia-mes"), "2a8z9");
    expect(screen.getByTestId("dia-mes").props.value).toBe("28");
  });

  it("os rótulos do valor seguem o benefício", () => {
    render(<CampanhaForm {...props} />);
    expect(screen.getByText("Desconto (R$)")).toBeTruthy();
    fireEvent.press(screen.getByTestId("beneficio-porcento"));
    expect(screen.getByText("Desconto (%)")).toBeTruthy();
    fireEvent.press(screen.getByTestId("beneficio-taxa-zero"));
    expect(screen.queryByTestId("valor")).toBeNull();
    fireEvent.press(screen.getByTestId("cancelar"));
    expect(props.onCancelar).toHaveBeenCalled();
  });

  it("cupom já usado cai no campo do código; outro erro, embaixo", async () => {
    render(<CampanhaForm {...props} campanha={campanha({ code: "X" })} />);
    m.editarCampanha.mockRejectedValueOnce(new ApiError(409, "CAMPAIGN_CODE_TAKEN", "Este cupom ja e de outra campanha."));
    fireEvent.press(screen.getByTestId("salvar"));
    expect(await screen.findByText("Este cupom ja e de outra campanha.")).toBeTruthy();
    m.editarCampanha.mockRejectedValueOnce(new ApiError(422, "CAMPAIGN_INVALID", "O limite nao pode ficar abaixo de quem ja aceitou (37)."));
    fireEvent.press(screen.getByTestId("salvar"));
    expect(await screen.findByRole("alert")).toHaveTextContent("O limite nao pode ficar abaixo de quem ja aceitou (37).");
  });
});
