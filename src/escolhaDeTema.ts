import { useSyncExternalStore } from "react";

// A escolha de tema (claro, escuro ou o do sistema) fica no navegador e vira o atributo
// data-tema do <html>, que o tailwind.config.js lê. O script do public/index.html aplica o mesmo
// antes de pintar, para a página não piscar no tema errado.
export type Escolha = "sistema" | "claro" | "escuro";

export const ESCOLHAS: Escolha[] = ["sistema", "claro", "escuro"];
const CHAVE = "vupth-painel:tema";

const ouvintes = new Set<() => void>();
let atual: Escolha | null = null;

function lerGuardada(): Escolha {
  try {
    const v = globalThis.localStorage?.getItem(CHAVE);
    return v === "claro" || v === "escuro" ? v : "sistema";
  } catch {
    return "sistema";
  }
}

export function escolhaAtual(): Escolha {
  atual ??= lerGuardada();
  return atual;
}

function pintar(e: Escolha): void {
  const raiz = (globalThis as { document?: Document }).document?.documentElement;
  if (!raiz) return;
  if (e === "sistema") raiz.removeAttribute("data-tema");
  else raiz.setAttribute("data-tema", e);
}

export function escolherTema(e: Escolha): void {
  atual = e;
  try {
    if (e === "sistema") globalThis.localStorage?.removeItem(CHAVE);
    else globalThis.localStorage?.setItem(CHAVE, e);
  } catch {
    // sem storage (janela privada): vale só até recarregar
  }
  pintar(e);
  ouvintes.forEach((o) => o());
}

export function proximaEscolha(e: Escolha): Escolha {
  return ESCOLHAS[(ESCOLHAS.indexOf(e) + 1) % ESCOLHAS.length];
}

export function useEscolha(): Escolha {
  return useSyncExternalStore(
    (o) => {
      ouvintes.add(o);
      return () => ouvintes.delete(o);
    },
    escolhaAtual,
    escolhaAtual,
  );
}
