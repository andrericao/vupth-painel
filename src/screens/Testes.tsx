import { useState } from "react";
import { Text, View } from "react-native";

import { Leitura, Paginacao, Titulo } from "../components/leitura";
import { Aviso, Botao, Campo, Cartao, Estado } from "../components/ui";
import { finalizarTeste, listarTestes, TAMANHO_PAGINA } from "../lib/admin";
import { erroDeTeste } from "../lib/erroDeTeste";
import { dataHora, formatarReais, maisNovoPrimeiro } from "../lib/format";
import { useCarga } from "../lib/useCarga";

/** Rodadas de teste por nome: lojas (e quando saiu cada uma), período, atendimentos e o total simbólico. */
export function Testes() {
  const [digitado, setDigitado] = useState("");
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(0);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const r = useCarga(`testes:${q}:${pagina}`, () => listarTestes(q, pagina));

  async function finalizar(id: string) {
    setOcupado(true);
    setErro("");
    try {
      await finalizarTeste(id);
      r.recarregar();
    } catch (e) {
      setErro(erroDeTeste(e));
    } finally {
      setOcupado(false);
      setConfirmar(null);
    }
  }

  return (
    <View className="gap-5">
      <Titulo titulo="Testes" resumo="Cada rodada pelo nome, com as lojas, o período e o total simbólico. Valores de teste não entram no dinheiro real." />
      <View className="flex-row items-end gap-3">
        <View className="flex-1">
          <Campo testID="busca" rotulo="Buscar" placeholder="Nome do teste" valor={digitado} onChange={setDigitado} />
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
      {erro ? <Aviso texto={erro} /> : null}
      <Leitura carregando={r.carregando} erro={r.erro} onTentar={r.recarregar}>
        {r.dado && !r.dado.items.length ? (
          <Text testID="vazio" className="text-vupth-textSecondary">
            Nenhum teste ainda. Inicie um em Estabelecimentos.
          </Text>
        ) : null}
        {maisNovoPrimeiro(r.dado?.items ?? [], (t) => t.started_at).map((t) => (
          <Cartao key={t.id}>
            <View testID={`teste-${t.id}`} className="gap-1">
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <Text className="text-base font-heading text-vupth-textPrimary">{t.name}</Text>
                <Estado tom={t.active ? "atencao" : "neutro"} texto={t.active ? "Em andamento" : "Finalizado"} />
              </View>
              <Text className="text-vupth-textSecondary">
                {dataHora(t.started_at)} {t.ended_at ? `a ${dataHora(t.ended_at)}` : "· em andamento"}
              </Text>
              <Text className="text-vupth-textSecondary">
                {t.attendances} {t.attendances === 1 ? "atendimento" : "atendimentos"} · total simbólico{" "}
                <Text className="font-mono text-vupth-textPrimary">{formatarReais(t.symbolic_amount)}</Text>
              </Text>
              {t.establishments.map((l) => (
                <Text key={l.establishment_id} testID={`loja-${t.id}-${l.establishment_id}`} className="text-sm text-vupth-textSecondary">
                  {l.establishment_name} · entrou {dataHora(l.joined_at)}
                  {l.left_at ? ` · saiu ${dataHora(l.left_at)}` : ""}
                </Text>
              ))}
              {t.active ? (
                <View className="flex-row pt-1">
                  {confirmar === t.id ? (
                    <Botao testID={`confirmar-${t.id}`} titulo="Confirmar: finalizar o teste" tipo="perigo" carregando={ocupado} onPress={() => finalizar(t.id)} />
                  ) : (
                    <Botao testID={`finalizar-${t.id}`} titulo="Finalizar teste" tipo="secundario" onPress={() => setConfirmar(t.id)} />
                  )}
                </View>
              ) : null}
            </View>
          </Cartao>
        ))}
        {r.dado ? <Paginacao pagina={pagina} tamanho={TAMANHO_PAGINA} total={r.dado.total} onIr={setPagina} /> : null}
      </Leitura>
    </View>
  );
}
