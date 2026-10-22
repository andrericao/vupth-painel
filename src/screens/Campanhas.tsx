import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Aviso, Barra, Botao, Cartao, Estado, Pilulas } from "../components/ui";
import {
  descreverBeneficio,
  descreverBonificacao,
  encerrarCampanha,
  listarCampanhas,
  NOME_PUBLICO,
  NOME_STATUS,
  ocupacao,
  pausarCampanha,
  retomarCampanha,
  type Campaign,
  type CampaignStatus,
} from "../lib/campaigns";
import { dataCurta } from "../lib/format";
import { CampanhaForm } from "./CampanhaForm";

type Filtro = CampaignStatus | "TODAS";
type Tela = { tipo: "lista" } | { tipo: "form"; campanha?: Campaign };

const TOM: Record<CampaignStatus, "ok" | "atencao" | "neutro"> = {
  RUNNING: "ok",
  SCHEDULED: "neutro",
  PAUSED: "atencao",
  ENDED: "neutro",
};

export function Campanhas({ hoje }: { hoje: string }) {
  const [tela, setTela] = useState<Tela>({ tipo: "lista" });
  const [campanhas, setCampanhas] = useState<Campaign[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("TODAS");

  const buscar = useCallback(
    () =>
      listarCampanhas().then(
        (l) => {
          setCampanhas(l);
          setCarregado(true);
        },
        (e: Error) => setErro(e.message),
      ),
    [],
  );

  useEffect(() => {
    buscar();
  }, [buscar]);

  const carregar = () => {
    setErro(null);
    buscar();
  };

  const troca = (c: Campaign) => setCampanhas((l) => l.map((x) => (x.id === c.id ? c : x)));

  if (tela.tipo === "form") {
    return (
      <CampanhaForm
        campanha={tela.campanha}
        hoje={hoje}
        onCancelar={() => setTela({ tipo: "lista" })}
        onPronto={(c) => {
          setCampanhas((l) => (tela.campanha ? l.map((x) => (x.id === c.id ? c : x)) : [c, ...l]));
          setCarregado(true);
          setTela({ tipo: "lista" });
        }}
      />
    );
  }

  const visiveis = campanhas.filter((c) => filtro === "TODAS" || c.status === filtro);
  const noAr = campanhas.filter((c) => c.status === "RUNNING").length;

  return (
    <View className="gap-5">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <View className="gap-1">
          <Text className="text-2xl font-bold text-vupth-textPrimary">Campanhas</Text>
          <Text className="text-vupth-textSecondary">
            {carregado ? `${noAr} no ar · ${campanhas.length} no total` : erro ? "Não deu para carregar." : "Carregando…"}
          </Text>
        </View>
        <Botao testID="criar" titulo="Criar campanha" onPress={() => setTela({ tipo: "form" })} />
      </View>

      <Pilulas<Filtro>
        testID="filtro"
        valor={filtro}
        onChange={setFiltro}
        opcoes={[
          { valor: "TODAS", rotulo: "Todas" },
          { valor: "RUNNING", rotulo: "No ar" },
          { valor: "SCHEDULED", rotulo: "Agendadas" },
          { valor: "PAUSED", rotulo: "Pausadas" },
          { valor: "ENDED", rotulo: "Encerradas" },
        ]}
      />

      {erro ? (
        <View className="items-start gap-3">
          <Aviso texto={erro} />
          <Botao testID="tentar" titulo="Tentar de novo" tipo="secundario" onPress={carregar} />
        </View>
      ) : null}
      {!carregado && !erro ? <ActivityIndicator testID="carregando" color="#163300" /> : null}
      {carregado && !visiveis.length ? (
        <Text testID="vazio" className="text-vupth-textSecondary">
          {campanhas.length ? "Nenhuma campanha neste filtro." : "Nenhuma campanha ainda. A primeira nasce aqui (DEC-69)."}
        </Text>
      ) : null}

      {visiveis.map((c) => (
        <LinhaCampanha
          key={c.id}
          c={c}
          onEditar={() => setTela({ tipo: "form", campanha: c })}
          onMudou={troca}
          onErro={setErro}
        />
      ))}

      <Cartao titulo="Funil da campanha">
        <Text className="text-vupth-textSecondary">
          O funil link aberto → conta criada → corte concluído chega com o Backend.
        </Text>
        <Estado tom="atencao" texto="Espera o Backend: o funil da campanha" />
      </Cartao>
    </View>
  );
}

type LinhaProps = { c: Campaign; onEditar: () => void; onMudou: (c: Campaign) => void; onErro: (m: string) => void };

function LinhaCampanha({ c, onEditar, onMudou, onErro }: LinhaProps) {
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const fracao = ocupacao(c);
  const bonificacao = descreverBonificacao(c);

  async function agir(acao: (id: string) => Promise<Campaign>) {
    setOcupado(true);
    try {
      onMudou(await acao(c.id));
    } catch (e) {
      onErro((e as Error).message);
    } finally {
      setOcupado(false);
      setConfirmar(false);
    }
  }

  return (
    <View testID={`campanha-${c.id}`} className="gap-3 rounded-card border border-vupth-border bg-white p-5">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="text-lg font-semibold text-vupth-textPrimary">{c.name}</Text>
        <Estado tom={TOM[c.status]} texto={NOME_STATUS[c.status]} />
      </View>
      <Text className="text-vupth-textSecondary">
        {descreverBeneficio(c)} · {c.visibility === "PRIVATE" ? `Privada · ${c.code}` : `Pública${c.code ? ` · ${c.code}` : ""}`} ·{" "}
        {NOME_PUBLICO[c.audience ?? "TODOS"]} · {dataCurta(c.starts_at)} a {dataCurta(c.ends_at)}
      </Text>
      {bonificacao ? <Text className="text-sm text-vupth-textSecondary">{bonificacao}</Text> : null}
      <View className="gap-1">
        <Text className="text-sm text-vupth-textPrimary">
          {fracao == null ? `${c.redemptions} aceitaram · sem limite` : `${c.redemptions} de ${c.max_redemptions}`}
        </Text>
        {fracao == null ? null : <Barra testID={`barra-${c.id}`} fracao={fracao} />}
      </View>
      {c.status === "ENDED" ? null : (
        <View className="flex-row flex-wrap gap-2">
          <Botao testID={`editar-${c.id}`} titulo="Editar" tipo="secundario" onPress={onEditar} desabilitado={ocupado} />
          {c.status === "PAUSED" ? (
            <Botao testID={`retomar-${c.id}`} titulo="Retomar" tipo="secundario" onPress={() => agir(retomarCampanha)} carregando={ocupado} />
          ) : (
            <Botao testID={`pausar-${c.id}`} titulo="Pausar" tipo="secundario" onPress={() => agir(pausarCampanha)} carregando={ocupado} />
          )}
          {confirmar ? (
            <Botao testID={`confirmar-${c.id}`} titulo="Confirmar: encerrar" tipo="perigo" onPress={() => agir(encerrarCampanha)} carregando={ocupado} />
          ) : (
            <Botao testID={`encerrar-${c.id}`} titulo="Encerrar" tipo="perigo" onPress={() => setConfirmar(true)} desabilitado={ocupado} />
          )}
        </View>
      )}
    </View>
  );
}
