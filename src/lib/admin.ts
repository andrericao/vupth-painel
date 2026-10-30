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
  pilot?: { attendances: number; amount: number };
};
export type SerieHoraria = { last_hour: number; last_24h: number; by_hour: { hour: string; count: number }[] };
export type Alertas = {
  payments_stuck_hours: number;
  payments_stuck_count: number;
  payments_stuck_amount: number;
  payments_stuck: { attendance_id: string; amount: number; finished_at: string }[];
  referral_unpaid_count: number;
  referral_unpaid_amount: number;
  push_refused?: SerieHoraria;
  http_5xx?: SerieHoraria;
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
  active_test_id?: string | null;
  active_test_name?: string | null;
  created_at: string;
};

export type LojaDoTeste = { establishment_id: string; establishment_name: string; joined_at: string; left_at?: string | null };
export type Teste = {
  id: string;
  name: string;
  started_at: string;
  ended_at?: string | null;
  active: boolean;
  attendances: number;
  symbolic_amount: number;
  establishments: LojaDoTeste[];
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

export type TipoMulta = "LATE_ARRIVAL" | "NO_SHOW" | "LATE_CANCEL" | "PAYMENT_PENDING";
export type MultaLinha = {
  id: string;
  type: TipoMulta;
  client_id: string;
  client_name: string;
  establishment_id: string;
  establishment_name: string;
  amount: number;
  state: "GENERATED" | "CHARGED";
  attendance_id?: string;
  test: boolean;
  created_at: string;
};

export type DividaLinha = { professional_id: string; amount: number; simulated: boolean };

/** Prêmio do compartilhe e ganhe que espera a liberação do André (GET /admin/referrals/pending-release). */
export type PremioPendente = {
  campaign_id: string;
  campaign_name: string;
  beneficiary_id: string;
  beneficiary_name?: string;
  amount: number;
  credits: number;
};

/** GET /admin/finance/app-balance (FINANCE): o que o app deve, quem recebe e o que depositar no Asaas. */
export type SaldoDoApp = {
  owed_total: number;
  pending_release_total: number;
  beneficiaries: { beneficiary_id: string; beneficiary_name?: string; amount: number; credits: number }[];
  asaas_connected: boolean;
  app_balance?: number;
  deposit_needed?: number;
  asaas_error?: string;
};

/** Uma cobrança do relatório do sandbox: para onde vai cada centavo (GET /admin/finance/asaas/sandbox/report). */
export type CobrancaAsaas = {
  payment_id: string;
  attendance_id?: string;
  billing_type?: string;
  status?: string;
  list_price?: number;
  coupon_discount?: number;
  bonus?: number;
  professional_planned?: number;
  asaas_fee_real?: number;
  fee_charged_in_price?: number;
  fee_leftover?: number;
  app_net?: number;
  difference_cents?: number;
  note?: string;
};

export type RelatorioAsaas = {
  payments: CobrancaAsaas[];
  totals: { client_paid: number; asaas_fee_real: number; professional_planned: number; app_net: number };
};

export type ConexaoAsaas = { connected: boolean; mode: string; configured: boolean };

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
export const listarTestes = (q: string, page: number) =>
  api<Pagina<Teste>>(`/admin/test-runs${consulta({ q: q.trim(), page, size: TAMANHO_PAGINA })}`);
export const iniciarTeste = (name: string, establishment_ids: string[]) =>
  api<Teste>("/admin/test-runs", { method: "POST", body: { name: name.trim(), establishment_ids } });
export const tirarDoTeste = (testeId: string, lojaId: string) =>
  api<Teste>(`/admin/test-runs/${testeId}/establishments/${lojaId}`, { method: "DELETE" });
export const finalizarTeste = (testeId: string) => api<Teste>(`/admin/test-runs/${testeId}/end`, { method: "POST" });
export const lerDividaReal = () => api<{ real: boolean }>("/admin/settings/debt");
export const mudarDividaReal = (real: boolean) => api<{ real: boolean }>("/admin/settings/debt", { method: "PUT", body: { real } });
export const listarDividas = () => api<DividaLinha[]>("/admin/debts");
export const quitarDivida = (professionalId: string) =>
  api<{ settled_amount: number }>(`/admin/debts/${professionalId}/settle`, { method: "POST" });
export const listarPremiosPendentes = () => api<PremioPendente[]>("/admin/referrals/pending-release");
export const liberarPremio = (campaign_id: string, beneficiary_id?: string) =>
  api<{ released_credits: number; released_at: string }>("/admin/referrals/release", { method: "POST", body: { campaign_id, beneficiary_id } });
export const lerSaldoDoApp = () => api<SaldoDoApp>("/admin/finance/app-balance");
export const lerConexaoAsaas = () => api<ConexaoAsaas>("/admin/settings/asaas-connection");
export const lerRelatorioAsaas = () => api<RelatorioAsaas>("/admin/finance/asaas/sandbox/report");
export const listarSuporte = (page: number) =>
  api<Pagina<MensagemSuporte>>(`/admin/support/messages${consulta({ page, size: TAMANHO_PAGINA })}`);
export const listarMultas = (type: TipoMulta | "", test: "" | "false" | "true", q: string, page: number) =>
  api<Pagina<MultaLinha>>(`/admin/multas${consulta({ type, test, q: q.trim(), page, size: TAMANHO_PAGINA })}`);
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
  "/testes": "ESTABLISHMENTS",
  "/dinheiro": "FINANCE",
  "/dividas": "FINANCE",
  "/premios": "FINANCE",
  "/contas": "FINANCE",
  "/saldo": "FINANCE",
  "/asaas": "FINANCE",
  "/multas": "FINANCE",
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
