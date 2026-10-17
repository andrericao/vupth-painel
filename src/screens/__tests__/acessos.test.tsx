import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import * as A from "../../lib/acessos";
import { ApiError } from "../../lib/api";
import { Acessos } from "../Acessos";
import { Convite } from "../Convite";

jest.mock("../../lib/acessos", () => ({
  ...jest.requireActual("../../lib/acessos"),
  listarConvites: jest.fn(),
  convidar: jest.fn(),
  cancelarConvite: jest.fn(),
  listarUsuariosDoPainel: jest.fn(),
  mudarPermissoes: jest.fn(),
  revogarAcesso: jest.fn(),
  aceitarConvite: jest.fn(),
}));
const m = A as jest.Mocked<typeof A>;

const dono: A.UsuarioDoPainel = { id: "d", name: "André", email: "a@b.c", owner: true, permissions: [], totp_enabled: true };
const ana: A.UsuarioDoPainel = { id: "u1", name: "Ana", email: "ana@b.c", owner: false, permissions: ["USERS"], totp_enabled: false };
const convite: A.Convite = { id: "i1", email: "novo@b.c", permissions: ["AUDIT"], expires_at: "2026-10-24T12:00:00Z" };

beforeEach(() => {
  jest.clearAllMocks();
  m.listarUsuariosDoPainel.mockResolvedValue([dono, ana]);
  m.listarConvites.mockResolvedValue([convite]);
});

describe("Acessos", () => {
  it("lista quem usa o painel e os convites", async () => {
    render(<Acessos />);
    expect(screen.getByTestId("carregando")).toBeTruthy();
    expect(await screen.findByText("André · dono")).toBeTruthy();
    expect(screen.getByText("Vê tudo")).toBeTruthy();
    expect(screen.getByText("a@b.c · Authenticator ativo")).toBeTruthy();
    expect(screen.getByText("ana@b.c · sem Authenticator ainda")).toBeTruthy();
    expect(screen.getByText("2 no painel · 1 convite(s) pendente(s)")).toBeTruthy();
    expect(screen.queryByTestId("editar-d")).toBeNull();
  });

  it("sem permissão (403) vira aviso e dá para tentar de novo", async () => {
    m.listarUsuariosDoPainel.mockRejectedValueOnce(new ApiError(403, "ADMIN_PERMISSION_DENIED", "x"));
    render(<Acessos />);
    expect(await screen.findByText(/Você não tem permissão/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("tentar"));
    expect(await screen.findByText("André · dono")).toBeTruthy();
  });

  it("erro genérico mostra a mensagem", async () => {
    m.listarUsuariosDoPainel.mockRejectedValueOnce(new Error("caiu"));
    render(<Acessos />);
    expect(await screen.findByText("caiu")).toBeTruthy();
  });

  it("convida: valida, envia e põe nos pendentes", async () => {
    m.convidar.mockResolvedValue({ id: "i2", email: "x@y.co", permissions: ["USERS", "AUDIT"] });
    render(<Acessos />);
    await screen.findByText("André · dono");
    fireEvent.press(screen.getByTestId("convidar"));
    expect(screen.getByText("Digite um e-mail válido.")).toBeTruthy();
    expect(screen.getByText("Marque pelo menos uma tela.")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("convite-email"), "x@y.co");
    fireEvent.press(screen.getByTestId("convite-perm-AUDIT"));
    fireEvent.press(screen.getByTestId("convite-perm-USERS"));
    fireEvent.press(screen.getByTestId("convidar"));
    expect(await screen.findByText(/Convite enviado para x@y.co/)).toBeTruthy();
    expect(m.convidar).toHaveBeenCalledWith("x@y.co", ["USERS", "AUDIT"]);
    expect(screen.getByText("x@y.co")).toBeTruthy();
    expect(screen.getByTestId("convite-email").props.value).toBe("");
  });

  it("convite de quem já usa o painel (409) aparece no cartão", async () => {
    m.convidar.mockRejectedValueOnce(new ApiError(409, "ADMIN_ALREADY_MEMBER", "x"));
    render(<Acessos />);
    await screen.findByText("André · dono");
    fireEvent.changeText(screen.getByTestId("convite-email"), "ana@b.c");
    fireEvent.press(screen.getByTestId("convite-perm-USERS"));
    fireEvent.press(screen.getByTestId("convidar"));
    expect(await screen.findByText("Este e-mail já usa o painel.")).toBeTruthy();
  });

  it("cancela um convite; se falhar, avisa", async () => {
    m.cancelarConvite.mockRejectedValueOnce(new Error("não deu"));
    render(<Acessos />);
    await screen.findByText("novo@b.c");
    fireEvent.press(screen.getByTestId("cancelar-i1"));
    expect(await screen.findByText("não deu")).toBeTruthy();
    m.cancelarConvite.mockResolvedValueOnce(null);
    fireEvent.press(screen.getByTestId("cancelar-i1"));
    await waitFor(() => expect(screen.queryByText("novo@b.c")).toBeNull());
  });

  it("muda as permissões de alguém", async () => {
    m.mudarPermissoes.mockResolvedValue({ ...ana, permissions: ["USERS", "FINANCE"] });
    render(<Acessos />);
    await screen.findByText("Ana");
    fireEvent.press(screen.getByTestId("editar-u1"));
    fireEvent.press(screen.getByTestId("perm-u1-FINANCE"));
    fireEvent.press(screen.getByTestId("salvar-u1"));
    await waitFor(() => expect(m.mudarPermissoes).toHaveBeenCalledWith("u1", ["USERS", "FINANCE"]));
    expect(await screen.findByText("Usuários · Dinheiro")).toBeTruthy();
    expect(screen.queryByTestId("salvar-u1")).toBeNull();
  });

  it("não salva sem nenhuma tela, e mostra o erro do Backend", async () => {
    render(<Acessos />);
    await screen.findByText("Ana");
    fireEvent.press(screen.getByTestId("editar-u1"));
    fireEvent.press(screen.getByTestId("perm-u1-USERS"));
    fireEvent.press(screen.getByTestId("salvar-u1"));
    expect(screen.getByText("Marque pelo menos uma tela.")).toBeTruthy();
    expect(m.mudarPermissoes).not.toHaveBeenCalled();
    m.mudarPermissoes.mockRejectedValueOnce(new ApiError(409, "ADMIN_SELF_CHANGE", "x"));
    fireEvent.press(screen.getByTestId("perm-u1-AUDIT"));
    fireEvent.press(screen.getByTestId("salvar-u1"));
    expect(await screen.findByText(/não pode mudar o seu próprio acesso/)).toBeTruthy();
  });

  it("tirar o acesso pede confirmação", async () => {
    m.revogarAcesso.mockResolvedValue(null);
    render(<Acessos />);
    await screen.findByText("Ana");
    fireEvent.press(screen.getByTestId("revogar-u1"));
    expect(m.revogarAcesso).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("confirmar-u1"));
    await waitFor(() => expect(screen.queryByText("Ana")).toBeNull());
    expect(m.revogarAcesso).toHaveBeenCalledWith("u1");
  });

  it("falha ao tirar o acesso volta ao botão e avisa", async () => {
    m.revogarAcesso.mockRejectedValueOnce(new ApiError(409, "ADMIN_OWNER_PROTECTED", "x"));
    render(<Acessos />);
    await screen.findByText("Ana");
    fireEvent.press(screen.getByTestId("revogar-u1"));
    fireEvent.press(screen.getByTestId("confirmar-u1"));
    expect(await screen.findByText(/dono do painel não pode/)).toBeTruthy();
  });
});

