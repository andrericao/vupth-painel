import { useState } from "react";
import { Text, View } from "react-native";

import { Aviso, Botao, Campo, Cartao, Pilulas } from "../components/ui";
import type { ItemSimulado } from "../lib/simulacao";
import { Simulacao } from "./Simulacao";
import { ApiError } from "../lib/api";
import { mascaraData, mascaraPercentual, mascaraValor, somenteNumeros } from "../lib/mascaras";
import {
  avisoBeneficio,
  criarCampanha,
  DIA_DA_SEMANA,
  DICA_BASE,
  NOME_BASE,
  DIAS,
  editarCampanha,
  formularioDe,
  formularioVazio,
  NOME_DIA,
  NOME_PUBLICO,
  NOME_QUEM_CONTA,
  paraRequest,
  validar,
  type BaseDoValor,
  type Beneficio,
  type Campaign,
  type CampaignAudience,
  type CampaignVisibility,
  type Formulario,
  type Modo,
  type PayoutPeriod,
  type ReferralScope,
} from "../lib/campaigns";

type Props = { campanha?: Campaign; existentes?: ItemSimulado[]; hoje: string; onPronto: (c: Campaign) => void; onCancelar: () => void };

/** Criar campanha → cupom ou link → os parâmetros (DEC-69, 73). Editar usa o mesmo formulário. */
export function CampanhaForm({ campanha, existentes = [], hoje, onPronto, onCancelar }: Props) {
  const [f, setF] = useState<Formulario>(() => (campanha ? formularioDe(campanha) : formularioVazio(hoje)));
  const [erros, setErros] = useState<ReturnType<typeof validar>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const muda = <K extends keyof Formulario>(k: K) => (v: Formulario[K]) => setF((x) => ({ ...x, [k]: v }));

  async function salvar() {
    const e = validar(f);
    setErros(e);
    if (Object.keys(e).length) return;
    setErroGeral(null);
    setEnviando(true);
    try {
      const corpo = paraRequest(f);
      onPronto(campanha ? await editarCampanha(campanha.id, corpo) : await criarCampanha(corpo));
    } catch (err) {
      if (err instanceof ApiError && err.code === "CAMPAIGN_CODE_TAKEN") setErros({ codigo: err.message });
      else setErroGeral((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const ehLink = f.modo === "link";
  const ehPercentual = !ehLink && f.beneficio === "porcento";

  return (
    <View className="gap-5">
      <Text className="text-2xl font-heading text-vupth-textPrimary">{campanha ? "Editar campanha" : "Criar campanha"}</Text>

      <Cartao titulo="1. Cupom ou link">
        <Pilulas<Modo>
          testID="modo"
          valor={f.modo}
          onChange={muda("modo")}
          opcoes={[
            { valor: "cupom", rotulo: "Cupom" },
            { valor: "link", rotulo: "Link (bonificação)" },
          ]}
        />
        <Text className="text-sm text-vupth-textSecondary">
          {ehLink
            ? "Quem compartilha o link ganha por corte concluído de conta criada por ele."
            : "Desconto ou taxa zero, público ou com código."}
        </Text>
      </Cartao>

      <Cartao titulo="2. A campanha">
        <Campo testID="nome" rotulo="Nome" valor={f.nome} onChange={muda("nome")} erro={erros.nome} />
        <Campo
          testID="descricao"
          rotulo="Descrição (opcional)"
          valor={f.descricao}
          onChange={muda("descricao")}
          erro={erros.descricao}
        />
        <Text className="text-sm font-medium text-vupth-textPrimary">Visibilidade</Text>
        <Pilulas<CampaignVisibility>
          testID="visibilidade"
          valor={f.visibilidade}
          onChange={muda("visibilidade")}
          opcoes={[
            { valor: "PUBLIC", rotulo: "Pública" },
            { valor: "PRIVATE", rotulo: "Privada (com cupom)" },
          ]}
        />
        <Campo
          testID="codigo"
          rotulo={f.visibilidade === "PRIVATE" ? "Código do cupom" : "Código do cupom (opcional)"}
          valor={f.codigo}
          onChange={muda("codigo")}
          erro={erros.codigo}
          placeholder="EX.: PARCEIRO10"
        />
        <Text className="text-sm font-medium text-vupth-textPrimary">Quem pode aceitar</Text>
        <Pilulas<CampaignAudience | "TODOS">
          testID="publico"
          valor={f.publico}
          onChange={muda("publico")}
          opcoes={(["TODOS", "CLIENT", "PROFESSIONAL", "OWNER"] as const).map((v) => ({
            valor: v,
            rotulo: NOME_PUBLICO[v],
          }))}
        />
        <Pilulas<"sim">
          testID="novos"
          valor={f.soClientesNovos ? "sim" : ([] as "sim"[])}
          onChange={() => muda("soClientesNovos")(!f.soClientesNovos)}
          opcoes={[{ valor: "sim", rotulo: "Só clientes novos" }]}
        />
      </Cartao>

      <Cartao titulo="3. O benefício">
        <Text testID="aviso-beneficio" className="text-sm text-vupth-textSecondary">
          {avisoBeneficio(f.modo)}
        </Text>
        {ehLink ? null : (
          <Pilulas<Beneficio>
            testID="beneficio"
            valor={f.beneficio}
            onChange={muda("beneficio")}
            opcoes={[
              { valor: "reais", rotulo: "Desconto em R$" },
              { valor: "porcento", rotulo: "Desconto em %" },
              { valor: "taxa-zero", rotulo: "Taxa zero" },
            ]}
          />
        )}
        {ehLink || f.beneficio !== "taxa-zero" ? (
          <Campo
            testID="valor"
            rotulo={ehLink ? "Valor por corte (R$)" : f.beneficio === "porcento" ? "Desconto (%)" : "Desconto (R$)"}
            valor={f.valor}
            onChange={(v) => muda("valor")(ehPercentual ? mascaraPercentual(v) : mascaraValor(v))}
            erro={erros.valor}
            placeholder={ehPercentual ? "0" : "0,00"}
          />
        ) : null}
        {ehLink || f.beneficio === "taxa-zero" ? null : (
          <>
            <Pilulas<BaseDoValor>
              testID="base"
              valor={f.baseDoValor}
              onChange={muda("baseDoValor")}
              opcoes={(Object.keys(NOME_BASE) as BaseDoValor[]).map((b) => ({ valor: b, rotulo: NOME_BASE[b] }))}
            />
            <Text testID="dica-base" className="text-sm text-vupth-textSecondary">
              {DICA_BASE}
            </Text>
          </>
        )}
        {ehLink ? <ParametrosBonificacao f={f} erros={erros} muda={muda} /> : null}
      </Cartao>

      <Cartao titulo="4. Quando e quantos">
        <View className="flex-row flex-wrap gap-4">
          <View className="min-w-[180px] flex-1">
            <Campo testID="inicio" rotulo="Início" valor={f.inicio} onChange={(v) => muda("inicio")(mascaraData(v))} erro={erros.inicio} placeholder="dd/mm/aaaa" maxLength={10} />
          </View>
          <View className="min-w-[180px] flex-1">
            <Campo testID="fim" rotulo="Fim" valor={f.fim} onChange={(v) => muda("fim")(mascaraData(v))} erro={erros.fim} placeholder="dd/mm/aaaa" maxLength={10} />
          </View>
        </View>
        <Text className="text-sm font-medium text-vupth-textPrimary">Dias da semana (nenhum = todos)</Text>
        <Pilulas<string>
          testID="dias"
          valor={f.dias}
          onChange={(d) => muda("dias")(f.dias.includes(d) ? f.dias.filter((x) => x !== d) : [...f.dias, d])}
          opcoes={DIAS.map((d) => ({ valor: d, rotulo: NOME_DIA[d] }))}
        />
        <Campo
          testID="limite"
          rotulo="Limite de pessoas (vazio = sem limite)"
          valor={f.limite}
          onChange={(v) => muda("limite")(somenteNumeros(v, 7))}
          erro={erros.limite}
        />
      </Cartao>

      <Simulacao f={f} editandoId={campanha?.id} existentes={existentes} />

      {erroGeral ? <Aviso texto={erroGeral} /> : null}
      <View className="flex-row gap-3">
        <Botao testID="salvar" titulo={campanha ? "Salvar" : "Criar campanha"} onPress={salvar} carregando={enviando} />
        <Botao testID="cancelar" titulo="Cancelar" tipo="secundario" onPress={onCancelar} />
      </View>
    </View>
  );
}

type Muda = <K extends keyof Formulario>(k: K) => (v: Formulario[K]) => void;

/** DEC-73: a bonificação nasce em branco e o Andre preenche; o Backend guarda (BAK-9, 3fdcec1). */
function ParametrosBonificacao({ f, erros, muda }: { f: Formulario; erros: ReturnType<typeof validar>; muda: Muda }) {
  return (
    <View testID="parametros-bonificacao" className="gap-3 rounded-xl border border-dashed border-vupth-border p-4">
      <Text className="text-sm font-heading text-vupth-textPrimary">Bonificação</Text>
      <View className="flex-row flex-wrap gap-4">
        <View className="min-w-[180px] flex-1">
          <Campo
            testID="pct-profissional"
            rotulo="% ao profissional"
            valor={f.pctProfissional}
            onChange={(v) => muda("pctProfissional")(mascaraPercentual(v))}
            erro={erros.pctProfissional}
          />
        </View>
        <View className="min-w-[180px] flex-1">
          <Campo
            testID="pct-dono"
            rotulo="% ao dono"
            valor={f.pctDono}
            onChange={(v) => muda("pctDono")(mascaraPercentual(v))}
            erro={erros.pctDono}
            dica="Os dois somam 100%."
          />
        </View>
      </View>
      <Text className="text-sm font-medium text-vupth-textPrimary">Quem conta</Text>
      <Pilulas<ReferralScope>
        testID="quem-conta"
        valor={f.quemConta || ([] as ReferralScope[])}
        onChange={muda("quemConta")}
        opcoes={(["ANY_PROFESSIONAL", "REFERRER_ESTABLISHMENT"] as const).map((v) => ({ valor: v, rotulo: NOME_QUEM_CONTA[v] }))}
      />
      {erros.quemConta ? <Text className="text-xs text-vupth-danger">{erros.quemConta}</Text> : null}
      <Text className="text-sm font-medium text-vupth-textPrimary">Pagamento</Text>
      <Pilulas<PayoutPeriod>
        testID="pagamento"
        valor={f.pagamento || ([] as PayoutPeriod[])}
        onChange={(p) => {
          muda("pagamento")(p);
          muda("diaPagamento")("");
        }}
        opcoes={[
          { valor: "WEEKLY", rotulo: "Semanal" },
          { valor: "MONTHLY", rotulo: "Mensal" },
        ]}
      />
      {erros.pagamento ? <Text className="text-xs text-vupth-danger">{erros.pagamento}</Text> : null}
      {f.pagamento === "WEEKLY" ? (
        <>
          <Pilulas<string>
            testID="dia-semana"
            valor={f.diaPagamento}
            onChange={muda("diaPagamento")}
            opcoes={DIA_DA_SEMANA.map((d, i) => ({ valor: String(i + 1), rotulo: d }))}
          />
          {erros.diaPagamento ? <Text className="text-xs text-vupth-danger">{erros.diaPagamento}</Text> : null}
        </>
      ) : f.pagamento === "MONTHLY" ? (
        <Campo
          testID="dia-mes"
          rotulo="Dia do mês (1 a 28)"
          valor={f.diaPagamento}
          onChange={(v) => muda("diaPagamento")(somenteNumeros(v, 2))}
          erro={erros.diaPagamento}
        />
      ) : null}
    </View>
  );
}
