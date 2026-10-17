import { api } from "./api";

// Contrato do Backend: convite e usuários do painel (BAK-13, 5aaf3a6). Tudo exige a permissão ADMIN_USERS.
export const PERMISSOES = [
  "OVERVIEW",
  "USERS",
  "ESTABLISHMENTS",
  "FINANCE",
  "CAMPAIGNS",
  "SUPPORT",
  "ALERTS",
  "AUDIT",
  "ADMIN_USERS",
] as const;
export type Permissao = (typeof PERMISSOES)[number];

export const NOME_PERMISSAO: Record<Permissao, string> = {
  OVERVIEW: "Hoje",
  USERS: "Usuários",
  ESTABLISHMENTS: "Estabelecimentos",
  FINANCE: "Dinheiro",
  CAMPAIGNS: "Campanhas",
  SUPPORT: "Suporte",
  ALERTS: "Alertas",
  AUDIT: "Auditoria",
  ADMIN_USERS: "Acessos",
};

export type Convite = { id: string; email: string; permissions: Permissao[]; expires_at?: string };
export type UsuarioDoPainel = {
  id: string;
  name: string;
  email: string;
  owner: boolean;
  permissions: Permissao[];
  totp_enabled: boolean;
};

export const listarConvites = () => api<Convite[]>("/admin/invitations");
export const convidar = (email: string, permissions: Permissao[]) =>
  api<Convite>("/admin/invitations", { method: "POST", body: { email: email.trim(), permissions } });
export const cancelarConvite = (id: string) => api<null>(`/admin/invitations/${id}`, { method: "DELETE" });
export const listarUsuariosDoPainel = () => api<UsuarioDoPainel[]>("/admin/users-admin");
export const mudarPermissoes = (id: string, permissions: Permissao[]) =>
  api<UsuarioDoPainel>(`/admin/users-admin/${id}`, { method: "PATCH", body: { permissions } });
export const revogarAcesso = (id: string) => api<null>(`/admin/users-admin/${id}`, { method: "DELETE" });
/** Público: o convidado define a senha; depois entra e cadastra o Authenticator. */
export const aceitarConvite = (token: string, password: string) =>
  api<{ email: string; next: string }>("/admin/invitations/accept", {
    method: "POST",
    body: { token, password },
    auth: false,
  });

/** Liga ou desliga uma permissão na lista, na ordem do contrato. */
export function alternar(atuais: Permissao[], p: Permissao): Permissao[] {
  const novas = atuais.includes(p) ? atuais.filter((x) => x !== p) : [...atuais, p];
  return PERMISSOES.filter((x) => novas.includes(x));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarConvite(email: string, permissoes: Permissao[]): { email?: string; permissoes?: string } {
  return {
    email: EMAIL.test(email.trim()) ? undefined : "Digite um e-mail válido.",
    permissoes: permissoes.length ? undefined : "Marque pelo menos uma tela.",
  };
}

/** Mensagem na língua do André para os códigos do Backend. */
export function mensagemDeAcesso(code: string | null, padrao: string): string {
  switch (code) {
    case "ADMIN_PERMISSION_DENIED":
      return "Você não tem permissão para esta tela. Peça a quem administra os acessos.";
    case "ADMIN_ALREADY_MEMBER":
      return "Este e-mail já usa o painel.";
    case "ADMIN_PERMISSIONS_REQUIRED":
      return "Marque pelo menos uma tela.";
    case "ADMIN_OWNER_PROTECTED":
      return "O dono do painel não pode ser alterado.";
    case "ADMIN_SELF_CHANGE":
      return "Você não pode mudar o seu próprio acesso.";
    case "ADMIN_INVITATION_INVALID":
      return "Este convite venceu ou já foi usado. Peça um novo.";
    default:
      return padrao;
  }
}
