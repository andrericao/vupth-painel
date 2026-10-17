import { api, ApiError } from "./api";
import { liberarSessao, limparSessao, salvarSessao, trocarToken, type Sessao } from "./session";

type LoginResposta = {
  user: {
    first_name?: string;
    last_name?: string;
    email?: string;
    user_roles?: { role_type: string; is_active: boolean | null }[];
  } | null;
  tokens: { access_token: string; refresh_token: string } | null;
};

export function ehAdmin(resposta: LoginResposta): boolean {
  return (resposta.user?.user_roles ?? []).some((r) => r.role_type === "ADMIN" && r.is_active !== false);
}

/**
 * Entra com e-mail e senha (POST /auth/login) e só aceita o papel ADMIN.
 * O código do Google Authenticator ainda não existe no Backend (BAK painel-de-monitoramento):
 * quando existir, ele entra aqui.
 */
export async function entrar(email: string, senha: string): Promise<Sessao> {
  const resposta = await api<LoginResposta>("/auth/login", {
    method: "POST",
    body: { email: email.trim(), password: senha },
    auth: false,
  });
  if (!resposta?.tokens?.access_token || !ehAdmin(resposta)) {
    throw new ApiError(403, "NOT_ADMIN", "Esta conta não tem acesso ao painel.");
  }
  const nome = [resposta.user?.first_name, resposta.user?.last_name].filter(Boolean).join(" ");
  return salvarSessao({
    accessToken: resposta.tokens.access_token,
    refreshToken: resposta.tokens.refresh_token,
    nome: nome || email.trim(),
    email: resposta.user?.email ?? email.trim(),
    pendente: true,
  });
}

/* ───────── Segundo fator (Google Authenticator) — BAK-13, 3e4d261 ───────── */

export type Etapa = "pronto" | "configurar" | "codigo";
type TokenDoPainel = { access_token: string; expires_in: number };
export type Configuracao = { secret: string; otpauth_uri: string };

/** Depois da senha: já aberto (fator desligado), cadastrar o Authenticator ou pedir o código. */
export async function etapaDoSegundoFator(): Promise<Etapa> {
  const st = await api<{ totp_enabled: boolean; verified: boolean }>("/admin/auth/status");
  if (st.verified) {
    liberarSessao();
    return "pronto";
  }
  return st.totp_enabled ? "codigo" : "configurar";
}

export const iniciarConfiguracao = () => api<Configuracao>("/admin/auth/totp/setup", { method: "POST" });

/** Confirma o primeiro código: devolve os 8 códigos de recuperação, que só aparecem agora. */
export async function confirmarConfiguracao(code: string): Promise<string[]> {
  const r = await api<TokenDoPainel & { recovery_codes: string[] }>("/admin/auth/totp/confirm", {
    method: "POST",
    body: { code: code.trim() },
  });
  trocarToken(r.access_token, r.expires_in, false);
  return r.recovery_codes;
}

/** O código de 6 dígitos ou um de recuperação ("ABCDE-FGHJK"). */
export async function verificarCodigo(code: string): Promise<void> {
  const r = await api<TokenDoPainel>("/admin/auth/totp/verify", { method: "POST", body: { code: code.trim() } });
  trocarToken(r.access_token, r.expires_in, true);
}

export { liberarSessao as concluirEntrada };

export function sair(): void {
  limparSessao();
}
