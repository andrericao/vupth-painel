import { useState } from "react";
import { Text, View } from "react-native";

import { Aviso, Cartao, Pilulas } from "../components/ui";
import { Dica, Leitura, Numero, Titulo } from "../components/leitura";
import { lerAlertas, type SerieHoraria } from "../lib/admin";
import { dataHora, formatarReais, maisNovoPrimeiro } from "../lib/format";
import { useCarga } from "../lib/useCarga";

const NAO_MEDIDO: Record<string, string> = {
  push_refused: "Push recusado",
  server_5xx: "Erro 5xx acima do normal",
};

const DICA_PUSH =
  "Conta os recibos de push com erro: a Expo, o FCM ou o APNs recusou, em geral token morto. O contador só enche a partir do deploy; antes disso aparece 0.";
const DICA_5XX = "Conta toda resposta 5xx da API. O contador só enche a partir do deploy; antes disso aparece 0.";

/** Última hora, 24 horas e uma barra por hora (da mais velha para a mais nova). */
function LinhaSerie({ id, nome, dica, s }: { id: string; nome: string; dica: string; s: SerieHoraria }) {
  const maior = Math.max(1, ...s.by_hour.map((h) => h.count));
  return (
    <Cartao>
      <View className="flex-row items-center gap-2">
        <Text className="font-heading text-vupth-textPrimary">{nome}</Text>
        <Dica rotulo={nome} texto={dica} />
      </View>
      <View className="flex-row flex-wrap gap-4">
        <Numero rotulo="Última hora" valor={String(s.last_hour)} />
        <Numero rotulo="24 horas" valor={String(s.last_24h)} />
      </View>
      <View testID={`serie-${id}`} accessibilityLabel={`${nome} por hora, últimas ${s.by_hour.length} horas`} className="h-16 flex-row items-end gap-1">
        {s.by_hour.map((h) => (
          <View
            key={h.hour}
            testID={`barra-${id}`}
            accessibilityLabel={`${dataHora(h.hour)}: ${h.count}`}
            className={`flex-1 rounded-sm ${h.count ? "bg-vupth-danger" : "bg-vupth-surfaceAlt"}`}
            style={{ height: `${h.count ? Math.max(8, Math.round((h.count / maior) * 100)) : 4}%` }}
          />
        ))}
      </View>
    </Cartao>
  );
}

/** Só o que pede ação: pagamento parado e indicação a pagar; o que o Backend ainda não mede vem avisado. */
export function Alertas() {
  const [horas, setHoras] = useState("24");
  const r = useCarga(`alertas:${horas}`, () => lerAlertas(Number(horas)));
  const a = r.dado;

  return (
    <View className="gap-5">
      <Titulo titulo="Alertas" resumo="Só o que pede ação: alerta demais vira ruído." />
      <Pilulas<string>
        testID="horas"
        valor={horas}
        onChange={setHoras}
        opcoes={[
          { valor: "24", rotulo: "24 horas" },
          { valor: "72", rotulo: "3 dias" },
          { valor: "168", rotulo: "7 dias" },
        ]}
      />
      <Leitura carregando={r.carregando} erro={r.erro} onTentar={r.recarregar}>
        {a ? (
          <>
            <View className="flex-row flex-wrap gap-4">
              <Numero rotulo="Pagamentos parados" valor={String(a.payments_stuck_count)} />
              <Numero rotulo="Valor parado" valor={formatarReais(a.payments_stuck_amount)} />
              <Numero rotulo="Indicações a pagar" valor={String(a.referral_unpaid_count)} />
              <Numero rotulo="Valor a pagar" valor={formatarReais(a.referral_unpaid_amount)} />
            </View>
            <Cartao titulo={`Pagamentos parados há mais de ${a.payments_stuck_hours} h`}>
              {a.payments_stuck.length ? (
                maisNovoPrimeiro(a.payments_stuck, (p) => p.finished_at).map((p) => (
                  <Text key={p.attendance_id} className="text-vupth-textPrimary">
                    #{p.attendance_id.slice(0, 8)} · {formatarReais(p.amount)} · concluído em {dataHora(p.finished_at)}
                  </Text>
                ))
              ) : (
                <Text testID="sem-parados" className="text-vupth-textSecondary">
                  Nenhum pagamento parado.
                </Text>
              )}
            </Cartao>
            {a.push_refused ? <LinhaSerie id="push" nome="Push recusado" dica={DICA_PUSH} s={a.push_refused} /> : null}
            {a.http_5xx ? <LinhaSerie id="5xx" nome="Erros 5xx da API" dica={DICA_5XX} s={a.http_5xx} /> : null}
            {a.not_measured.length ? (
              <Aviso
                tom="atencao"
                texto={`Ainda não medido pelo Backend: ${a.not_measured.map((k) => NAO_MEDIDO[k] ?? k).join(", ")}.`}
              />
            ) : null}
          </>
        ) : null}
      </Leitura>
    </View>
  );
}
