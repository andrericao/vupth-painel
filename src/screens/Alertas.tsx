import { useState } from "react";
import { Text, View } from "react-native";

import { Aviso, Cartao, Pilulas } from "../components/ui";
import { Leitura, Numero, Titulo } from "../components/leitura";
import { lerAlertas } from "../lib/admin";
import { dataHora, dinheiro } from "../lib/format";
import { useCarga } from "../lib/useCarga";

const NAO_MEDIDO: Record<string, string> = {
  push_refused: "Push recusado",
  server_5xx: "Erro 5xx acima do normal",
};

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
              <Numero rotulo="Valor parado" valor={dinheiro(a.payments_stuck_amount)} />
              <Numero rotulo="Indicações a pagar" valor={String(a.referral_unpaid_count)} />
              <Numero rotulo="Valor a pagar" valor={dinheiro(a.referral_unpaid_amount)} />
            </View>
            <Cartao titulo={`Pagamentos parados há mais de ${a.payments_stuck_hours} h`}>
              {a.payments_stuck.length ? (
                a.payments_stuck.map((p) => (
                  <Text key={p.attendance_id} className="text-vupth-textPrimary">
                    #{p.attendance_id.slice(0, 8)} · {dinheiro(p.amount)} · concluído em {dataHora(p.finished_at)}
                  </Text>
                ))
              ) : (
                <Text testID="sem-parados" className="text-vupth-textSecondary">
                  Nenhum pagamento parado.
                </Text>
              )}
            </Cartao>
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
