import { Platform } from "react-native";

/** Chave de erro do formulário → testID do campo, na ordem em que aparecem na tela. */
export const ORDEM_DOS_CAMPOS: [string, string][] = [
  ["nome", "nome"],
  ["descricao", "descricao"],
  ["codigo", "codigo"],
  ["valor", "valor"],
  ["inicio", "inicio"],
  ["fim", "fim"],
  ["limite", "limite"],
  ["teto", "teto"],
  ["pctProfissional", "pct-profissional"],
  ["pctDono", "pct-dono"],
  ["quemConta", "quem-conta"],
  ["pagamento", "pagamento"],
  ["diaPagamento", "dia-semana"],
];

/** testID do primeiro campo com erro, ou null. */
export function primeiroCampoComErro(erros: Record<string, string | undefined>): string | null {
  const achado = ORDEM_DOS_CAMPOS.find(([chave]) => erros[chave]);
  return achado ? achado[1] : null;
}

/** Na web, rola até o campo e foca nele. Fora dela não faz nada. */
export function irAoCampo(testID: string | null) {
  if (!testID || Platform.OS !== "web" || typeof document === "undefined") return;
  const el = document.querySelector<HTMLElement>(`[data-testid="${testID}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus?.({ preventScroll: true });
}
