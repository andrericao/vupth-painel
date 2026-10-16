import { SESSAO_MS } from "./config";

// A sessão do painel mora no sessionStorage: fecha a aba, sai. Nada de token no localStorage.
const CHAVE = "vupth-painel:sessao";

export type Sessao = {
  accessToken: string;
  refreshToken: string;
  nome: string;
  email: string;
  expiraEm: number;
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

export function limparSessao(): void {
  storage()?.removeItem(CHAVE);
}
