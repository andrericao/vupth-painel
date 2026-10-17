import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ApiError } from "../../lib/api";
import { entrar } from "../../lib/auth";
import * as C from "../../lib/campaigns";
import type { Campaign } from "../../lib/campaigns";
import { CampanhaForm } from "../CampanhaForm";
import { Campanhas } from "../Campanhas";
import { Entrar } from "../Entrar";

jest.mock("../../lib/auth", () => ({ entrar: jest.fn() }));
jest.mock("../../lib/campaigns", () => ({
  ...jest.requireActual("../../lib/campaigns"),
  listarCampanhas: jest.fn(),
  criarCampanha: jest.fn(),
  editarCampanha: jest.fn(),
  pausarCampanha: jest.fn(),
  retomarCampanha: jest.fn(),
  encerrarCampanha: jest.fn(),
}));

const m = C as jest.Mocked<typeof C>;
const entrarMock = entrar as jest.Mock;

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

beforeEach(() => jest.clearAllMocks());

describe("Entrar", () => {
  it("pede e-mail e senha antes de chamar", () => {
    render(<Entrar onEntrou={jest.fn()} />);
    fireEvent.press(screen.getByTestId("entrar"));
    expect(screen.getByText("Digite o e-mail.")).toBeTruthy();
    expect(screen.getByText("Digite a senha.")).toBeTruthy();
    expect(entrarMock).not.toHaveBeenCalled();
  });

  it("entra e avisa", async () => {
    entrarMock.mockResolvedValue({});
    const onEntrou = jest.fn();
    render(<Entrar onEntrou={onEntrou} />);
    fireEvent.changeText(screen.getByTestId("email"), "a@b.c");
    fireEvent.changeText(screen.getByTestId("senha"), "x");
    fireEvent.changeText(screen.getByTestId("codigo"), "123");
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
    fireEvent.press(screen.getByTestId("senha-ver"));
    expect(screen.getByTestId("senha").props.secureTextEntry).toBe(false);
    fireEvent.press(screen.getByTestId("senha-ver"));
    expect(screen.getByTestId("senha").props.secureTextEntry).toBe(true);
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
    fireEvent.changeText(screen.getByTestId("fim"), "2026-10-31");
    fireEvent.press(screen.getByTestId("salvar"));
    expect(await screen.findByText("Nova")).toBeTruthy();

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
    fireEvent.changeText(screen.getByTestId("fim"), "2026-10-31");
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
    fireEvent.press(screen.getByTestId("modo-link"));
    expect(screen.getByTestId("parametros-bonificacao")).toBeTruthy();
    expect(screen.queryByTestId("beneficio")).toBeNull();
    expect(screen.getByText("Valor por corte (R$)")).toBeTruthy();
    fireEvent.press(screen.getByTestId("visibilidade-PRIVATE"));
    expect(screen.getByText("Código do cupom")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("nome"), "Indique");
    fireEvent.changeText(screen.getByTestId("descricao"), "d");
    fireEvent.changeText(screen.getByTestId("codigo"), "INDIQUE");
    fireEvent.changeText(screen.getByTestId("valor"), "3");
    fireEvent.changeText(screen.getByTestId("inicio"), "2026-10-17");
    fireEvent.changeText(screen.getByTestId("fim"), "2026-10-31");
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
