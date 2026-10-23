import { useState } from "react";
import { Text, View } from "react-native";

import { Leitura, Paginacao, Titulo } from "../components/leitura";
import { Campo, Cartao, Estado, Pilulas } from "../components/ui";
import { listarMultas, TAMANHO_PAGINA, type MultaLinha, type TipoMulta } from "../lib/admin";
import { dataHora, formatarReais, maisNovoPrimeiro } from "../lib/format";
import { useCarga } from "../lib/useCarga";

export const NOME_TIPO: Record<TipoMulta, string> = {
  LATE_ARRIVAL: "Atraso",
  NO_SHOW: "Falta",
  LATE_CANCEL: "Saiu da fila",
  PAYMENT_PENDING: "Pagamento pendente",
};

const NOME_ESTADO: Record<MultaLinha["state"], string> = { GENERATED: "Gerada", CHARGED: "Cobrada" };

type Teste = "" | "false" | "true";

/** Multas separadas por tipo, da mais nova para a mais antiga; as de teste vêm marcadas. */
export function Multas() {
  const [tipo, setTipo] = useState<TipoMulta | "">("");
  const [teste, setTeste] = useState<Teste>("");
  const [digitado, setDigitado] = useState("");
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(0);
  const r = useCarga(`multas:${tipo}:${teste}:${q}:${pagina}`, () => listarMultas(tipo, teste, q, pagina));

  const filtrar = <T,>(guardar: (v: T) => void) => (v: T) => {
    setPagina(0);
    guardar(v);
  };

  return (
    <View className="gap-5">
      <Titulo titulo="Multas" resumo="Por tipo, da mais nova para a mais antiga. As de teste vêm marcadas." />
      <Pilulas<string>
        testID="tipo"
        valor={tipo}
        onChange={filtrar((v) => setTipo(v as TipoMulta | ""))}
        opcoes={[
          { valor: "", rotulo: "Todas" },
          ...(Object.keys(NOME_TIPO) as TipoMulta[]).map((t) => ({ valor: t, rotulo: NOME_TIPO[t] })),
        ]}
      />
      <Pilulas<string>
        testID="teste"
        valor={teste}
        onChange={filtrar((v) => setTeste(v as Teste))}
        opcoes={[
          { valor: "", rotulo: "Reais e de teste" },
          { valor: "false", rotulo: "Só reais" },
          { valor: "true", rotulo: "Só de teste" },
        ]}
      />
      <View className="flex-row items-end gap-3">
        <View className="flex-1">
          <Campo testID="busca" rotulo="Buscar" placeholder="Cliente ou loja" valor={digitado} onChange={setDigitado} />
        </View>
        <Text
          testID="buscar"
          accessibilityRole="button"
          className="pb-3 font-heading text-vupth-textPrimary"
          onPress={() => {
            setPagina(0);
            setQ(digitado);
          }}
        >
          Buscar
        </Text>
      </View>
      <Leitura carregando={r.carregando} erro={r.erro} onTentar={r.recarregar}>
        {r.dado && !r.dado.items.length ? (
          <Text testID="vazio" className="text-vupth-textSecondary">
            Nenhuma multa neste filtro.
          </Text>
        ) : null}
        {maisNovoPrimeiro(r.dado?.items ?? [], (m) => m.created_at).map((m) => (
          <Cartao key={m.id}>
            <View testID={`multa-${m.id}`} className="gap-1">
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <Text className="text-base font-heading text-vupth-textPrimary">{NOME_TIPO[m.type]}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {m.test ? <Estado tom="atencao" texto="Teste" /> : null}
                  <Estado tom={m.state === "CHARGED" ? "ok" : "neutro"} texto={NOME_ESTADO[m.state]} />
                </View>
              </View>
              <Text className="font-mono text-vupth-textPrimary">{formatarReais(m.amount)}</Text>
              <Text className="text-vupth-textSecondary">
                {m.client_name} · {m.establishment_name} · {dataHora(m.created_at)}
              </Text>
            </View>
          </Cartao>
        ))}
        {r.dado ? <Paginacao pagina={pagina} tamanho={TAMANHO_PAGINA} total={r.dado.total} onIr={setPagina} /> : null}
      </Leitura>
    </View>
  );
}
