import { useEffect, useState } from "react";

import { ApiError } from "./api";

/** Mensagem pronta para a tela; 403 de permissão explica que falta o acesso. */
export function mensagemDe(e: unknown): string {
  if (e instanceof ApiError && e.code === "ADMIN_PERMISSION_DENIED") return "Esta conta não tem a permissão para ver esta tela.";
  return e instanceof Error ? e.message : "Não deu para carregar.";
}

type Resultado<T> = { chave: string; dado?: T; erro?: string };

/**
 * Busca de leitura: refaz quando a `chave` muda (ou em `recarregar`). Enquanto a chave nova não respondeu,
 * `carregando` é true e o dado velho some — a tela nunca mostra número de outro filtro.
 */
export function useCarga<T>(chave: string, buscar: () => Promise<T>) {
  const [tentativa, setTentativa] = useState(0);
  const [res, setRes] = useState<Resultado<T> | null>(null);
  const completa = `${chave}#${tentativa}`;

  useEffect(() => {
    let vivo = true;
    buscar().then(
      (dado) => vivo && setRes({ chave: completa, dado }),
      (e: unknown) => vivo && setRes({ chave: completa, erro: mensagemDe(e) }),
    );
    return () => {
      vivo = false;
    };
    // `buscar` muda a cada render; quem decide refazer é a chave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completa]);

  const atual = res?.chave === completa ? res : null;
  return {
    dado: atual?.dado,
    erro: atual?.erro,
    carregando: !atual,
    recarregar: () => setTentativa((t) => t + 1),
  };
}
