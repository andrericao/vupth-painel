import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Aviso, Botao, Campo } from "../components/ui";
import { ApiError } from "../lib/api";
import {
  concluirEntrada,
  confirmarConfiguracao,
  iniciarConfiguracao,
  verificarCodigo,
  type Configuracao,
} from "../lib/auth";

/** Mensagem para cada erro do segundo fator (401 ADMIN_TOTP_INVALID, 429 ADMIN_TOTP_LOCKED). */
export function erroDoCodigo(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "ADMIN_TOTP_INVALID") return "Código errado. Confira o aplicativo e tente de novo.";
    if (e.code === "ADMIN_TOTP_LOCKED") return "Muitos erros seguidos. Espere 15 minutos e tente de novo.";
    if (e.status === 0) return "Sem conexão com o servidor. Confira a internet e tente de novo.";
  }
  return (e as Error).message;
}

type Props = { etapa: "configurar" | "codigo"; onPronto: () => void };

/** Passo 2 do login: cadastrar o Authenticator (1ª vez, com os códigos de recuperação) ou digitar o código. */
export function SegundoFator({ etapa, onPronto }: Props) {
  return etapa === "configurar" ? <Configurar onPronto={onPronto} /> : <PedirCodigo onPronto={onPronto} />;
}

function PedirCodigo({ onPronto }: { onPronto: () => void }) {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!codigo.trim()) {
      setErro("Digite o código.");
      return;
    }
    setErro(undefined);
    setEnviando(true);
    try {
      await verificarCodigo(codigo);
      onPronto();
    } catch (e) {
      setErro(erroDoCodigo(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Text className="text-vupth-textSecondary">Abra o Google Authenticator e digite o código de 6 dígitos.</Text>
      <Campo
        testID="codigo"
        rotulo="Código"
        valor={codigo}
        onChange={setCodigo}
        erro={erro}
        dica="Perdeu o celular? Use um código de recuperação (ABCDE-FGHJK)."
        placeholder="123456"
      />
      <Botao testID="verificar" titulo="Entrar" onPress={enviar} carregando={enviando} />
    </>
  );
}

function Configurar({ onPronto }: { onPronto: () => void }) {
  const [config, setConfig] = useState<Configuracao>();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const [guardar, setGuardar] = useState<string[]>();

  useEffect(() => {
    iniciarConfiguracao()
      .then(setConfig)
      .catch((e) => setErro(erroDoCodigo(e)));
  }, []);

  async function confirmar() {
    if (!codigo.trim()) {
      setErro("Digite o código do aplicativo.");
      return;
    }
    setErro(undefined);
    setEnviando(true);
    try {
      setGuardar(await confirmarConfiguracao(codigo));
    } catch (e) {
      setErro(erroDoCodigo(e));
    } finally {
      setEnviando(false);
    }
  }

  if (guardar) {
    return (
      <>
        <Text className="font-semibold text-vupth-textPrimary">Guarde estes códigos de recuperação</Text>
        <Text className="text-vupth-textSecondary">
          Eles aparecem só agora. Cada um vale uma vez, se você perder o celular.
        </Text>
        <View testID="recuperacao" className="gap-1 rounded-xl bg-vupth-surface p-3">
          {guardar.map((c) => (
            <Text key={c} selectable className="font-mono text-vupth-textPrimary">
              {c}
            </Text>
          ))}
        </View>
        <Botao testID="guardei" titulo="Guardei os códigos" onPress={() => { concluirEntrada(); onPronto(); }} />
      </>
    );
  }

  return (
    <>
      <Text className="text-vupth-textSecondary">
        Primeiro acesso: cadastre o Google Authenticator. Em “Adicionar conta”, escolha “Inserir chave de configuração”.
      </Text>
      {config ? (
        <View className="gap-1 rounded-xl bg-vupth-surface p-3">
          <Text className="text-xs text-vupth-textSecondary">Chave</Text>
          <Text testID="chave" selectable className="font-mono text-vupth-textPrimary">
            {config.secret}
          </Text>
        </View>
      ) : erro ? null : (
        <Text testID="carregando-chave" className="text-vupth-textSecondary">
          Gerando a chave…
        </Text>
      )}
      <Campo
        testID="codigo"
        rotulo="Código do aplicativo"
        valor={codigo}
        onChange={setCodigo}
        erro={config ? erro : undefined}
        placeholder="123456"
      />
      {!config && erro ? <Aviso texto={erro} /> : null}
      <Botao testID="confirmar" titulo="Confirmar" onPress={confirmar} carregando={enviando} desabilitado={!config} />
    </>
  );
}
