import { Text, View } from "react-native";

import { Dica, Leitura, Numero, Titulo } from "../components/leitura";
import { Aviso, Cartao } from "../components/ui";
import { lerSaldoDoApp } from "../lib/admin";
import { formatarReais } from "../lib/format";
import { useCarga } from "../lib/useCarga";

export const DICA_DEPOSITO =
  "É o que falta na conta do Asaas para pagar tudo o que o app deve (o saldo devedor). Se o saldo cobre a dívida, não há o que depositar.";

/** Saldo do app, saldo devedor e a bonificação de cada pessoa; destaca o que depositar no Asaas. */
export function Saldo() {
  const carga = useCarga("saldo-do-app", lerSaldoDoApp);
  const s = carga.dado;
  const pessoas = [...(s?.beneficiaries ?? [])].sort((a, b) => b.amount - a.amount);

  return (
    <View className="gap-5">
      <Titulo titulo="Saldo do app" resumo="O que o app deve, o que cada pessoa tem a receber e o que depositar no Asaas." />
      <Leitura carregando={carga.carregando} erro={carga.erro} onTentar={carga.recarregar}>
        {s ? (
          <>
            {s.asaas_error ? <Aviso texto={`Não consegui ler o Asaas: ${s.asaas_error}`} /> : null}
            {s.asaas_connected && s.deposit_needed != null && s.deposit_needed > 0 ? (
              <Cartao>
                <View testID="depositar" className="gap-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="font-heading text-vupth-textPrimary">Depositar no Asaas</Text>
                    <Dica rotulo="Depositar" texto={DICA_DEPOSITO} />
                  </View>
                  <Text className="font-display text-2xl text-vupth-textPrimary">{formatarReais(s.deposit_needed)}</Text>
                </View>
              </Cartao>
            ) : null}
            {s.asaas_connected && s.deposit_needed === 0 ? (
              <Text testID="sem-deposito" className="text-vupth-textSecondary">
                O saldo do Asaas cobre o que o app deve. Nada a depositar.
              </Text>
            ) : null}
            <View className="flex-row flex-wrap gap-4">
              <Numero rotulo="Saldo devedor" valor={formatarReais(s.owed_total)} />
              <Numero rotulo="Ainda a liberar" valor={formatarReais(s.pending_release_total)} />
              {s.asaas_connected && s.app_balance != null ? <Numero rotulo="Saldo do app (Asaas)" valor={formatarReais(s.app_balance)} /> : null}
            </View>
            {!s.asaas_connected ? (
              <Text testID="sem-asaas" className="text-vupth-textSecondary">
                Asaas sem conexão: só o saldo devedor é mostrado.
              </Text>
            ) : null}
            {!pessoas.length ? (
              <Text testID="vazio" className="text-vupth-textSecondary">
                Ninguém tem bonificação a receber.
              </Text>
            ) : null}
            {pessoas.map((p) => (
              <Cartao key={p.beneficiary_id}>
                <View testID={`pessoa-${p.beneficiary_id}`} className="flex-row flex-wrap items-center justify-between gap-2">
                  <View>
                    <Text className="font-heading text-vupth-textPrimary">{p.beneficiary_name ?? `Pessoa #${p.beneficiary_id.slice(0, 8)}`}</Text>
                    <Text className="text-vupth-textSecondary">
                      {p.credits} {p.credits === 1 ? "indicação" : "indicações"}
                    </Text>
                  </View>
                  <Text className="font-mono text-vupth-textPrimary">{formatarReais(p.amount)}</Text>
                </View>
              </Cartao>
            ))}
          </>
        ) : null}
      </Leitura>
    </View>
  );
}
