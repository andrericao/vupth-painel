import { useState } from "react";
import { Text, View } from "react-native";

import { Campo, Cartao } from "../components/ui";
import { Dica } from "../components/leitura";
import { type Formulario, numero } from "../lib/campaigns";
import { formatarReais } from "../lib/format";
import { mascaraValor, somenteNumeros } from "../lib/mascaras";
import { itemDoFormulario, simular, somar, type ItemSimulado, type LinhaSimulada, type Premissas } from "../lib/simulacao";

const DICAS = {
  desconto:
    "Pessoas × cortes por pessoa × o desconto de cada corte. O desconto nunca passa do valor do corte (o preço que o cliente vê) e o app arca com ele.",
  bonificacao:
    "Só na campanha de link: pessoas × cortes por pessoa × o valor por corte pago a quem indicou. Considera que todos os cortes premiam.",
  ganho:
    "Pessoas × cortes × a margem do app em um corte: os 2% do preço mais a sobra do arredondamento para X,90 (preço − o que o profissional recebe − gateway). A taxa zero abre mão dessa margem.",
  saldo: "Ganho do app − desconto − bonificação.",
  teto: "O pior caso se todas as vagas forem usadas: limite de pessoas × cortes × (desconto + bonificação por corte). Sem limite de pessoas, não há teto.",
};

function Valor({ rotulo, valor, dica }: { rotulo: string; valor: string; dica: string }) {
  return (
    <View className="min-w-[130px] grow basis-[22%] gap-1">
      <View className="flex-row items-center gap-1">
        <Text className="text-xs uppercase text-vupth-textSecondary">{rotulo}</Text>
        <Dica rotulo={rotulo} texto={dica} />
      </View>
      <Text className="font-semibold text-vupth-textPrimary">{valor}</Text>
    </View>
  );
}

function LinhaDaSimulacao({ l, id }: { l: LinhaSimulada; id: string }) {
  return (
    <View testID={`sim-${id}`} className="gap-2 rounded-xl border border-vupth-border p-3">
      <Text className="font-semibold text-vupth-textPrimary">
        {l.nome} <Text className="font-normal text-vupth-textSecondary">· {l.pessoas} pessoas · {l.cortes} cortes</Text>
      </Text>
      <View className="flex-row flex-wrap gap-3">
        <Valor rotulo={`Desconto ${id}`} valor={formatarReais(l.custoDesconto)} dica={DICAS.desconto} />
        {l.bonificacao ? <Valor rotulo={`Bonificação ${id}`} valor={formatarReais(l.bonificacao)} dica={DICAS.bonificacao} /> : null}
        <Valor rotulo={`Ganho do app ${id}`} valor={formatarReais(l.ganho)} dica={DICAS.ganho} />
        <Valor rotulo={`Saldo ${id}`} valor={formatarReais(l.saldo)} dica={DICAS.saldo} />
        <Valor rotulo={`Teto ${id}`} valor={l.teto == null ? "sem limite" : formatarReais(l.teto)} dica={DICAS.teto} />
      </View>
    </View>
  );
}

type Props = { f: Formulario; editandoId?: string; existentes: ItemSimulado[] };

/** Simulação como planilha de investimento (DEC-113): só cálculo na tela, nada vai ao Backend nem é gravado. */
export function Simulacao({ f, editandoId, existentes }: Props) {
  const [corte, setCorte] = useState("50,00");
  const [cortes, setCortes] = useState("1");
  const [pessoas, setPessoas] = useState("");

  const premissas: Premissas = {
    corteReais: numero(corte) ?? 0,
    cortesPorPessoa: Number(cortes) || 0,
    pessoas: pessoas.trim() ? Number(pessoas) : Number(f.limite) || 0,
  };
  const pronta = premissas.corteReais > 0;
  const nova = itemDoFormulario(f, editandoId);
  const outras = existentes.filter((x) => x.id !== editandoId);
  const linhaNova = pronta ? simular(nova, premissas) : null;
  const linhas = pronta ? outras.map((x) => simular(x, premissas)) : [];
  const total = linhaNova ? somar([linhaNova, ...linhas]) : null;

  return (
    <Cartao titulo="5. Simulação">
      <Text className="text-sm text-vupth-textSecondary">
        Só uma conta na tela, para ver quanto o app gasta e ganha. Nada é gravado nem enviado.
      </Text>
      <View className="flex-row flex-wrap gap-4">
        <View className="min-w-[180px] flex-1">
          <Campo testID="sim-corte" rotulo="Preço médio do corte (R$)" valor={corte} onChange={(v) => setCorte(mascaraValor(v))} dica="O que o profissional recebe por corte." />
        </View>
        <View className="min-w-[180px] flex-1">
          <Campo testID="sim-cortes" rotulo="Cortes por pessoa" valor={cortes} onChange={(v) => setCortes(somenteNumeros(v, 3))} />
        </View>
        <View className="min-w-[180px] flex-1">
          <Campo
            testID="sim-pessoas"
            rotulo="Pessoas"
            valor={pessoas}
            onChange={(v) => setPessoas(somenteNumeros(v, 7))}
            placeholder={f.limite || "0"}
            dica="Vazio = o limite desta campanha. Vale para as campanhas sem limite."
          />
        </View>
      </View>
      {linhaNova && total ? (
        <>
          <LinhaDaSimulacao l={linhaNova} id="nova" />
          {linhas.map((l, i) => (
            <LinhaDaSimulacao key={i} l={l} id={`ativa-${i}`} />
          ))}
          <View testID="sim-total" className="gap-2 rounded-xl bg-vupth-greenTint p-3">
            <Text className="font-semibold text-vupth-textPrimary">
              Total ({linhas.length + 1} {linhas.length ? "campanhas" : "campanha"})
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <Valor rotulo="Desconto total" valor={formatarReais(total.custoDesconto)} dica={DICAS.desconto} />
              <Valor rotulo="Bonificação total" valor={formatarReais(total.bonificacao)} dica={DICAS.bonificacao} />
              <Valor rotulo="Ganho total" valor={formatarReais(total.ganho)} dica={DICAS.ganho} />
              <Valor rotulo="Saldo total" valor={formatarReais(total.saldo)} dica={DICAS.saldo} />
              <Valor rotulo="Teto total" valor={total.teto == null ? "sem limite" : formatarReais(total.teto)} dica={DICAS.teto} />
            </View>
          </View>
        </>
      ) : (
        <Text testID="sim-vazia" className="text-sm text-vupth-textSecondary">
          Informe o preço médio do corte para ver a simulação.
        </Text>
      )}
    </Cartao>
  );
}
