import { api } from "./api";

// Contrato do Backend: GET /admin/finance/cuts-and-penalties (b078b63, DEC-93), permissão FINANCE.
export type AgruparPor = "attendance" | "day" | "month";
export type Parte = { amount: number; asaas_fee: number; app_profit: number };
export type LinhaLucro = {
  key: string;
  attendance_id?: string;
  paid_at?: string;
  attendances: number;
  service: Parte;
  penalty: Parte;
  total: Parte;
};
export type RelatorioLucro = {
  period: { from: string; to: string };
  group_by: AgruparPor;
  items: LinhaLucro[];
  totals: LinhaLucro;
  services_without_split: number;
};

export type Periodo = "hoje" | "7dias" | "mes";

const FUSO_LOJA = "-03:00";

function diaMenos(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** from/to em ISO com fuso (o dia é o da loja); "hoje" vai sem datas — o Backend usa de hoje até agora. */
export function intervaloDe(periodo: Periodo, hoje: string): { from?: string; to?: string } {
  if (periodo === "hoje") return {};
  const inicio = periodo === "7dias" ? diaMenos(hoje, 6) : `${hoje.slice(0, 7)}-01`;
  return { from: `${inicio}T00:00:00${FUSO_LOJA}`, to: `${diaMenos(hoje, -1)}T00:00:00${FUSO_LOJA}` };
}

export function buscarLucro(agrupar: AgruparPor, periodo: Periodo, hoje: string) {
  const q = new URLSearchParams({ group_by: agrupar });
  const { from, to } = intervaloDe(periodo, hoje);
  if (from && to) {
    q.set("from", from);
    q.set("to", to);
  }
  return api<RelatorioLucro>(`/admin/finance/cuts-and-penalties?${q.toString()}`);
}

/** O rótulo da linha: dia (18/10/2026), mês (10/2026) ou o atendimento (início do id). */
export function rotuloDaLinha(l: LinhaLucro, agrupar: AgruparPor): string {
  if (agrupar === "day") {
    const [a, m, d] = l.key.split("-");
    return `${d}/${m}/${a}`;
  }
  if (agrupar === "month") {
    const [a, m] = l.key.split("-");
    return `${m}/${a}`;
  }
  return `#${l.key.slice(0, 8)}`;
}
