import { api } from "./api";

// Contrato do Backend: leituras do painel (ab87121, 208d75f, 32ac726). Cada rota exige a sua permissão (403 ADMIN_PERMISSION_DENIED).
export type Janela = { from: string; to: string };
export type Funil = {
  signups: number;
  attendances_created: number;
  finished: number;
  cancelled: number;
  removed: number;
  late: number;
};
export type Dinheiro = {
  gross_revenue: number;
  professionals_net: number;
  gateway_fee: number;
  app_fee: number;
  pending_amount: number;
  awaiting_amount: number;
  paid_amount: number;
  penalties_generated: number;
  penalties_charged: number;
};
export type Overview = {
  period: Janela;
  compare_period: Janela;
  health: { open_stores: number; professionals_working: number; active_attendances: number };
  funnel: Funil;
  funnel_compare: Funil;
  money: Dinheiro;
  money_compare: Dinheiro;
};
export type Serie = { metric: string; granularity: string; points: { at: string; value: number }[] };
export type Financeiro = {
  period: Janela;
  money: Dinheiro;
  by_payment_status: { status: string; count: number; amount: number }[];
  referral: { credits_total: number; credits_paid: number; credits_unpaid: number };
};
export type Alertas = {
  payments_stuck_hours: number;
  payments_stuck_count: number;
  payments_stuck_amount: number;
  payments_stuck: { attendance_id: string; amount: number; finished_at: string }[];
  referral_unpaid_count: number;
  referral_unpaid_amount: number;
  not_measured: string[];
};
export type Pagina<T> = { items: T[]; page: number; size: number; total: number };
export type UsuarioLinha = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  active: boolean;
  deleted: boolean;
  created_at: string;
};
export type LojaLinha = {
  id: string;
  name: string;
  status: string;
  open_status: string;
  owner_id: string;
  owner_name: string;
  professionals: number;
  created_at: string;
};
export type AuditoriaLinha = {
  id: string;
  admin_id: string;
  admin_email: string;
  method: string;
  path: string;
  query?: string;
  body?: string;
  status: number;
  created_at: string;
};

export type MensagemSuporte = {
  id: string;
  name: string;
  email: string;
  profile?: string;
  category?: string;
  subject?: string;
  message: string;
  created_at: string;
};

export const TAMANHO_PAGINA = 20;

function consulta(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const lerOverview = () => api<Overview>("/admin/overview");
export const lerSerie = (metric: "cuts" | "signups" | "revenue", granularity: "hour" | "day") =>
  api<Serie>(`/admin/series${consulta({ metric, granularity })}`);
export const lerFinanceiro = (from?: string, to?: string) =>
  api<Financeiro>(`/admin/finance${consulta({ from, to })}`);
export const lerAlertas = (hours: number) => api<Alertas>(`/admin/alerts${consulta({ hours })}`);
export const listarUsuarios = (q: string, page: number) =>
  api<Pagina<UsuarioLinha>>(`/admin/users${consulta({ q: q.trim(), page, size: TAMANHO_PAGINA })}`);
export const listarLojas = (q: string, page: number) =>
  api<Pagina<LojaLinha>>(`/admin/establishments${consulta({ q: q.trim(), page, size: TAMANHO_PAGINA })}`);
export const listarSuporte = (page: number) =>
  api<Pagina<MensagemSuporte>>(`/admin/support/messages${consulta({ page, size: TAMANHO_PAGINA })}`);
export const listarAuditoria = (page: number) =>
  api<Pagina<AuditoriaLinha>>(`/admin/audit${consulta({ page, size: TAMANHO_PAGINA })}`);

/** Diferença contra o período de comparação: "+3", "−2" ou "igual". */
export function variacao(agora: number, antes: number): string {
  const d = Math.round((agora - antes) * 100) / 100;
  if (d === 0) return "igual";
  const n = Math.abs(d).toLocaleString("pt-BR");
  return d > 0 ? `+${n}` : `−${n}`;
}

/** As telas do menu e a permissão que cada uma pede (Hoje = OVERVIEW etc.). */
export const PERMISSAO_DA_ROTA: Record<string, string> = {
  "/": "OVERVIEW",
  "/usuarios": "USERS",
  "/estabelecimentos": "ESTABLISHMENTS",
  "/campanhas": "CAMPAIGNS",
  "/dinheiro": "FINANCE",
  "/suporte": "SUPPORT",
  "/alertas": "ALERTS",
  "/auditoria": "AUDIT",
  "/acessos": "ADMIN_USERS",
};

export function podeVer(rota: string, permissoes?: string[]): boolean {
  if (!permissoes) return true;
  const p = PERMISSAO_DA_ROTA[rota];
  return !p || permissoes.includes(p);
}

/** "ana@gmail.com" → "a***@gmail.com": o e-mail só aparece inteiro depois do clique. */
export function mascararEmail(email: string): string {
  const [usuario, dominio] = email.split("@");
  if (!dominio) return "***";
  return `${usuario.slice(0, 1)}***@${dominio}`;
}
