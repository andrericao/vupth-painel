import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Leitura, Numero } from "../components/leitura";
import { Aviso, Botao, Cartao, Pilulas } from "../components/ui";
import { lerFinanceiro } from "../lib/admin";
import { useCarga } from "../lib/useCarga";
import { ApiError } from "../lib/api";
import { dataHora, dinheiro } from "../lib/format";
import {
  buscarLucro,
  rotuloDaLinha,
  type AgruparPor,
  type LinhaLucro,
  type Parte,
  intervaloDe,
  type Periodo,
  type RelatorioLucro,
} from "../lib/lucro";

export function mensagemDoErro(e: unknown): string {
  if (e instanceof ApiError && e.code === "ADMIN_PERMISSION_DENIED")
    return "Esta conta não tem a permissão de Financeiro para ver o lucro.";
  return e instanceof Error ? e.message : "Não deu para carregar.";
}

/** Lucro do app separado em corte e multa (DEC-93): valor, taxa do Asaas atribuída e lucro, por atendimento, dia ou mês. */
export function Dinheiro({ hoje }: { hoje: string }) {
  const [agrupar, setAgrupar] = useState<AgruparPor>("day");
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [relatorio, setRelatorio] = useState<RelatorioLucro | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [tentativa, setTentativa] = useState(0);

  // Quem muda o filtro limpa o relatório antes (recomeçar()); o efeito só guarda a resposta.
  useEffect(() => {
    let vivo = true;
    buscarLucro(agrupar, periodo, hoje).then(
      (r) => vivo && setRelatorio(r),
      (e: unknown) => vivo && setErro(mensagemDoErro(e)),
    );
    return () => {
      vivo = false;
    };
  }, [agrupar, periodo, hoje, tentativa]);

  const recomeçar = () => {
    setErro(null);
    setRelatorio(null);
  };

  return (
    <View className="gap-5">
      <View className="gap-1">
        <Text className="text-2xl font-bold text-vupth-textPrimary">Dinheiro</Text>
        <Text className="text-vupth-textSecondary">
          Lucro do app, separado em corte e multa. A taxa do Asaas é a atribuída a cada parte. O dia é o da loja.
        </Text>
      </View>

      <Pilulas<Periodo>
        testID="periodo"
        valor={periodo}
        onChange={(v) => {
          recomeçar();
          setPeriodo(v);
        }}
        opcoes={[
          { valor: "hoje", rotulo: "Hoje" },
          { valor: "7dias", rotulo: "7 dias" },
          { valor: "mes", rotulo: "Este mês" },
        ]}
      />
      <Pilulas<AgruparPor>
        testID="agrupar"
        valor={agrupar}
        onChange={(v) => {
          recomeçar();
          setAgrupar(v);
        }}
        opcoes={[
          { valor: "day", rotulo: "Por dia" },
          { valor: "month", rotulo: "Por mês" },
          { valor: "attendance", rotulo: "Por atendimento" },
        ]}
      />

      <Financeiro periodo={periodo} hoje={hoje} />

      <Text className="text-lg font-semibold text-vupth-textPrimary">Lucro do corte e da multa</Text>
      {erro ? (
        <View className="items-start gap-3">
          <Aviso texto={erro} />
          <Botao testID="tentar" titulo="Tentar de novo" tipo="secundario" onPress={() => {
              recomeçar();
              setTentativa((t) => t + 1);
            }} />
        </View>
      ) : null}
      {!relatorio && !erro ? <ActivityIndicator testID="carregando" color="#163300" /> : null}

      {relatorio ? (
        <>
          <Cartao titulo="Total do período">
            <Resumo linha={relatorio.totals} />
          </Cartao>
          {relatorio.services_without_split > 0 ? (
            <Aviso
              tom="atencao"
              texto={`${relatorio.services_without_split} corte(s) antigos sem a divisão da taxa: o lucro deles entra como zero.`}
            />
          ) : null}
          {!relatorio.items.length ? (
            <Text testID="vazio" className="text-vupth-textSecondary">
              Nenhum pagamento neste período.
            </Text>
          ) : (
            relatorio.items.map((l) => (
              <Cartao key={l.key} titulo={rotuloDaLinha(l, agrupar)}>
                {l.paid_at ? <Text className="text-vupth-textSecondary">Pago em {dataHora(l.paid_at)}</Text> : null}
                <Resumo linha={l} />
              </Cartao>
            ))
          )}
        </>
      ) : null}
    </View>
  );
}

