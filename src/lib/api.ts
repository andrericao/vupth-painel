import { apiBaseUrl } from "./config";
import { lerSessao, limparSessao } from "./session";

/** Erro do Backend: o status e o `code` do corpo (ex.: CAMPAIGN_INVALID), com a mensagem pronta para a tela. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const MENSAGENS: Record<number, string> = {
  401: "Sua sessão acabou. Entre de novo.",
  403: "Esta conta não tem acesso ao painel.",
  404: "Não encontrado.",
  0: "Sem conexão com o servidor. Tente de novo em instantes.",
};

type Opcoes = { method?: string; body?: unknown; auth?: boolean };

export async function api<T>(caminho: string, { method = "GET", body, auth = true }: Opcoes = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const sessao = lerSessao();
    if (sessao) headers.Authorization = `Bearer ${sessao.accessToken}`;
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${apiBaseUrl()}${caminho}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, null, MENSAGENS[0]);
  }

  const texto = await resposta.text();
  const dados = texto ? safeJson(texto) : null;

  if (!resposta.ok) {
    const code = typeof dados?.code === "string" ? dados.code : null;
    if (resposta.status === 401 && auth && code !== "ADMIN_TOTP_INVALID" && code !== "ADMIN_TOTP_REQUIRED")
      limparSessao();
    const msg =
      (typeof dados?.message === "string" && dados.message) ||
      MENSAGENS[resposta.status] ||
      `Erro ${resposta.status} no servidor.`;
    throw new ApiError(resposta.status, code, msg);
  }
  return dados as T;
}

function safeJson(texto: string): Record<string, unknown> | null {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}
