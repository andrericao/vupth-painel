import { api } from "./api";
import { intervaloDe, type Periodo } from "./lucro";

// Contrato do Backend: contas e totais por conta (ledger-por-conta, 3b8592a). Exige a permissão FINANCE.
export type Conta = {
  id: string;
  key: string;
  name: string;
  provider: string;
  pix_fee: number;
  active: boolean;
  connected?: boolean;
  mode?: string;
};

export type TotaisDaConta = {
  account: string;
  attendances: number;
  pix_payments: number;
  other_payments: number;
  list_total: number;
  coupon_discount: number;
  entries: number;
  fees: number;
  net: number;
  professional_part: number;
  app_part: number;
  bonus: number;
  leftover: number;
  balance: number;
  services_without_split: number;
};

export type RelatorioDeTotais = {
  period: { from?: string; to?: string };
  account: string;
  totals: TotaisDaConta;
  by_account?: TotaisDaConta[];
};

/** A aba que reúne todas as contas; as demais usam a `key` da conta. */
export const ABA_TOTAIS = "all";

export const listarContas = () => api<Conta[]>("/admin/finance/accounts");

export const mudarTarifaDePix = (key: string, pix_fee: number) =>
  api<Conta>(`/admin/finance/accounts/${encodeURIComponent(key)}`, { method: "PUT", body: { pix_fee } });

export function lerTotais(conta: string, periodo: Periodo, hoje: string) {
  const q = new URLSearchParams({ account: conta });
  const { from, to } = intervaloDe(periodo, hoje);
  if (from && to) {
    q.set("from", from);
    q.set("to", to);
  }
  return api<RelatorioDeTotais>(`/admin/finance/totals?${q.toString()}`);
}
