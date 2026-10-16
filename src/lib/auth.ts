import { api, ApiError } from "./api";
import { limparSessao, salvarSessao, type Sessao } from "./session";

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
  });
}

export function sair(): void {
  limparSessao();
}
