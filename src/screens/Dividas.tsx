import { useState } from "react";
import { Text, View } from "react-native";

import { Dica, Leitura, Numero, Titulo } from "../components/leitura";
import { Aviso, Botao, Cartao, Estado } from "../components/ui";
import { listarDividas, lerDividaReal, mudarDividaReal, quitarDivida } from "../lib/admin";
import { formatarReais } from "../lib/format";
import { mensagemDe, useCarga } from "../lib/useCarga";

export const DICA_INTERRUPTOR =
  "Desligado, toda dívida por fora nova nasce como teste (simulada). Ligar torna as dívidas novas reais, a partir daquele momento; as que já existem não mudam. Fica desligado até o Asaas estar em produção.";
export const DICA_QUITAR =
  "Quita só a dívida real em aberto, depois que o profissional pagou o valor ao app por Pix. As simuladas não entram.";

/** Dívidas por fora: o interruptor real/teste, o que cada profissional deve e a quitação. */
export function Dividas() {
  const flag = useCarga("divida-real", lerDividaReal);
  const lista = useCarga("dividas", listarDividas);
  const [confirmarFlag, setConfirmarFlag] = useState(false);
  const [confirmarQuitar, setConfirmarQuitar] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function agir(acao: () => Promise<void>) {
    setOcupado(true);
    setErro("");
    setAviso("");
    try {
      await acao();
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setOcupado(false);
      setConfirmarFlag(false);
      setConfirmarQuitar(null);
    }
  }

  const real = flag.dado?.real ?? false;
  const itens = lista.dado ?? [];
  const reais = itens.filter((d) => !d.simulated);
  const totalReal = reais.reduce((s, d) => s + d.amount, 0);
  const totalSimulado = itens.filter((d) => d.simulated).reduce((s, d) => s + d.amount, 0);

  return (
    <View className="gap-5">
      <Titulo titulo="Dívidas" resumo="O que cada profissional deve ao app por fora do pagamento, real e simulado." />
      {erro ? <Aviso texto={erro} /> : null}
      {aviso ? <Aviso tom="atencao" texto={aviso} /> : null}
      <Leitura carregando={flag.carregando} erro={flag.erro} onTentar={flag.recarregar}>
        <Cartao>
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="font-heading text-vupth-textPrimary">Dívidas novas</Text>
            <Estado tom={real ? "erro" : "neutro"} texto={real ? "Reais" : "De teste"} />
            <Dica rotulo="Dívidas novas" texto={DICA_INTERRUPTOR} />
          </View>
          {confirmarFlag ? (
            <View className="gap-2">
              <Text testID="aviso-flag" className="text-vupth-textPrimary">
                {real ? "Voltar as dívidas novas para teste?" : "Ligar: as dívidas novas passam a ser reais. Confirma?"}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <Botao
                  testID="confirmar-flag"
                  titulo={real ? "Confirmar: voltar para teste" : "Confirmar: tornar reais"}
                  tipo="perigo"
                  carregando={ocupado}
                  onPress={() =>
                    agir(async () => {
                      await mudarDividaReal(!real);
                      flag.recarregar();
                    })
                  }
                />
                <Botao testID="cancelar-flag" titulo="Cancelar" tipo="secundario" onPress={() => setConfirmarFlag(false)} />
              </View>
            </View>
          ) : (
            <View className="flex-row">
              <Botao testID="mudar-flag" titulo={real ? "Voltar para teste" : "Tornar reais"} tipo="secundario" onPress={() => setConfirmarFlag(true)} />
            </View>
          )}
        </Cartao>
      </Leitura>
      <Leitura carregando={lista.carregando} erro={lista.erro} onTentar={lista.recarregar}>
        <View className="flex-row flex-wrap gap-4">
          <Numero rotulo="Real em aberto" valor={formatarReais(totalReal)} />
          <Numero rotulo="Simulado" valor={formatarReais(totalSimulado)} />
        </View>
        {!itens.length ? (
          <Text testID="vazio" className="text-vupth-textSecondary">
            Nenhuma dívida por fora.
          </Text>
        ) : null}
        {[...itens]
          .sort((a, b) => Number(a.simulated) - Number(b.simulated) || b.amount - a.amount)
          .map((d) => (
            <Cartao key={`${d.professional_id}-${d.simulated}`}>
              <View testID={`divida-${d.professional_id}-${d.simulated ? "simulada" : "real"}`} className="gap-2">
                <View className="flex-row flex-wrap items-center justify-between gap-2">
                  <Text className="font-heading text-vupth-textPrimary">Profissional #{d.professional_id.slice(0, 8)}</Text>
                  <Estado tom={d.simulated ? "neutro" : "erro"} texto={d.simulated ? "Simulada" : "Real"} />
                </View>
                <Text className="font-mono text-vupth-textPrimary">{formatarReais(d.amount)}</Text>
                {d.simulated ? null : (
                  <View className="flex-row flex-wrap items-center gap-2">
                    {confirmarQuitar === d.professional_id ? (
                      <Botao
                        testID={`confirmar-quitar-${d.professional_id}`}
                        titulo={`Confirmar: quitar ${formatarReais(d.amount)}`}
                        tipo="perigo"
                        carregando={ocupado}
                        onPress={() =>
                          agir(async () => {
                            const r = await quitarDivida(d.professional_id);
                            setAviso(`Quitado: ${formatarReais(r.settled_amount)}.`);
                            lista.recarregar();
                          })
                        }
                      />
                    ) : (
                      <Botao testID={`quitar-${d.professional_id}`} titulo="Quitar" tipo="secundario" onPress={() => setConfirmarQuitar(d.professional_id)} />
                    )}
                    <Dica rotulo="Quitar" texto={DICA_QUITAR} />
                  </View>
                )}
              </View>
            </Cartao>
          ))}
      </Leitura>
    </View>
  );
}
