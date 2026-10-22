// Máscaras dos campos: aceitam só o que o formato permite. O formulário guarda o texto mascarado;
// quem manda ao Backend converte (campaigns.ts → paraRequest).

/** Só dígitos, até `max`. */
export function somenteNumeros(texto: string, max = 9): string {
  return texto.replace(/\D/g, "").slice(0, max);
}

/** dd/mm/aaaa: digita só números e as barras entram sozinhas. */
export function mascaraData(texto: string): string {
  const d = somenteNumeros(texto, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "16/10/2026" → "2026-10-16"; nulo se não for um dia real do calendário. */
export function brParaIso(br: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return null;
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** "2026-10-16" → "16/10/2026". */
export function isoParaBr(iso: string): string {
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

/** Valor em reais pelos centavos digitados: "1250" → "12,50"; "5" → "0,05". Até 9 dígitos. */
export function mascaraValor(texto: string): string {
  const d = somenteNumeros(texto, 9).replace(/^0+/, "");
  if (!d) return "";
  const cheio = d.padStart(3, "0");
  const inteiro = cheio.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${inteiro},${cheio.slice(-2)}`;
}

/** Um número como o campo de valor mostra: 12.5 → "12,50". */
export function valorParaCampo(n: number): string {
  return mascaraValor(String(Math.round(n * 100)));
}

/** Porcentagem: dígitos e uma vírgula, até 2 decimais, de 0 a 100. */
export function mascaraPercentual(texto: string): string {
  const limpo = texto.replace(/[^\d,]/g, "");
  const [inteiro, ...resto] = limpo.split(",");
  const int = inteiro.replace(/^0+(?=\d)/, "").slice(0, 3);
  if (Number(int) > 100) return "100";
  if (!resto.length) return int;
  const dec = resto.join("").slice(0, 2);
  if (Number(int) === 100) return "100";
  return `${int || "0"},${dec}`;
}
