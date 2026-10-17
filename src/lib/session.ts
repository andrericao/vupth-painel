import { SESSAO_MS } from "./config";

// A sessão do painel mora no sessionStorage: fecha a aba, sai. Nada de token no localStorage.
const CHAVE = "vupth-painel:sessao";

export type Sessao = {
  accessToken: string;
  refreshToken: string;
  nome: string;
  email: string;
  expiraEm: number;
  /** Entrou com a senha, mas falta o segundo fator: o token ainda não abre as telas. */
  pendente?: boolean;
};

function storage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function salvarSessao(s: Omit<Sessao, "expiraEm">, agora = Date.now()): Sessao {
  const sessao = { ...s, expiraEm: agora + SESSAO_MS };
  storage()?.setItem(CHAVE, JSON.stringify(sessao));
  return sessao;
}

export function lerSessao(agora = Date.now()): Sessao | null {
  const bruto = storage()?.getItem(CHAVE);
  if (!bruto) return null;
  try {
    const s = JSON.parse(bruto) as Sessao;
    if (!s.accessToken || s.expiraEm <= agora) {
      limparSessao();
      return null;
    }
    return s;
  } catch {
    limparSessao();
    return null;
  }
}

/** Troca o token pelo do painel (15 min, sem refresh); `liberar` abre as telas só depois do fator. */
export function trocarToken(accessToken: string, expiresIn: number, liberar: boolean, agora = Date.now()): void {
  const atual = storage()?.getItem(CHAVE);
  if (!atual) return;
  const s = { ...(JSON.parse(atual) as Sessao), accessToken, expiraEm: agora + expiresIn * 1000 };
  if (liberar) delete s.pendente;
  storage()?.setItem(CHAVE, JSON.stringify(s));
}

export function liberarSessao(): void {
  const atual = storage()?.getItem(CHAVE);
  if (!atual) return;
  const s = JSON.parse(atual) as Sessao;
  delete s.pendente;
  storage()?.setItem(CHAVE, JSON.stringify(s));
}

export function limparSessao(): void {
  storage()?.removeItem(CHAVE);
}
