import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Leitura, Numero, Titulo } from "../components/leitura";
import { Estado, Pilulas } from "../components/ui";
import { ABA_TOTAIS, lerTotais, listarContas, type Conta, type TotaisDaConta } from "../lib/contas";
import { formatarReais } from "../lib/format";
import type { Periodo } from "../lib/lucro";
import { useCarga } from "../lib/useCarga";

const DICAS = {
  entries: "O que entrou de fato: o corte e a multa, menos o cupom.",
  fees: "A tarifa de Pix da conta por Pix e a taxa do preço por cartão.",
  net: "Entradas menos taxas.",
  balance: "O que fica no app: entradas − taxas − parte do profissional − bônus.",
  leftover: "A taxa que o preço já carregava, menos as taxas pagas.",
};

function Numeros({ t }: { t: TotaisDaConta }) {
  return (
    <View className="flex-row flex-wrap gap-4">
      <Numero rotulo="Entradas" valor={formatarReais(t.entries)} dica={DICAS.entries} />
      <Numero rotulo="Taxas" valor={formatarReais(t.fees)} dica={DICAS.fees} />
      <Numero rotulo="Líquido" valor={formatarReais(t.net)} dica={DICAS.net} />
      <Numero rotulo="Parte do profissional" valor={formatarReais(t.professional_part)} />
      <Numero rotulo="Parte do app" valor={formatarReais(t.app_part)} />
      <Numero rotulo="Bônus" valor={formatarReais(t.bonus)} />
      <Numero rotulo="Sobra" valor={formatarReais(t.leftover)} dica={DICAS.leftover} />
      <Numero rotulo="Saldo" valor={formatarReais(t.balance)} dica={DICAS.balance} />
    </View>
  );
}

function Aba({ id, nome, marcada, onPress }: { id: string; nome: string; marcada: boolean; onPress: () => void }) {
  return (
    <Pressable
      testID={`aba-${id}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: marcada }}
      onPress={onPress}
      className={`rounded-full px-4 py-2 ${marcada ? "bg-vupth-green" : "bg-vupth-surface"}`}
    >
      <Text className={marcada ? "font-heading text-vupth-onGreen" : "text-vupth-textPrimary"}>{nome}</Text>
    </Pressable>
  );
}

function DadosDaConta({ conta }: { conta: Conta }) {
  const modo = conta.mode === "SANDBOX" ? "teste (sandbox)" : conta.mode === "REAL" ? "real" : null;
  return (
    <View testID="dados-da-conta" className="flex-row flex-wrap items-center gap-3">
      <Text className="text-vupth-textSecondary">Pix: {formatarReais(conta.pix_fee)} por cobrança</Text>
      {conta.connected != null ? (
        <Estado texto={conta.connected ? `Conectada${modo ? ` · ${modo}` : ""}` : "Sem conexão"} tom={conta.connected ? "ok" : "atencao"} />
      ) : null}
      {!conta.active ? <Estado texto="Inativa" tom="neutro" /> : null}
    </View>
  );
}

/** Totais de dinheiro: uma aba com todas as contas juntas e uma aba por conta/banco (Asaas, conta PJ, as que vierem). */
export function Contas({ hoje }: { hoje: string }) {
  const [aba, setAba] = useState(ABA_TOTAIS);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const contas = useCarga("contas", listarContas);
  const totais = useCarga(`totais-${aba}-${periodo}`, () => lerTotais(aba, periodo, hoje));
  const lista = contas.dado ?? [];
  const conta = lista.find((c) => c.key === aba);
  const r = totais.dado;
  const porConta = r?.by_account ?? [];

  return (
    <View className="gap-5">
      <Titulo titulo="Contas" resumo="Os totais de todas as contas juntas e de cada conta ou banco separado. O dia é o do pagamento confirmado." />
      <Leitura carregando={contas.carregando} erro={contas.erro} onTentar={contas.recarregar}>
        <View testID="abas" accessibilityRole="tablist" className="flex-row flex-wrap gap-2">
          <Aba id={ABA_TOTAIS} nome="Totais" marcada={aba === ABA_TOTAIS} onPress={() => setAba(ABA_TOTAIS)} />
          {lista.map((c) => (
            <Aba key={c.key} id={c.key} nome={c.name} marcada={aba === c.key} onPress={() => setAba(c.key)} />
          ))}
        </View>
      </Leitura>
      <Pilulas<Periodo>
        testID="periodo"
        valor={periodo}
        onChange={setPeriodo}
        opcoes={[
          { valor: "hoje", rotulo: "Hoje" },
          { valor: "7dias", rotulo: "7 dias" },
          { valor: "mes", rotulo: "Este mês" },
        ]}
      />
      {conta ? <DadosDaConta conta={conta} /> : null}
      <Leitura carregando={totais.carregando} erro={totais.erro} onTentar={totais.recarregar}>
        {r ? (
          <>
            <Numeros t={r.totals} />
            <Text testID="atendimentos" className="text-vupth-textSecondary">
              {r.totals.attendances} atendimentos · {r.totals.pix_payments} no Pix · {r.totals.other_payments} em outros meios
            </Text>
            {r.totals.services_without_split > 0 ? (
              <Text testID="sem-divisao" className="text-vupth-textSecondary">
                {r.totals.services_without_split} serviços sem divisão registrada.
              </Text>
            ) : null}
            {aba === ABA_TOTAIS && porConta.length ? (
              <View className="gap-2">
                <Text className="font-heading text-vupth-textPrimary">Por conta</Text>
                {porConta.map((t) => (
                  <Pressable
                    key={t.account}
                    testID={`conta-${t.account}`}
                    accessibilityRole="button"
                    onPress={() => setAba(t.account)}
                    className="flex-row items-center justify-between gap-3 rounded-card bg-vupth-surface p-4"
                  >
                    <Text className="text-vupth-textPrimary">{lista.find((c) => c.key === t.account)?.name ?? t.account}</Text>
                    <Text className="font-mono text-vupth-textPrimary">{formatarReais(t.balance)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </Leitura>
    </View>
  );
}
