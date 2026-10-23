import { useColorScheme } from "react-native";

import { CORES } from "./tema";

/** Cores do tema atual para o que não é className (ícone, spinner, placeholder). */
export function useCor() {
  return useColorScheme() === "dark" ? CORES.escuro : CORES.claro;
}
