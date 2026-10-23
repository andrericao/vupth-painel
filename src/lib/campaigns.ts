import { api } from "./api";
import { formatarReais } from "./format";
import { brParaIso, isoParaBr, valorParaCampo } from "./mascaras";

// Contrato do Backend: /admin/campaigns (campanha-pelo-painel, 8da79d0), só para o papel ADMIN.
export type CampaignType = "REFERRAL_BONUS" | "FEE_WAIVER" | "DISCOUNT";
export type CampaignVisibility = "PUBLIC" | "PRIVATE";
export type CampaignAudience = "CLIENT" | "PROFESSIONAL" | "OWNER";
export type CampaignStatus = "SCHEDULED" | "RUNNING" | "PAUSED" | "ENDED";
export type ReferralScope = "ANY_PROFESSIONAL" | "REFERRER_ESTABLISHMENT";
export type PayoutPeriod = "WEEKLY" | "MONTHLY";
/** DEC-76, BAK-13: o Backend deriva do tipo — CASH na indicação (dinheiro), DISCOUNT na isenção e no desconto. */
export type CampaignBenefit = "CASH" | "DISCOUNT";

/** Os parâmetros da bonificação por link (DEC-73, BAK-9 3fdcec1): só na REFERRAL_BONUS, e nela todos obrigatórios. */
type Bonificacao<Vazio> = {
  referral_professional_percent: number | Vazio;
  referral_owner_percent: number | Vazio;
  referral_scope: ReferralScope | Vazio;
  payout_period: PayoutPeriod | Vazio;
  payout_day: number | Vazio;
};

/** Sobre qual valor vale o limite do desconto: o preço que o cliente vê (com taxa) ou o que o profissional recebe (sem taxa). */
export type BaseDoValor = "WITH_FEE" | "WITHOUT_FEE";

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
  benefit?: CampaignBenefit;
  benefit_base?: BaseDoValor;
} & Partial<Bonificacao<never>>;

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
  benefit_base: BaseDoValor | null;
} & Bonificacao<null>;

export const listarCampanhas = () => api<Campaign[]>("/admin/campaigns");
export type Funil = {
  campaign_id: string;
  name: string;
  type: CampaignType;
  from: string;
  to: string;
  link_opened: number | null;
  link_opened_measured: boolean;
  accounts_created: number;
  first_cut_done: number;
  redeemed: number;
  redeemers: { name: string; redeemed_at: string }[];
};
export const lerFunil = (id: string) => api<Funil>(`/admin/campaigns/${id}/funnel`);
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
  baseDoValor: BaseDoValor;
  valor: string;
  inicio: string; // dd/mm/aaaa (a máscara do campo)
  fim: string; // dd/mm/aaaa
  dias: string[];
  limite: string;
  soClientesNovos: boolean;
  pctProfissional: string;
  pctDono: string;
  quemConta: ReferralScope | "";
  pagamento: PayoutPeriod | "";
  diaPagamento: string;
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
    baseDoValor: "WITH_FEE",
    valor: "",
    inicio: isoParaBr(hoje),
    fim: "",
    dias: [],
    limite: "",
    soClientesNovos: false,
    // DEC-73: a bonificação nasce em branco; o Andre preenche campanha a campanha.
    pctProfissional: "",
    pctDono: "",
    quemConta: "",
    pagamento: "",
    diaPagamento: "",
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
    baseDoValor: c.benefit_base ?? "WITH_FEE",
    valor: c.value_percent != null ? String(c.value_percent).replace(".", ",") : c.value_amount != null ? valorParaCampo(c.value_amount) : "",
    inicio: isoParaBr(diaSP(c.starts_at)),
    fim: isoParaBr(diaSP(c.ends_at)),
    dias: c.weekdays ? c.weekdays.split(",") : [],
    limite: c.max_redemptions != null ? String(c.max_redemptions) : "",
    soClientesNovos: c.new_clients_only,
    pctProfissional: texto(c.referral_professional_percent),
    pctDono: texto(c.referral_owner_percent),
    quemConta: c.referral_scope ?? "",
    pagamento: c.payout_period ?? "",
    diaPagamento: texto(c.payout_day),
  };
}

function texto(n: number | null | undefined): string {
  return n == null ? "" : String(n).replace(".", ",");
}

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
  const inicio = brParaIso(f.inicio);
  const fim = brParaIso(f.fim);
  if (!inicio) erros.inicio = "Data no formato dd/mm/aaaa.";
  if (!fim) erros.fim = "Data no formato dd/mm/aaaa.";
  else if (inicio && fim < inicio) erros.fim = "O fim tem de ser depois do início.";
  if (f.limite.trim()) {
    const l = Number(f.limite.trim());
    if (!Number.isInteger(l) || l < 1) erros.limite = "Um número inteiro, 1 ou mais.";
  }
  if (f.modo === "link") validarBonificacao(f, erros);
  return erros;
}

