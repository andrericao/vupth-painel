import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Dica, Leitura, Numero } from "../components/leitura";
import { Aviso, Botao, Carregando, Cartao, Pilulas } from "../components/ui";
import { lerFinanceiro } from "../lib/admin";
import { useCarga } from "../lib/useCarga";
import { ApiError } from "../lib/api";
import { dataHora, formatarReais, maisNovoPrimeiro } from "../lib/format";
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
        <Text className="text-2xl font-heading text-vupth-textPrimary">Dinheiro</Text>
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

      <Financeiro periodo={periodo} hoje={hoje} lucro={relatorio} />

      <Text className="text-lg font-heading text-vupth-textPrimary">Lucro do corte e da multa</Text>
      {erro ? (
        <View className="items-start gap-3">
          <Aviso texto={erro} />
          <Botao testID="tentar" titulo="Tentar de novo" tipo="secundario" onPress={() => {
              recomeçar();
              setTentativa((t) => t + 1);
            }} />
        </View>
      ) : null}
      {!relatorio && !erro ? <Carregando /> : null}

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
            maisNovoPrimeiro(relatorio.items, (l) => l.paid_at ?? l.key).map((l) => (
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
      <LinhaParte nome="Corte" p={linha.service} dica={DICA.corte} />
      <LinhaParte nome="Multa" p={linha.penalty} dica={DICA.multa} />
      <LinhaParte nome="Total" p={linha.total} dica={DICA.total} forte />
    </View>
  );
}

function LinhaParte({ nome, p, dica, forte }: { nome: string; p: Parte; dica: string; forte?: boolean }) {
  return (
    <View testID={`parte-${nome}`} className="flex-row flex-wrap items-center justify-between gap-2">
      <View className="flex-row items-center gap-2">
        <Text className={forte ? "font-heading text-vupth-textPrimary" : "text-vupth-textPrimary"}>{nome}</Text>
        <Dica rotulo={nome} texto={dica} />
      </View>
      <Text className="text-vupth-textSecondary">
        {formatarReais(p.amount)} · taxa {formatarReais(p.asaas_fee)} ·{" "}
        <Text className="font-heading text-vupth-textPrimary">lucro {formatarReais(p.app_profit)}</Text>
      </Text>
    </View>
  );
}

export const DICA_TESTE =
  "Atendimentos de lojas em teste, no mesmo período. O valor é simbólico: fica fora do faturamento, do lucro e das multas reais acima.";

export const FIM_DICA = "Atendimentos antigos, sem a divisão gravada, entram só no faturamento bruto.";
export const DICA = {
  bruto: "Soma do valor total de todos os atendimentos concluídos do período, pagos ou não.",
  asaas:
    "Soma da taxa do gateway embutida no preço (o pior caso entre Pix R$ 1,99 e crédito R$ 0,49 + 2,99%), só dos atendimentos com a divisão gravada.",
  app: "Soma da parte do app: os 2% mais a sobra do arredondamento do preço X,90 (preço menos o que o profissional recebe menos a taxa do gateway), só dos atendimentos com a divisão gravada. A multa fica à parte.",
  liquido: "Soma do que cada profissional recebe (o que ele digitou), só dos atendimentos com a divisão gravada.",
  geradas: "Multas criadas no período.",
  cobradas: "Multas que já entraram num corte.",
  corte:
    "Conta todo atendimento pago com linha no livro, pela data do pagamento (dia de Brasília); sem pagamento não entra. Nos cortes antigos, sem a divisão gravada, a taxa do Asaas é estimada (a maior entre Pix R$ 1,99 e crédito R$ 0,49 + 2,99%) e o lucro é zero de propósito: não inventamos lucro onde a divisão não foi gravada.",
  multa:
    "Mesma contagem do corte. Na multa, a taxa do app é o valor da multa menos a taxa extra do gateway (no Pix, zero).",
  total: "Corte e multa somados.",
};

/** "X de Y atendimentos com a divisão gravada", só quando falta divisão (Y = concluídos do período, X = os do livro com divisão). */
export function comDivisao(
  porSituacao: { count: number }[],
  lucro: RelatorioLucro | null,
): string | null {
  if (!lucro) return null;
  const y = porSituacao.reduce((t, s) => t + s.count, 0);
  const x = Math.max(0, lucro.totals.attendances - lucro.services_without_split);
  return x < y ? `${x} de ${y} atendimentos com a divisão gravada: os outros entram só no faturamento bruto.` : null;
}

