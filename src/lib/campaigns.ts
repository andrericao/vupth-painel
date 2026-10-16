import { api } from "./api";

// Contrato do Backend: /admin/campaigns (campanha-pelo-painel, 8da79d0), só para o papel ADMIN.
export type CampaignType = "REFERRAL_BONUS" | "FEE_WAIVER" | "DISCOUNT";
export type CampaignVisibility = "PUBLIC" | "PRIVATE";
export type CampaignAudience = "CLIENT" | "PROFESSIONAL" | "OWNER";
export type CampaignStatus = "SCHEDULED" | "RUNNING" | "PAUSED" | "ENDED";

export type Campaign = {
  id: string;
  name: string;
  description?: string;
  code?: string;
  type: CampaignType;
  visibility: CampaignVisibility;
  audience?: CampaignAudience;
  value_amount?: number;
  value_percent?: number;
  starts_at: string;
  ends_at: string;
  weekdays?: string;
  max_redemptions?: number;
  redemptions: number;
  new_clients_only: boolean;
  active: boolean;
  status: CampaignStatus;
};

export type CampaignRequest = {
  name: string;
  description: string | null;
  code: string | null;
  type: CampaignType;
  visibility: CampaignVisibility;
  audience: CampaignAudience | null;
  value_amount: number | null;
  value_percent: number | null;
  starts_at: string;
  ends_at: string;
  weekdays: string | null;
  max_redemptions: number | null;
  new_clients_only: boolean;
};

export const listarCampanhas = () => api<Campaign[]>("/admin/campaigns");
export const criarCampanha = (r: CampaignRequest) => api<Campaign>("/admin/campaigns", { method: "POST", body: r });
export const editarCampanha = (id: string, r: CampaignRequest) =>
  api<Campaign>(`/admin/campaigns/${id}`, { method: "PUT", body: r });
export const pausarCampanha = (id: string) => api<Campaign>(`/admin/campaigns/${id}/pause`, { method: "PATCH" });
export const retomarCampanha = (id: string) => api<Campaign>(`/admin/campaigns/${id}/resume`, { method: "PATCH" });
export const encerrarCampanha = (id: string) => api<Campaign>(`/admin/campaigns/${id}/end`, { method: "PATCH" });

/* ───────── O formulário (Criar campanha → cupom ou link → parâmetros, DEC-73) ───────── */

export type Modo = "cupom" | "link";
export type Beneficio = "reais" | "porcento" | "taxa-zero";

export const DIAS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
export const NOME_DIA: Record<(typeof DIAS)[number], string> = {
  MONDAY: "seg",
  TUESDAY: "ter",
  WEDNESDAY: "qua",
  THURSDAY: "qui",
  FRIDAY: "sex",
  SATURDAY: "sáb",
  SUNDAY: "dom",
};

export type Formulario = {
  modo: Modo;
  nome: string;
  descricao: string;
  visibilidade: CampaignVisibility;
  codigo: string;
  publico: CampaignAudience | "TODOS";
  beneficio: Beneficio;
  valor: string;
  inicio: string; // AAAA-MM-DD
  fim: string; // AAAA-MM-DD
  dias: string[];
  limite: string;
  soClientesNovos: boolean;
};

export function formularioVazio(hoje: string): Formulario {
  return {
    modo: "cupom",
    nome: "",
    descricao: "",
    visibilidade: "PUBLIC",
    codigo: "",
    publico: "TODOS",
    beneficio: "reais",
    valor: "",
    inicio: hoje,
    fim: "",
    dias: [],
    limite: "",
    soClientesNovos: false,
  };
}