describe("Convite (tela do convidado)", () => {
  it("sem token, avisa", () => {
    render(<Convite onEntrar={jest.fn()} />);
    expect(screen.getByText(/link de convite está incompleto/)).toBeTruthy();
  });

  it("valida a senha, define e leva ao Entrar", async () => {
    m.aceitarConvite.mockResolvedValue({ email: "novo@b.c", next: "TOTP_SETUP" });
    const onEntrar = jest.fn();
    render(<Convite token="tok" onEntrar={onEntrar} />);
    fireEvent.press(screen.getByTestId("definir"));
    expect(screen.getByText("Digite a senha.")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("nova-senha"), "abc");
    fireEvent.press(screen.getByTestId("definir"));
    expect(screen.getByText("De 6 a 64 caracteres.", { exact: true })).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("nova-senha"), "senha123");
    fireEvent.changeText(screen.getByTestId("repete-senha"), "outra123");
    fireEvent.press(screen.getByTestId("definir"));
    expect(screen.getByText("As senhas são diferentes.")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("repete-senha"), "senha123");
    fireEvent.press(screen.getByTestId("definir"));
    expect(await screen.findByText("Senha definida para novo@b.c.")).toBeTruthy();
    expect(m.aceitarConvite).toHaveBeenCalledWith("tok", "senha123");
    fireEvent.press(screen.getByTestId("ir-entrar"));
    expect(onEntrar).toHaveBeenCalled();
  });

  it("senha fora da regra (422) vai ao campo; convite vencido e sem rede viram aviso", async () => {
    render(<Convite token="tok" onEntrar={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId("nova-senha"), "senha123");
    fireEvent.changeText(screen.getByTestId("repete-senha"), "senha123");
    m.aceitarConvite.mockRejectedValueOnce(new ApiError(422, "PASSWORD_TOO_LONG", "Senha longa demais."));
    fireEvent.press(screen.getByTestId("definir"));
    expect(await screen.findByText("Senha longa demais.")).toBeTruthy();
    m.aceitarConvite.mockRejectedValueOnce(new ApiError(410, "ADMIN_INVITATION_INVALID", "x"));
    fireEvent.press(screen.getByTestId("definir"));
    expect(await screen.findByText(/venceu ou já foi usado/)).toBeTruthy();
    m.aceitarConvite.mockRejectedValueOnce(new ApiError(0, null, "Sem conexão com o servidor."));
    fireEvent.press(screen.getByTestId("definir"));
    expect(await screen.findByText("Sem conexão com o servidor.")).toBeTruthy();
    m.aceitarConvite.mockRejectedValueOnce(new Error("outro"));
    fireEvent.press(screen.getByTestId("definir"));
    expect(await screen.findByText("outro")).toBeTruthy();
  });
});
