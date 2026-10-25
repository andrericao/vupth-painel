import { ApiError } from "./api";

const MENSAGEM: Record<string, string> = {
  TEST_RUN_ALREADY_ACTIVE: "Alguma dessas lojas já está em outro teste ativo. Nenhuma entrou.",
  TEST_RUN_ALREADY_ENDED: "Este teste já foi finalizado.",
  TEST_RUN_STORE_NOT_IN_TEST: "Esta loja não está mais neste teste.",
  ADMIN_PERMISSION_DENIED: "Esta conta não tem a permissão para mexer em testes.",
};

/** Mensagem pronta para o erro de iniciar, tirar ou finalizar um teste. */
export function erroDeTeste(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code && MENSAGEM[e.code]) return MENSAGEM[e.code];
    if (e.status === 422) return "Dê um nome ao teste e escolha ao menos uma loja.";
    if (e.status === 404) return "Loja ou teste não encontrado.";
    return e.message;
  }
  return e instanceof Error ? e.message : "Não deu para concluir.";
}