/** O dia do calendário em São Paulo (UTC-3, sem horário de verão desde 2019). */
export function diaSP(iso: string): string {
  return new Date(new Date(iso).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

export function formularioDe(c: Campaign): Formulario {
  return {
    modo: c.type === "REFERRAL_BONUS" ? "link" : "cupom",
    nome: c.name,
    descricao: c.description ?? "",
    visibilidade: c.visibility,
    codigo: c.code ?? "",
    publico: c.audience ?? "TODOS",
    beneficio: c.type === "FEE_WAIVER" ? "taxa-zero" : c.value_percent != null ? "porcento" : "reais",
    valor: String(c.value_percent ?? c.value_amount ?? "").replace(".", ","),
    inicio: diaSP(c.starts_at),
    fim: diaSP(c.ends_at),
    dias: c.weekdays ? c.weekdays.split(",") : [],
    limite: c.max_redemptions != null ? String(c.max_redemptions) : "",
    soClientesNovos: c.new_clients_only,
  };
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export function numero(texto: string): number | null {
  const t = texto.trim().replace(/\./g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** As mesmas regras do AdminCampaignService, para o erro aparecer no campo antes do 422. */
export function validar(f: Formulario): Partial<Record<keyof Formulario, string>> {
  const erros: Partial<Record<keyof Formulario, string>> = {};
  if (!f.nome.trim()) erros.nome = "Dê um nome à campanha.";
  else if (f.nome.trim().length > 80) erros.nome = "Até 80 letras.";
  if (f.descricao.length > 300) erros.descricao = "Até 300 letras.";
  const codigo = f.codigo.trim();
  if (f.visibilidade === "PRIVATE" && !codigo) erros.codigo = "A campanha privada precisa de cupom.";
  else if (codigo && !/^[A-Za-z0-9_-]{1,40}$/.test(codigo)) erros.codigo = "Só letras, números, - e _ (até 40).";
  if (f.modo === "link" || f.beneficio !== "taxa-zero") {
    const v = numero(f.valor);
    if (v == null || v <= 0) erros.valor = "Informe o valor.";
    else if (f.modo === "cupom" && f.beneficio === "porcento" && v > 100) erros.valor = "Até 100%.";
  }
  if (!DATA.test(f.inicio)) erros.inicio = "Data no formato AAAA-MM-DD.";
  if (!DATA.test(f.fim)) erros.fim = "Data no formato AAAA-MM-DD.";
  else if (!erros.inicio && f.fim < f.inicio) erros.fim = "O fim tem de ser depois do início.";
  if (f.limite.trim()) {
    const l = Number(f.limite.trim());
    if (!Number.isInteger(l) || l < 1) erros.limite = "Um número inteiro, 1 ou mais.";
  }
  return erros;
}

/** Do formulário para o corpo do POST/PUT. O dia vale de 00:00 do início até 23:59:59 do fim, em São Paulo. */
export function paraRequest(f: Formulario): CampaignRequest {
  const tipo: CampaignType = f.modo === "link" ? "REFERRAL_BONUS" : f.beneficio === "taxa-zero" ? "FEE_WAIVER" : "DISCOUNT";
  const valor = tipo === "FEE_WAIVER" ? null : numero(f.valor);
  const emPorcento = tipo === "DISCOUNT" && f.beneficio === "porcento";
  return {
    name: f.nome.trim(),
    description: f.descricao.trim() || null,
    code: f.codigo.trim() || null,
    type: tipo,
    visibility: f.visibilidade,
    audience: f.publico === "TODOS" ? null : f.publico,
    value_amount: emPorcento ? null : valor,
    value_percent: emPorcento ? valor : null,
    starts_at: `${f.inicio}T00:00:00-03:00`,
    ends_at: `${f.fim}T23:59:59-03:00`,
    weekdays: f.dias.length ? DIAS.filter((d) => f.dias.includes(d)).join(",") : null,
    max_redemptions: f.limite.trim() ? Number(f.limite.trim()) : null,
    new_clients_only: f.soClientesNovos,
  };
}

/* ───────── Leitura ───────── */

export const NOME_STATUS: Record<CampaignStatus, string> = {
  SCHEDULED: "Agendada",
  RUNNING: "No ar",
  PAUSED: "Pausada",
  ENDED: "Encerrada",
};

export const NOME_PUBLICO: Record<CampaignAudience | "TODOS", string> = {
  TODOS: "Todos",
  CLIENT: "Clientes",
  PROFESSIONAL: "Profissionais",
  OWNER: "Donos",
};

export function descreverBeneficio(c: Campaign): string {
  if (c.type === "FEE_WAIVER") return "Taxa zero";
  const valor =
    c.value_percent != null
      ? `${String(c.value_percent).replace(".", ",")}%`
      : `R$ ${(c.value_amount ?? 0).toFixed(2).replace(".", ",")}`;
  return c.type === "REFERRAL_BONUS" ? `Link · ${valor} por corte` : `Desconto de ${valor}`;
}

/** 0 a 1: quanto do limite já foi usado; null quando não há limite. */
export function ocupacao(c: Campaign): number | null {
  if (!c.max_redemptions) return null;
  return Math.min(1, c.redemptions / c.max_redemptions);
}
