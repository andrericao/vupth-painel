import { Info } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { useCor } from "../useCor";
import { Aviso, Botao, Carregando } from "./ui";

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
  if (carregando) return <Carregando />;
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

/** O "i" de informação: toque ou foco abre uma dica curta com o cálculo; Esc, outro toque ou sair do foco fecham. */
export function Dica({ rotulo, texto }: { rotulo: string; texto: string }) {
  const cor = useCor();
  const [aberta, setAberta] = useState(false);
  useEffect(() => {
    if (!aberta) return;
    const fechar = (e: { key?: string }) => {
      if (e.key === "Escape") setAberta(false);
    };
    const doc = (globalThis as { document?: Document }).document;
    doc?.addEventListener("keydown", fechar);
    return () => doc?.removeEventListener("keydown", fechar);
  }, [aberta]);
  return (
    <View className="relative">
      <Pressable
        testID={`info-${rotulo}`}
        accessibilityRole="button"
        accessibilityLabel={`Como é calculado: ${rotulo}`}
        accessibilityState={{ expanded: aberta }}
        onPress={() => setAberta((a) => !a)}
        onBlur={() => setAberta(false)}
        hitSlop={8}
      >
        <Info color={cor.textSecondary} size={16} />
      </Pressable>
      {aberta ? (
        <View
          testID={`dica-${rotulo}`}
          accessibilityRole="alert"
          className="absolute right-0 top-6 z-10 w-64 rounded-lg border border-vupth-border bg-vupth-background p-3"
        >
          <Text className="text-xs text-vupth-textPrimary">{texto}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Um número do painel, com a diferença para o período de comparação e a dica do cálculo, se houver. */
export function Numero({
  rotulo,
  valor,
  variacao,
  dica,
}: {
  rotulo: string;
  valor: string;
  variacao?: string;
  dica?: string;
}) {
  return (
    <View
      testID={`numero-${rotulo}`}
      className="min-w-[150px] grow basis-[30%] gap-1 rounded-card bg-vupth-surface p-4"
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-xs uppercase text-vupth-textSecondary">{rotulo}</Text>
        {dica ? <Dica rotulo={rotulo} texto={dica} /> : null}
      </View>
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