function validarBonificacao(f: Formulario, erros: Partial<Record<keyof Formulario, string>>) {
  const prof = numero(f.pctProfissional);
  const dono = numero(f.pctDono);
  if (prof == null || prof < 0 || prof > 100) erros.pctProfissional = "De 0 a 100.";
  if (dono == null || dono < 0 || dono > 100) erros.pctDono = "De 0 a 100.";
  if (!erros.pctProfissional && !erros.pctDono && Math.round((prof! + dono!) * 100) !== 10000)
    erros.pctDono = "O profissional e o dono somam 100%.";
  if (!f.quemConta) erros.quemConta = "Escolha quem conta.";
  if (!f.pagamento) erros.pagamento = "Escolha semanal ou mensal.";
  else {
    const dia = Number(f.diaPagamento);
    const max = f.pagamento === "WEEKLY" ? 7 : 28;
    if (!f.diaPagamento || !Number.isInteger(dia) || dia < 1 || dia > max)
      erros.diaPagamento = f.pagamento === "WEEKLY" ? "Escolha o dia da semana." : "Um dia de 1 a 28.";
  }
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
    starts_at: `${brParaIso(f.inicio)}T00:00:00-03:00`,
    ends_at: `${brParaIso(f.fim)}T23:59:59-03:00`,
    weekdays: f.dias.length ? DIAS.filter((d) => f.dias.includes(d)).join(",") : null,
    max_redemptions: f.limite.trim() ? Number(f.limite.trim()) : null,
    new_clients_only: f.soClientesNovos,
    benefit_base: tipo === "DISCOUNT" ? f.baseDoValor : null,
    referral_professional_percent: tipo === "REFERRAL_BONUS" ? numero(f.pctProfissional) : null,
    referral_owner_percent: tipo === "REFERRAL_BONUS" ? numero(f.pctDono) : null,
    referral_scope: tipo === "REFERRAL_BONUS" && f.quemConta ? f.quemConta : null,
    payout_period: tipo === "REFERRAL_BONUS" && f.pagamento ? f.pagamento : null,
    payout_day: tipo === "REFERRAL_BONUS" && f.diaPagamento ? Number(f.diaPagamento) : null,
  };
}

/* ───────── Leitura ───────── */

export const NOME_BASE: Record<BaseDoValor, string> = { WITH_FEE: "Valor com taxa", WITHOUT_FEE: "Valor sem taxa" };
export const DICA_BASE =
  "Com taxa: o limite é o preço que o cliente vê. Sem taxa: o limite é o que o profissional recebe. O desconto nunca passa do valor do corte e os cupons não se acumulam.";

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

/** O que o formulário diz do benefício: a indicação paga em dinheiro; cupom é desconto (DEC-76). */
export function avisoBeneficio(modo: Modo): string {
  return modo === "link"
    ? "Benefício em dinheiro: quem indica recebe em reais, no período e no dia abaixo."
    : "Benefício em desconto: quem usa o cupom paga menos no corte.";
}

export function descreverBeneficio(c: Campaign): string {
  if (c.type === "FEE_WAIVER") return "Taxa zero";
  const valor =
    c.value_percent != null
      ? `${String(c.value_percent).replace(".", ",")}%`
      : formatarReais(c.value_amount ?? 0);
  return c.type === "REFERRAL_BONUS" ? `Dinheiro · ${valor} por corte` : `Desconto de ${valor}`;
}

/** 0 a 1: quanto do limite já foi usado; null quando não há limite. */
export function ocupacao(c: Campaign): number | null {
  if (!c.max_redemptions) return null;
  return Math.min(1, c.redemptions / c.max_redemptions);
}

/** 1 = segunda … 7 = domingo (o dia da semanal no Backend). */
export const DIA_DA_SEMANA = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

export const NOME_QUEM_CONTA: Record<ReferralScope, string> = {
  ANY_PROFESSIONAL: "Qualquer profissional",
  REFERRER_ESTABLISHMENT: "Só a loja de quem gerou o link",
};

/** "Profissional 60% · dono 40% · qualquer profissional · toda segunda"; null fora da campanha de link. */
export function descreverBonificacao(c: Campaign): string | null {
  if (c.type !== "REFERRAL_BONUS" || c.referral_professional_percent == null) return null;
  const dia =
    c.payout_period === "WEEKLY"
      ? `toda ${DIA_DA_SEMANA[(c.payout_day ?? 1) - 1]}`
      : `todo dia ${c.payout_day} do mês`;
  const quem = c.referral_scope ? NOME_QUEM_CONTA[c.referral_scope].toLowerCase() : "";
  return [
    `Profissional ${texto(c.referral_professional_percent)}%`,
    `dono ${texto(c.referral_owner_percent)}%`,
    quem,
    dia,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** DEC-113: não existe um link único da campanha — o link é de cada pessoa; o resumo diz onde cada público participa. */
export function comoParticipar(c: Campaign): string | null {
  if (c.type !== "REFERRAL_BONUS") return null;
  const onde =
    c.audience === "CLIENT"
      ? "Client"
      : c.audience === "PROFESSIONAL" || c.audience === "OWNER"
        ? "Partner"
        : "Client (cliente) ou Partner (profissional e dono)";
  const privada = c.visibility === "PRIVATE" ? " e informando o código de participação" : "";
  return `Participa pelo bloco de campanhas da Home do ${onde}, tocando em Participar${privada}.`;
}
