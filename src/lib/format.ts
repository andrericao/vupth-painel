const FUSO = "America/Sao_Paulo";

export function dinheiro(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function dataCurta(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO }).format(new Date(iso));
}

export function dataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO,
  }).format(new Date(iso));
}

/** Do mais novo para o mais antigo (as listas do painel); sem data vai para o fim. Não muda a lista original. */
export function maisNovoPrimeiro<T>(itens: T[], data: (x: T) => string | undefined): T[] {
  const tempo = (x: T) => {
    const t = Date.parse(data(x) ?? "");
    return Number.isNaN(t) ? -Infinity : t;
  };
  return [...itens].sort((a, b) => tempo(b) - tempo(a));
}

/** Hoje em São Paulo, AAAA-MM-DD. */
export function hojeSP(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora);
}
