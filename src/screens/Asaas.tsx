import { Text, View } from "react-native";

import { Leitura, Numero, Titulo } from "../components/leitura";
import { Cartao, Estado } from "../components/ui";
import { lerConexaoAsaas, lerRelatorioAsaas, type CobrancaAsaas } from "../lib/admin";
import { formatarReais } from "../lib/format";
import { useCarga } from "../lib/useCarga";

const reais = (v?: number) => (v == null ? "—" : formatarReais(v));

async function ler() {
  const [conexao, relatorio] = await Promise.all([lerConexaoAsaas(), lerRelatorioAsaas()]);
  return { conexao, relatorio };
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View className="flex-row justify-between gap-3">
      <Text className="text-vupth-textSecondary">{rotulo}</Text>
      <Text className="font-mono text-vupth-textPrimary">{valor}</Text>
    </View>
  );
}

function Cobranca({ c }: { c: CobrancaAsaas }) {
  const diferente = (c.difference_cents ?? 0) !== 0;
  return (
    <Cartao>
      <View testID={`cobranca-${c.payment_id}`} className="gap-2">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text className="font-heading text-vupth-textPrimary">{c.payment_id}</Text>
          <Text className="text-vupth-textSecondary">{[c.billing_type, c.status].filter(Boolean).join(" · ")}</Text>
        </View>
        <Linha rotulo="Preço de lista" valor={reais(c.list_price)} />
        <Linha rotulo="Cupom" valor={reais(c.coupon_discount)} />
        <Linha rotulo="Bônus" valor={reais(c.bonus)} />
        <Linha rotulo="Profissional quer receber" valor={reais(c.professional_planned)} />
        <Linha rotulo="Taxa real do Asaas" valor={reais(c.asaas_fee_real)} />
        <Linha rotulo="Taxa cobrada no preço" valor={reais(c.fee_charged_in_price)} />
        <Linha rotulo="Sobra da taxa" valor={reais(c.fee_leftover)} />
        <Linha rotulo="Parte líquida do app" valor={reais(c.app_net)} />
        {diferente ? (
          <View testID={`diferenca-${c.payment_id}`}>
            <Estado tom="erro" texto={`Diferença: ${c.difference_cents} centavo(s)`} />
          </View>
        ) : null}
        {c.note ? <Text className="text-xs text-vupth-textSecondary">{c.note}</Text> : null}
      </View>
    </Cartao>
  );
}

/** Aba só do Asaas: conexão, modo e o relatório por cobrança (só leitura). */
export function Asaas() {
  const carga = useCarga("asaas", ler);
  const d = carga.dado;
  const t = d?.relatorio.totals;

  return (
    <View className="gap-5">
      <Titulo titulo="Asaas" resumo="A conexão com o Asaas e para onde vai cada centavo das cobranças." />
      <Leitura carregando={carga.carregando} erro={carga.erro} onTentar={carga.recarregar}>
        {d && t ? (
          <>
            <View testID="conexao" className="flex-row flex-wrap items-center gap-2">
              <Estado tom={d.conexao.connected ? "ok" : "neutro"} texto={d.conexao.connected ? "Conectado" : "Desconectado"} />
              <Estado tom={d.conexao.mode === "REAL" ? "atencao" : "neutro"} texto={d.conexao.mode === "REAL" ? "Real" : "Sandbox"} />
              {!d.conexao.configured ? <Estado tom="atencao" texto="Chave não configurada" /> : null}
            </View>
            <View className="flex-row flex-wrap gap-4">
              <Numero rotulo="Cliente pagou" valor={formatarReais(t.client_paid)} />
              <Numero rotulo="Taxa real do Asaas" valor={formatarReais(t.asaas_fee_real)} />
              <Numero rotulo="Profissional" valor={formatarReais(t.professional_planned)} />
              <Numero rotulo="Líquido do app" valor={formatarReais(t.app_net)} />
            </View>
            {!d.relatorio.payments.length ? (
              <Text testID="vazio" className="text-vupth-textSecondary">
                Nenhuma cobrança no relatório.
              </Text>
            ) : null}
            {d.relatorio.payments.map((c) => (
              <Cobranca key={c.payment_id} c={c} />
            ))}
          </>
        ) : null}
      </Leitura>
    </View>
  );
}
