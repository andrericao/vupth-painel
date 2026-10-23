import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Aviso, Botao, Campo, Carregando, Cartao, Pilulas } from "../components/ui";
import {
  alternar,
  cancelarConvite,
  convidar,
  listarConvites,
  listarUsuariosDoPainel,
  mensagemDeAcesso,
  mudarPermissoes,
  NOME_PERMISSAO,
  PERMISSOES,
  revogarAcesso,
  validarConvite,
  type Convite,
  type Permissao,
  type UsuarioDoPainel,
} from "../lib/acessos";
import { ApiError } from "../lib/api";
import { dataCurta } from "../lib/format";

const OPCOES = PERMISSOES.map((p) => ({ valor: p, rotulo: NOME_PERMISSAO[p] }));

function texto(e: unknown): string {
  return e instanceof ApiError ? mensagemDeAcesso(e.code, e.message) : (e as Error).message;
}

/** Quem usa o painel, o que cada um vê e os convites pendentes (DEC-74; precisa da permissão Acessos). */
export function Acessos() {
  const [usuarios, setUsuarios] = useState<UsuarioDoPainel[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(
    () =>
      Promise.all([listarUsuariosDoPainel(), listarConvites()]).then(
        ([u, c]) => {
          setUsuarios(u);
          setConvites(c);
          setCarregado(true);
        },
        (e) => setErro(texto(e)),
      ),
    [],
  );

  useEffect(() => {
    buscar();
  }, [buscar]);

  return (
    <View className="gap-5">
      <View className="gap-1">
        <Text className="text-2xl font-bold text-vupth-textPrimary">Acessos</Text>
        <Text className="text-vupth-textSecondary">
          {carregado ? `${usuarios.length} no painel · ${convites.length} convite(s) pendente(s)` : erro ? "Não deu para carregar." : "Carregando…"}
        </Text>
      </View>

      {erro ? (
        <View className="items-start gap-3">
          <Aviso texto={erro} />
          <Botao
            testID="tentar"
            titulo="Tentar de novo"
            tipo="secundario"
            onPress={() => {
              setErro(null);
              buscar();
            }}
          />
        </View>
      ) : null}
      {!carregado && !erro ? <Carregando /> : null}

      {carregado ? (
        <>
          <NovoConvite onConvidou={(c) => setConvites((l) => [c, ...l])} />
          {convites.length ? (
            <Cartao titulo="Convites pendentes">
              {convites.map((c) => (
                <LinhaConvite key={c.id} c={c} onCancelado={() => setConvites((l) => l.filter((x) => x.id !== c.id))} onErro={setErro} />
              ))}
            </Cartao>
          ) : null}
          <Cartao titulo="No painel">
            {usuarios.map((u) => (
              <LinhaUsuario
                key={u.id}
                u={u}
                onMudou={(n) => setUsuarios((l) => l.map((x) => (x.id === n.id ? n : x)))}
                onRevogado={() => setUsuarios((l) => l.filter((x) => x.id !== u.id))}
                onErro={setErro}
              />
            ))}
          </Cartao>
        </>
      ) : null}
    </View>
  );
}

function NovoConvite({ onConvidou }: { onConvidou: (c: Convite) => void }) {
  const [email, setEmail] = useState("");
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [erros, setErros] = useState<{ email?: string; permissoes?: string }>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    const e = validarConvite(email, permissoes);
    setErros(e);
    setEnviado(null);
    setErro(null);
    if (e.email || e.permissoes) return;
    setEnviando(true);
    try {
      const c = await convidar(email, permissoes);
      onConvidou(c);
      setEnviado(email.trim());
      setEmail("");
      setPermissoes([]);
    } catch (x) {
      setErro(texto(x));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Cartao titulo="Convidar">
      <Campo testID="convite-email" rotulo="E-mail" valor={email} onChange={setEmail} erro={erros.email} placeholder="pessoa@exemplo.com" />
      <View className="gap-1">
        <Text className="text-sm font-medium text-vupth-textPrimary">O que a pessoa vê</Text>
        <Pilulas<Permissao>
          testID="convite-perm"
          valor={permissoes}
          onChange={(p) => setPermissoes((l) => alternar(l, p))}
          opcoes={OPCOES}
        />
        {erros.permissoes ? <Text className="text-xs text-vupth-danger">{erros.permissoes}</Text> : null}
      </View>
      {erro ? <Aviso texto={erro} /> : null}
      {enviado ? <Aviso tom="atencao" texto={`Convite enviado para ${enviado}. O link vale 7 dias e só abre uma vez.`} /> : null}
      <Botao testID="convidar" titulo="Enviar convite" onPress={enviar} carregando={enviando} />
    </Cartao>
  );
}

function LinhaConvite({ c, onCancelado, onErro }: { c: Convite; onCancelado: () => void; onErro: (e: string) => void }) {
  const [ocupado, setOcupado] = useState(false);
  async function cancelar() {
    setOcupado(true);
    try {
      await cancelarConvite(c.id);
      onCancelado();
    } catch (e) {
      onErro(texto(e));
      setOcupado(false);
    }
  }
  return (
    <View className="flex-row flex-wrap items-center justify-between gap-2">
      <View className="flex-1 gap-0.5">
        <Text className="text-vupth-textPrimary">{c.email}</Text>
        <Text className="text-xs text-vupth-textSecondary">
          {c.permissions.map((p) => NOME_PERMISSAO[p]).join(" · ")}
          {c.expires_at ? ` · vence ${dataCurta(c.expires_at)}` : ""}
        </Text>
      </View>
      <Botao testID={`cancelar-${c.id}`} titulo="Cancelar" tipo="secundario" onPress={cancelar} carregando={ocupado} />
    </View>
  );
}

function LinhaUsuario({
  u,
  onMudou,
  onRevogado,
  onErro,
}: {
  u: UsuarioDoPainel;
  onMudou: (u: UsuarioDoPainel) => void;
  onRevogado: () => void;
  onErro: (e: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [permissoes, setPermissoes] = useState<Permissao[]>(u.permissions);
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function salvar() {
    if (!permissoes.length) {
      setAviso("Marque pelo menos uma tela.");
      return;
    }
    setOcupado(true);
    setAviso(null);
    try {
      onMudou(await mudarPermissoes(u.id, permissoes));
      setEditando(false);
    } catch (e) {
      setAviso(texto(e));
    } finally {
      setOcupado(false);
    }
  }

  async function revogar() {
    setOcupado(true);
    try {
      await revogarAcesso(u.id);
      onRevogado();
    } catch (e) {
      onErro(texto(e));
      setConfirmar(false);
      setOcupado(false);
    }
  }

  return (
    <View testID={`usuario-${u.id}`} className="gap-2 border-b border-vupth-border pb-3">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-1 gap-0.5">
          <Text className="font-semibold text-vupth-textPrimary">
            {u.name || u.email}
            {u.owner ? " · dono" : ""}
          </Text>
          <Text className="text-xs text-vupth-textSecondary">
            {u.email} · {u.totp_enabled ? "Authenticator ativo" : "sem Authenticator ainda"}
          </Text>
          <Text className="text-xs text-vupth-textSecondary">
            {u.owner ? "Vê tudo" : u.permissions.map((p) => NOME_PERMISSAO[p]).join(" · ")}
          </Text>
        </View>
        {u.owner ? null : (
          <View className="flex-row gap-2">
            <Botao testID={`editar-${u.id}`} titulo="Mudar acessos" tipo="secundario" onPress={() => setEditando((v) => !v)} />
            {confirmar ? (
              <Botao testID={`confirmar-${u.id}`} titulo="Confirmar" tipo="perigo" onPress={revogar} carregando={ocupado} />
            ) : (
              <Botao testID={`revogar-${u.id}`} titulo="Tirar acesso" tipo="perigo" onPress={() => setConfirmar(true)} />
            )}
          </View>
        )}
      </View>
      {editando ? (
        <View className="gap-2">
          <Pilulas<Permissao>
            testID={`perm-${u.id}`}
            valor={permissoes}
            onChange={(p) => setPermissoes((l) => alternar(l, p))}
            opcoes={OPCOES}
          />
          {aviso ? <Aviso texto={aviso} /> : null}
          <View className="flex-row">
            <Botao testID={`salvar-${u.id}`} titulo="Salvar" onPress={salvar} carregando={ocupado} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
