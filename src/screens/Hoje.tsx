import { Text, View } from "react-native";

import { Barra, Cartao } from "../components/ui";
import { Leitura, Numero, Titulo } from "../components/leitura";
import { lerOverview, lerSerie, variacao, type Overview } from "../lib/admin";
import { formatarReais } from "../lib/format";
import { useCarga } from "../lib/useCarga";

const n = (v: number) => v.toLocaleString("pt-BR");

/** Os números de hoje, cada um contra o mesmo dia da semana passada (fuso de São Paulo). */
export function Hoje() {
  const o = useCarga("overview", lerOverview);
  const serie = useCarga("serie-cortes", () => lerSerie("cuts", "hour"));
  const pontos = serie.dado?.points ?? [];
  const maior = Math.max(1, ...pontos.map((p) => p.value));

  return (
    <View className="gap-5">
      <Titulo titulo="Hoje" resumo="Cada número com a diferença contra o mesmo dia da semana passada. Fuso de São Paulo." />
      <Leitura carregando={o.carregando} erro={o.erro} onTentar={o.recarregar}>
        {o.dado ? <Corpo o={o.dado} /> : null}
      </Leitura>
      {pontos.length ? (
        <Cartao titulo="Cortes por hora">
          <View testID="serie" className="gap-2">
            {pontos.map((p) => (
              <View key={p.at} className="flex-row items-center gap-3">
                <Text className="w-12 text-vupth-textSecondary">{p.at.slice(11, 16)}</Text>
                <View className="flex-1">
                  <Barra fracao={p.value / maior} />
                </View>
                <Text className="w-8 text-right text-vupth-textPrimary">{n(p.value)}</Text>
              </View>
            ))}
          </View>
        </Cartao>
      ) : null}
    </View>
  );
}

function Corpo({ o }: { o: Overview }) {
  const f = o.funnel;
  const c = o.funnel_compare;
  const m = o.money;
  const mc = o.money_compare;
  return (
    <View className="gap-5">
      <View className="flex-row flex-wrap gap-4">
        <Numero rotulo="Lojas abertas agora" valor={n(o.health.open_stores)} />
        <Numero rotulo="Profissionais em turno" valor={n(o.health.professionals_working)} />
        <Numero rotulo="Atendimentos ativos" valor={n(o.health.active_attendances)} />
      </View>
      <View className="flex-row flex-wrap gap-4">
        <Numero rotulo="Cadastros novos" valor={n(f.signups)} variacao={variacao(f.signups, c.signups)} />
        <Numero rotulo="Atendimentos criados" valor={n(f.attendances_created)} variacao={variacao(f.attendances_created, c.attendances_created)} />
        <Numero rotulo="Cortes concluídos" valor={n(f.finished)} variacao={variacao(f.finished, c.finished)} />
        <Numero rotulo="Atrasos" valor={n(f.late)} variacao={variacao(f.late, c.late)} />
        <Numero rotulo="Cancelamentos" valor={n(f.cancelled)} variacao={variacao(f.cancelled, c.cancelled)} />
        <Numero rotulo="Removidos da fila" valor={n(f.removed)} variacao={variacao(f.removed, c.removed)} />
      </View>
      <View className="flex-row flex-wrap gap-4">
        <Numero rotulo="Faturamento bruto" valor={formatarReais(m.gross_revenue)} variacao={variacao(m.gross_revenue, mc.gross_revenue)} />
        <Numero rotulo="Taxa do app" valor={formatarReais(m.app_fee)} variacao={variacao(m.app_fee, mc.app_fee)} />
        <Numero rotulo="Multas geradas" valor={formatarReais(m.penalties_generated)} variacao={variacao(m.penalties_generated, mc.penalties_generated)} />
      </View>
    </View>
  );
}
