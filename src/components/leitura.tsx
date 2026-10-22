import type { ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Aviso, Botao } from "./ui";

/** Estado de uma leitura: carregando, erro com "Tentar de novo" ou o conteúdo. */
export function Leitura({
  carregando,
  erro,
  onTentar,
  children,
}: {
  carregando: boolean;
  erro?: string;
  onTentar: () => void;
  children: ReactNode;
}) {
  if (erro)
    return (
      <View className="items-start gap-3">
        <Aviso texto={erro} />
        <Botao testID="tentar" titulo="Tentar de novo" tipo="secundario" onPress={onTentar} />
      </View>
    );
  if (carregando) return <ActivityIndicator testID="carregando" color="#163300" />;
  return <>{children}</>;
}

export function Titulo({ titulo, resumo }: { titulo: string; resumo: string }) {
  return (
    <View className="gap-1">
      <Text className="text-2xl font-bold text-vupth-textPrimary">{titulo}</Text>
      <Text className="text-vupth-textSecondary">{resumo}</Text>
    </View>
  );
}

/** Um número do painel, com a diferença para o período de comparação, se houver. */
export function Numero({ rotulo, valor, variacao }: { rotulo: string; valor: string; variacao?: string }) {
  return (
    <View
      testID={`numero-${rotulo}`}
      className="min-w-[150px] grow basis-[30%] gap-1 rounded-card border border-vupth-border bg-white p-4"
    >
      <Text className="text-xs uppercase text-vupth-textSecondary">{rotulo}</Text>
      <Text className="text-3xl font-bold text-vupth-textPrimary">{valor}</Text>
      {variacao ? <Text className="text-xs text-vupth-textSecondary">{variacao} vs. semana passada</Text> : null}
    </View>
  );
}

/** Anterior / Próxima de uma lista paginada (a página começa em 0). */
export function Paginacao({
  pagina,
  tamanho,
  total,
  onIr,
}: {
  pagina: number;
  tamanho: number;
  total: number;
  onIr: (p: number) => void;
}) {
  const ultima = Math.max(0, Math.ceil(total / tamanho) - 1);
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Botao testID="anterior" titulo="Anterior" tipo="secundario" desabilitado={pagina <= 0} onPress={() => onIr(pagina - 1)} />
      <Text className="text-vupth-textSecondary">
        Página {pagina + 1} de {ultima + 1} · {total} no total
      </Text>
      <Botao testID="proxima" titulo="Próxima" tipo="secundario" desabilitado={pagina >= ultima} onPress={() => onIr(pagina + 1)} />
    </View>
  );
}
