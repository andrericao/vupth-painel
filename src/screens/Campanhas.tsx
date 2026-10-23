import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Aviso, Barra, Botao, Cartao, Estado, Pilulas } from "../components/ui";
import {
  descreverBeneficio,
  comoParticipar,
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
import { gastam, itemDaCampanha } from "../lib/simulacao";
import { dataCurta, maisNovoPrimeiro } from "../lib/format";
import { CampanhaForm } from "./CampanhaForm";

type Filtro = CampaignStatus | "TODAS";
type Tela = { tipo: "lista" } | { tipo: "form"; campanha?: Campaign };

const TOM: Record<CampaignStatus, "ok" | "atencao" | "neutro"> = {
  RUNNING: "ok",
  SCHEDULED: "neutro",
  PAUSED: "atencao",
  ENDED: "neutro",
};

/** Copia para a área de transferência; sem permissão do navegador, devolve false. */
async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

function Codigo({ id, codigo }: { id: string; codigo: string }) {
  const [copiado, setCopiado] = useState<boolean | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copiarCodigo() {
    setCopiado(await copiar(codigo));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopiado(null), 2000);
  }

  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <Text className="text-vupth-textSecondary">Código</Text>
      <Text testID={`codigo-${id}`} selectable className="font-semibold text-vupth-textPrimary">
        {codigo}
      </Text>
      <Botao testID={`copiar-${id}`} titulo="Copiar" tipo="secundario" onPress={copiarCodigo} />
      {copiado == null ? null : (
        <Text testID={`copiado-${id}`} accessibilityLiveRegion="polite" className="text-sm text-vupth-textSecondary">
          {copiado ? "Copiado" : "Não deu para copiar; selecione o código"}
        </Text>
      )}
    </View>
  );
}

export function Campanhas({ hoje }: { hoje: string }) {
  const [tela, setTela] = useState<Tela>({ tipo: "lista" });
  const [campanhas, setCampanhas] = useState<Campaign[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [novaId, setNovaId] = useState<string | null>(null);

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
        existentes={campanhas.filter(gastam).map(itemDaCampanha)}
        hoje={hoje}
        onCancelar={() => setTela({ tipo: "lista" })}
        onPronto={(c) => {
          setCampanhas((l) => (tela.campanha ? l.map((x) => (x.id === c.id ? c : x)) : [c, ...l]));
          setNovaId(tela.campanha ? null : c.id);
          setCarregado(true);
          setTela({ tipo: "lista" });
        }}
      />
    );
  }

  const visiveis = maisNovoPrimeiro(
    campanhas.filter((c) => filtro === "TODAS" || c.status === filtro),
    (c) => c.starts_at,
  );
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
          nova={c.id === novaId}
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

type LinhaProps = { c: Campaign; nova: boolean; onEditar: () => void; onMudou: (c: Campaign) => void; onErro: (m: string) => void };

function LinhaCampanha({ c, nova, onEditar, onMudou, onErro }: LinhaProps) {
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const fracao = ocupacao(c);
  const bonificacao = descreverBonificacao(c);
  const participar = comoParticipar(c);

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
    <View testID={`campanha-${c.id}`} className={`gap-3 rounded-card border bg-white p-5 ${nova ? "border-vupth-green" : "border-vupth-border"}`}>
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="text-lg font-semibold text-vupth-textPrimary">{c.name}</Text>
        {nova ? <Estado tom="ok" texto="Criada agora" /> : null}
        <Estado tom={TOM[c.status]} texto={NOME_STATUS[c.status]} />
      </View>
      <Text className="text-vupth-textSecondary">
        {descreverBeneficio(c)} · {c.visibility === "PRIVATE" ? "Privada" : "Pública"} · {NOME_PUBLICO[c.audience ?? "TODOS"]} · {dataCurta(c.starts_at)} a {dataCurta(c.ends_at)}
      </Text>
      {c.code ? <Codigo id={c.id} codigo={c.code} /> : null}
      {bonificacao ? <Text className="text-sm text-vupth-textSecondary">{bonificacao}</Text> : null}
      {participar ? <Text testID={`participar-${c.id}`} className="text-sm text-vupth-textSecondary">{participar}</Text> : null}
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
