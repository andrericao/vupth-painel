import { useColorScheme } from "react-native";

import { useEscolha } from "./escolhaDeTema";
import { CORES } from "./tema";

/** Cores do tema atual (a escolha do usuário, ou o sistema) para o que não é className: ícone, spinner, placeholder. */
export function useCor() {
  const escolha = useEscolha();
  const sistema = useColorScheme();
  const escuro = escolha === "escuro" || (escolha === "sistema" && sistema === "dark");
  return escuro ? CORES.escuro : CORES.claro;
}