const NOME_PAGAMENTO: Record<string, { nome: string; dica?: string }> = {
  PENDING: { nome: "Pendente", dica: "o cliente ainda não pagou" },
  AWAITING_CONFIRMATION: { nome: "Aguardando confirmação", dica: "o cliente disse que pagou; falta o profissional confirmar" },
  PAID: { nome: "Pago" },
  NONE: {
    nome: "Sem pagamento registrado",
    dica: "corte concluído sem pagamento no app (anterior ao fluxo de pagamento de 10/10 ou feito fora dele); não é valor devido nem pago",
  },
};

/** Os números do período: faturamento, taxas, o que falta receber, multas e a indicação (GET /admin/finance). */
function Financeiro({ periodo, hoje, lucro }: { periodo: Periodo; hoje: string; lucro: RelatorioLucro | null }) {
  const { from, to } = intervaloDe(periodo, hoje);
  const r = useCarga(`financeiro:${from ?? ""}:${to ?? ""}`, () => lerFinanceiro(from, to));
  const aviso = r.dado ? comDivisao(r.dado.by_payment_status, lucro) : null;
  return (
    <Leitura carregando={r.carregando} erro={r.erro} onTentar={r.recarregar}>
      {r.dado ? (
        <View className="gap-4">
          <View className="flex-row flex-wrap gap-4">
            <Numero rotulo="Faturamento bruto" valor={formatarReais(r.dado.money.gross_revenue)} dica={`${DICA.bruto} ${FIM_DICA}`} />
            <Numero rotulo="Taxa do Asaas" valor={formatarReais(r.dado.money.gateway_fee)} dica={`${DICA.asaas} ${FIM_DICA}`} />
            <Numero rotulo="Taxa do app" valor={formatarReais(r.dado.money.app_fee)} dica={`${DICA.app} ${FIM_DICA}`} />
            <Numero
              rotulo="Líquido dos profissionais"
              valor={formatarReais(r.dado.money.professionals_net)}
              dica={`${DICA.liquido} ${FIM_DICA}`}
            />
            <Numero rotulo="Multas geradas" valor={formatarReais(r.dado.money.penalties_generated)} dica={DICA.geradas} />
            <Numero rotulo="Multas cobradas" valor={formatarReais(r.dado.money.penalties_charged)} dica={DICA.cobradas} />
          </View>
          {aviso ? <Aviso tom="atencao" texto={aviso} /> : null}
          <Cartao titulo="Pagamentos por situação">
            {r.dado.by_payment_status.map((s) => (
              <View key={s.status} className="gap-0.5">
                <Text className="text-vupth-textPrimary">
                  {NOME_PAGAMENTO[s.status]?.nome ?? s.status}: {s.count} · {formatarReais(s.amount)}
                </Text>
                {NOME_PAGAMENTO[s.status]?.dica ? (
                  <Text className="text-xs text-vupth-textSecondary">{NOME_PAGAMENTO[s.status]?.dica}</Text>
                ) : null}
              </View>
            ))}
          </Cartao>
          {r.dado.pilot ? (
            <Cartao titulo="Teste (simbólico)">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text testID="teste-simbolico" className="text-vupth-textPrimary">
                  {r.dado.pilot.attendances} {r.dado.pilot.attendances === 1 ? "atendimento" : "atendimentos"} ·{" "}
                  <Text className="font-mono">{formatarReais(r.dado.pilot.amount)}</Text>
                </Text>
                <Dica rotulo="Teste (simbólico)" texto={DICA_TESTE} />
              </View>
            </Cartao>
          ) : null}
          <Cartao titulo="Indicações (créditos)">
            <Text className="text-vupth-textPrimary">
              Total {formatarReais(r.dado.referral.credits_total)} · pagos {formatarReais(r.dado.referral.credits_paid)} · a pagar{" "}
              {formatarReais(r.dado.referral.credits_unpaid)}
            </Text>
          </Cartao>
        </View>
      ) : null}
    </Leitura>
  );
}
