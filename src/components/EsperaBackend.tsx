import { Text, View } from "react-native";

import { Cartao, Estado } from "./ui";

export type Previa = {
  titulo: string;
  resumo: string;
  numeros: string[];
  blocos: { titulo: string; itens: string[] }[];
  endpoint: string;
};

/**
 * Tela já desenhada, ainda sem dado: mostra o que ela vai trazer (a proposta do ADM-1) e de qual
 * endpoint do Backend ela espera. Nenhum número inventado — o lugar dele fica com "—".
 */
export function EsperaBackend({ previa }: { previa: Previa }) {
  return (
    <View className="gap-5">
      <View className="gap-2">
        <Text className="text-2xl font-bold text-vupth-textPrimary">{previa.titulo}</Text>
        <Text className="text-vupth-textSecondary">{previa.resumo}</Text>
        <Estado tom="atencao" texto={`Espera o Backend: ${previa.endpoint}`} />
      </View>
      {previa.numeros.length ? (
        <View className="flex-row flex-wrap gap-4">
          {previa.numeros.map((n) => (
            <View key={n} className="min-w-[150px] grow basis-[30%] gap-2 rounded-card border border-vupth-border bg-white p-4">
              <Text className="text-xs uppercase text-vupth-textSecondary">{n}</Text>
              <Text className="text-3xl font-bold text-vupth-border">—</Text>
            </View>
          ))}
        </View>
      ) : null}
      {previa.blocos.map((b) => (
        <Cartao key={b.titulo} titulo={b.titulo}>
          <View className="gap-2">
            {b.itens.map((i) => (
              <Text key={i} className="text-vupth-textSecondary">
                · {i}
              </Text>
            ))}
          </View>
        </Cartao>
      ))}
    </View>
  );
}