function Resumo({ linha }: { linha: LinhaLucro }) {
  return (
    <View className="gap-2">
      <Text className="text-vupth-textSecondary">
        {linha.attendances} {linha.attendances === 1 ? "atendimento" : "atendimentos"}
      </Text>
      <LinhaParte nome="Corte" p={linha.service} />
      <LinhaParte nome="Multa" p={linha.penalty} />
      <LinhaParte nome="Total" p={linha.total} forte />
    </View>
  );
}

function LinhaParte({ nome, p, forte }: { nome: string; p: Parte; forte?: boolean }) {
  return (
    <View testID={`parte-${nome}`} className="flex-row flex-wrap items-center justify-between gap-2">
      <Text className={forte ? "font-semibold text-vupth-textPrimary" : "text-vupth-textPrimary"}>{nome}</Text>
      <Text className="text-vupth-textSecondary">
        {dinheiro(p.amount)} · taxa {dinheiro(p.asaas_fee)} ·{" "}
        <Text className="font-semibold text-vupth-forest">lucro {dinheiro(p.app_profit)}</Text>
      </Text>
    </View>
  );
}

export const NOME_PAGAMENTO: Record<string, { nome: string; dica?: string }> = {
  PENDING: { nome: "Pendente", dica: "o cliente ainda não pagou" },
  AWAITING_CONFIRMATION: { nome: "Aguardando confirmação", dica: "o cliente disse que pagou; falta o profissional confirmar" },
  PAID: { nome: "Pago" },
  NONE: {
    nome: "Sem pagamento registrado",
    dica: "corte concluído sem pagamento no app (anterior ao fluxo de pagamento de 10/10 ou feito fora dele); não é valor devido nem pago",
  },
};

/** Os números do período: faturamento, taxas, o que falta receber, multas e a indicação (GET /admin/finance). */
function Financeiro({ periodo, hoje }: { periodo: Periodo; hoje: string }) {
  const { from, to } = intervaloDe(periodo, hoje);
  const r = useCarga(`financeiro:${from ?? ""}:${to ?? ""}`, () => lerFinanceiro(from, to));
  return (
    <Leitura carregando={r.carregando} erro={r.erro} onTentar={r.recarregar}>
      {r.dado ? (
        <View className="gap-4">
          <View className="flex-row flex-wrap gap-4">
            <Numero rotulo="Faturamento bruto" valor={dinheiro(r.dado.money.gross_revenue)} />
            <Numero rotulo="Taxa do Asaas" valor={dinheiro(r.dado.money.gateway_fee)} />
            <Numero rotulo="Taxa do app" valor={dinheiro(r.dado.money.app_fee)} />
            <Numero rotulo="Líquido dos profissionais" valor={dinheiro(r.dado.money.professionals_net)} />
            <Numero rotulo="Multas geradas" valor={dinheiro(r.dado.money.penalties_generated)} />
            <Numero rotulo="Multas cobradas" valor={dinheiro(r.dado.money.penalties_charged)} />
          </View>
          <Cartao titulo="Pagamentos por situação">
            {r.dado.by_payment_status.map((s) => (
              <View key={s.status} className="gap-0.5">
                <Text className="text-vupth-textPrimary">
                  {NOME_PAGAMENTO[s.status]?.nome ?? s.status}: {s.count} · {dinheiro(s.amount)}
                </Text>
                {NOME_PAGAMENTO[s.status]?.dica ? (
                  <Text className="text-xs text-vupth-textSecondary">{NOME_PAGAMENTO[s.status]?.dica}</Text>
                ) : null}
              </View>
            ))}
          </Cartao>
          <Cartao titulo="Indicações (créditos)">
            <Text className="text-vupth-textPrimary">
              Total {dinheiro(r.dado.referral.credits_total)} · pagos {dinheiro(r.dado.referral.credits_paid)} · a pagar{" "}
              {dinheiro(r.dado.referral.credits_unpaid)}
            </Text>
          </Cartao>
        </View>
      ) : null}
    </Leitura>
  );
}
