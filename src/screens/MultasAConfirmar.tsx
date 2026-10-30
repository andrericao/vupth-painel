import { useState } from "react";
import { Text, View } from "react-native";

import { Dica, Leitura, Titulo } from "../components/leitura";
import { Aviso, Botao, Cartao } from "../components/ui";
import { confirmarPagamentoDeMulta, listarPagamentosDeMulta } from "../lib/admin";
import { ApiError } from "../lib/api";
import { dataHora, formatarReais } from "../lib/format";
import { mensagemDe, useCarga } from "../lib/useCarga";

export const DICA_CONFIRMAR =
  "O cliente pagou a multa por Pix na conta do app. Confira o recebimento no banco e só então confirme: as multas dele deixam de ser cobradas no próximo corte.";

function mensagemDaConfirmacao(e: unknown): string {
  if (e instanceof ApiError && e.code === "PENALTY_PAYMENT_EXPIRED")
    return "Este pagamento venceu e as multas já foram para outro corte. Não dá mais para confirmar.";
  if (e instanceof ApiError && e.status === 404) return "Este pagamento não existe mais.";
  return mensagemDe(e);
}

/** Multas pagas avulso por Pix do app, do mais antigo ao mais novo: o André confere o recebimento e confirma. */
export function MultasAConfirmar() {
  const lista = useCarga("pagamentos-de-multa", listarPagamentosDeMulta);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function confirmarRecebimento(id: string, valor: number) {
    setOcupado(true);
    setErro("");
    setAviso("");
    try {
      await confirmarPagamentoDeMulta(id);
      setAviso(`Recebimento confirmado: ${formatarReais(valor)}.`);
    } catch (e) {
      setErro(mensagemDaConfirmacao(e));
    } finally {
      setOcupado(false);
      setConfirmar(null);
      lista.recarregar();
    }
  }

  const itens = [...(lista.dado ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <View className="gap-5">
      <Titulo titulo="Multas a confirmar" resumo="Multas que o cliente pagou por Pix do app. Do pagamento mais antigo ao mais novo." />
      {erro ? <Aviso texto={erro} /> : null}
      {aviso ? <Aviso tom="atencao" texto={aviso} /> : null}
      <Leitura carregando={lista.carregando} erro={lista.erro} onTentar={lista.recarregar}>
        {lista.dado && !itens.length ? (
          <Text testID="vazio" className="text-vupth-textSecondary">
            Nenhum pagamento de multa aguardando confirmação.
          </Text>
        ) : null}
        {itens.map((p) => (
          <Cartao key={p.id}>
            <View testID={`pagamento-${p.id}`} className="gap-2">
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <Text className="font-heading text-vupth-textPrimary">{p.client_name ?? `Cliente #${p.client_id.slice(0, 8)}`}</Text>
                <Text className="font-mono text-vupth-textPrimary">{formatarReais(p.amount)}</Text>
              </View>
              <Text className="text-vupth-textSecondary">
                Gerado em {dataHora(p.created_at)} · vence em {dataHora(p.expires_at)}
              </Text>
              <View className="flex-row flex-wrap items-center gap-2">
                {confirmar === p.id ? (
                  <>
                    <Botao
                      testID={`confirmar-${p.id}`}
                      titulo={`Confirmar: recebi ${formatarReais(p.amount)}`}
                      carregando={ocupado}
                      onPress={() => confirmarRecebimento(p.id, p.amount)}
                    />
                    <Botao testID={`cancelar-${p.id}`} titulo="Cancelar" tipo="secundario" onPress={() => setConfirmar(null)} />
                  </>
                ) : (
                  <Botao testID={`receber-${p.id}`} titulo="Confirmar recebimento" tipo="secundario" onPress={() => setConfirmar(p.id)} />
                )}
                <Dica rotulo="Confirmar recebimento" texto={DICA_CONFIRMAR} />
              </View>
            </View>
          </Cartao>
        ))}
      </Leitura>
    </View>
  );
}
