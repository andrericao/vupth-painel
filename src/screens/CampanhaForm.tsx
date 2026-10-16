import { useState } from "react";
import { Text, View } from "react-native";

import { Aviso, Botao, Campo, Cartao, Estado, Pilulas } from "../components/ui";
import { ApiError } from "../lib/api";
import {
  criarCampanha,
  DIAS,
  editarCampanha,
  formularioDe,
  formularioVazio,
  NOME_DIA,
  NOME_PUBLICO,
  paraRequest,
  validar,
  type Beneficio,
  type Campaign,
  type CampaignAudience,
  type CampaignVisibility,
  type Formulario,
  type Modo,
} from "../lib/campaigns";

type Props = { campanha?: Campaign; hoje: string; onPronto: (c: Campaign) => void; onCancelar: () => void };

/** Criar campanha → cupom ou link → os parâmetros (DEC-69, 73). Editar usa o mesmo formulário. */
export function CampanhaForm({ campanha, hoje, onPronto, onCancelar }: Props) {
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

  return (
    <View className="gap-5">
      <Text className="text-2xl font-bold text-vupth-textPrimary">{campanha ? "Editar campanha" : "Criar campanha"}</Text>

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
            onChange={muda("valor")}
            erro={erros.valor}
            placeholder="0,00"
          />
        ) : null}
        {ehLink ? <ParametrosBonificacao /> : null}
      </Cartao>

      <Cartao titulo="4. Quando e quantos">
        <View className="flex-row flex-wrap gap-4">
          <View className="min-w-[180px] flex-1">
            <Campo testID="inicio" rotulo="Início" valor={f.inicio} onChange={muda("inicio")} erro={erros.inicio} placeholder="AAAA-MM-DD" />
          </View>
          <View className="min-w-[180px] flex-1">
            <Campo testID="fim" rotulo="Fim" valor={f.fim} onChange={muda("fim")} erro={erros.fim} placeholder="AAAA-MM-DD" />
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
          onChange={muda("limite")}
          erro={erros.limite}
        />
      </Cartao>

      {erroGeral ? <Aviso texto={erroGeral} /> : null}
      <View className="flex-row gap-3">
        <Botao testID="salvar" titulo={campanha ? "Salvar" : "Criar campanha"} onPress={salvar} carregando={enviando} />
        <Botao testID="cancelar" titulo="Cancelar" tipo="secundario" onPress={onCancelar} />
      </View>
    </View>
  );
}

/** DEC-73: os parâmetros da bonificação ficam em branco para o Andre preencher; o Backend ainda não os guarda. */
function ParametrosBonificacao() {
  return (
    <View testID="parametros-bonificacao" className="gap-3 rounded-xl border border-dashed border-vupth-border p-4">
      <Estado tom="atencao" texto="Espera o Backend: BAK-9 · bonificacao" />
      <View className="flex-row flex-wrap gap-4">
        {["% ao profissional", "% ao dono", "Quem conta", "Pagamento (semanal ou mensal)", "Dia do pagamento"].map((r) => (
          <View key={r} className="min-w-[180px] flex-1">
            <Campo rotulo={r} valor="" desabilitado />
          </View>
        ))}
      </View>
    </View>
  );
}
