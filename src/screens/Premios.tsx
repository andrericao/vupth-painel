import { useState } from "react";
import { Text, View } from "react-native";

import { Dica, Leitura, Numero, Titulo } from "../components/leitura";
import { Aviso, Botao, Cartao } from "../components/ui";
import { liberarPremio, listarPremiosPendentes } from "../lib/admin";
import { formatarReais } from "../lib/format";
import { mensagemDe, useCarga } from "../lib/useCarga";

export const DICA_LIBERAR =
  "O prêmio do compartilhe e ganhe nasce travado. Só depois de liberado ele entra no a pagar e no a receber. Libere quando o corte da pessoa indicada estiver conferido.";

/** Prêmios do compartilhe e ganhe esperando a liberação, por campanha e por pessoa. */
export function Premios() {
  const lista = useCarga("premios-pendentes", listarPremiosPendentes);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const itens = lista.dado ?? [];
  const total = itens.reduce((s, p) => s + p.amount, 0);
  const chave = (p: { campaign_id: string; beneficiary_id: string }) => `${p.campaign_id}-${p.beneficiary_id}`;

  async function liberar(campaignId: string, beneficiaryId: string) {
    setOcupado(true);
    setErro("");
    setAviso("");
    try {
      const r = await liberarPremio(campaignId, beneficiaryId);
      setAviso(`Liberado: ${r.released_credits} ${r.released_credits === 1 ? "prêmio" : "prêmios"}.`);
      lista.recarregar();
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setOcupado(false);
      setConfirmar(null);
    }
  }

  return (
    <View className="gap-5">
      <Titulo titulo="Prêmios" resumo="O que quem compartilhou já ganhou e espera a sua liberação para entrar no a pagar." />
      {erro ? <Aviso texto={erro} /> : null}
      {aviso ? <Aviso tom="atencao" texto={aviso} /> : null}
      <Leitura carregando={lista.carregando} erro={lista.erro} onTentar={lista.recarregar}>
        <View className="flex-row flex-wrap items-center gap-4">
          <Numero rotulo="A liberar" valor={formatarReais(total)} />
          <Dica rotulo="Liberar" texto={DICA_LIBERAR} />
        </View>
        {!itens.length ? (
          <Text testID="vazio" className="text-vupth-textSecondary">
            Nenhum prêmio esperando liberação.
          </Text>
        ) : null}
        {itens.map((p) => (
          <Cartao key={chave(p)}>
            <View testID={`premio-${chave(p)}`} className="gap-2">
              <Text className="font-heading text-vupth-textPrimary">{p.beneficiary_name ?? `Pessoa #${p.beneficiary_id.slice(0, 8)}`}</Text>
              <Text className="text-vupth-textSecondary">
                {p.campaign_name} · {p.credits} {p.credits === 1 ? "indicação" : "indicações"}
              </Text>
              <Text className="font-mono text-vupth-textPrimary">{formatarReais(p.amount)}</Text>
              <View className="flex-row flex-wrap gap-2">
                {confirmar === chave(p) ? (
                  <>
                    <Botao
                      testID={`confirmar-liberar-${chave(p)}`}
                      titulo={`Confirmar: liberar ${formatarReais(p.amount)}`}
                      tipo="perigo"
                      carregando={ocupado}
                      onPress={() => liberar(p.campaign_id, p.beneficiary_id)}
                    />
                    <Botao testID={`cancelar-liberar-${chave(p)}`} titulo="Cancelar" tipo="secundario" onPress={() => setConfirmar(null)} />
                  </>
                ) : (
                  <Botao testID={`liberar-${chave(p)}`} titulo="Liberar" tipo="secundario" onPress={() => setConfirmar(chave(p))} />
                )}
              </View>
            </View>
          </Cartao>
        ))}
      </Leitura>
    </View>
  );
}
