import { margemDoAppCent, precoDoClienteCent } from "./preco";
import { numero, type Campaign, type CampaignType, type Formulario } from "./campaigns";

/** As entradas editáveis da simulação (só no Painel: nada vai ao Backend nem é gravado). */
export type Premissas = {
  corteReais: number; // o que o profissional recebe em um corte
  cortesPorPessoa: number;
  pessoas: number; // usado quando a campanha não tem limite
};

/** O que a simulação precisa de uma campanha (as existentes e a que está no formulário). */
export type ItemSimulado = {
  id?: string;
  nome: string;
  tipo: CampaignType;
  valorReais: number | null;
  valorPercent: number | null;
  limite: number | null;
};

export type LinhaSimulada = {
  nome: string;
  pessoas: number;
  cortes: number;
  custoDesconto: number;
  bonificacao: number;
  ganho: number;
  saldo: number;
  /** O pior caso com todas as vagas usadas; null quando não há limite de pessoas. */
  teto: number | null;
};

const reais = (centavos: number) => centavos / 100;

/** Centavos por corte: [desconto dado, bonificação paga, ganho do app]. */
function porCorte(item: ItemSimulado, corteReais: number): [number, number, number] {
  const recebe = Math.round(corteReais * 100);
  const preco = precoDoClienteCent(recebe);
  const margem = margemDoAppCent(recebe);
  if (item.tipo === "REFERRAL_BONUS") return [0, Math.round((item.valorReais ?? 0) * 100), margem];
  // A isenção abre mão da parte do app: o corte não rende margem.
  if (item.tipo === "FEE_WAIVER") return [0, 0, 0];
  const bruto =
    item.valorPercent != null ? Math.round((preco * item.valorPercent) / 100) : Math.round((item.valorReais ?? 0) * 100);
  // O desconto nunca passa do valor do corte (limite = o preço que o cliente vê).
  return [Math.min(bruto, preco), 0, margem];
}

export function simular(item: ItemSimulado, p: Premissas): LinhaSimulada {
  const pessoas = item.limite ?? p.pessoas;
  const cortes = pessoas * p.cortesPorPessoa;
  const [desconto, bonus, ganho] = porCorte(item, p.corteReais);
  const custoDesconto = reais(cortes * desconto);
  const bonificacao = reais(cortes * bonus);
  const ganhoTotal = reais(cortes * ganho);
  return {
    nome: item.nome,
    pessoas,
    cortes,
    custoDesconto,
    bonificacao,
    ganho: ganhoTotal,
    saldo: ganhoTotal - custoDesconto - bonificacao,
    teto: item.limite == null ? null : reais(item.limite * p.cortesPorPessoa * (desconto + bonus)),
  };
}

export type TotalSimulado = {
  custoDesconto: number;
  bonificacao: number;
  ganho: number;
  saldo: number;
  /** null quando alguma campanha não tem limite: o gasto não tem teto. */
  teto: number | null;
};

export function somar(linhas: LinhaSimulada[]): TotalSimulado {
  const soma = (f: (l: LinhaSimulada) => number) => linhas.reduce((s, l) => s + f(l), 0);
  return {
    custoDesconto: soma((l) => l.custoDesconto),
    bonificacao: soma((l) => l.bonificacao),
    ganho: soma((l) => l.ganho),
    saldo: soma((l) => l.saldo),
    teto: linhas.some((l) => l.teto == null) ? null : soma((l) => l.teto ?? 0),
  };
}

export function itemDaCampanha(c: Campaign): ItemSimulado {
  return {
    id: c.id,
    nome: c.name,
    tipo: c.type,
    valorReais: c.value_amount ?? null,
    valorPercent: c.value_percent ?? null,
    limite: c.max_redemptions ?? null,
  };
}

/** As campanhas que ainda gastam: no ar, agendadas ou pausadas (que podem voltar). */
export const gastam = (c: Campaign) => c.status !== "ENDED";

/** A campanha que está sendo preenchida; campo em branco vale zero (a simulação já aparece enquanto se digita). */
export function itemDoFormulario(f: Formulario, id?: string): ItemSimulado {
  const tipo: CampaignType = f.modo === "link" ? "REFERRAL_BONUS" : f.beneficio === "taxa-zero" ? "FEE_WAIVER" : "DISCOUNT";
  const valor = numero(f.valor);
  const emPorcento = tipo === "DISCOUNT" && f.beneficio === "porcento";
  return {
    id,
    nome: f.nome.trim() || "Esta campanha",
    tipo,
    valorReais: emPorcento ? null : valor,
    valorPercent: emPorcento ? valor : null,
    limite: f.limite.trim() ? Number(f.limite.trim()) : null,
  };
}
