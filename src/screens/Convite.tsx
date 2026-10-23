import { useState } from "react";
import { Text, View } from "react-native";

import { Aviso, Botao, Campo } from "../components/ui";
import { aceitarConvite, mensagemDeAcesso } from "../lib/acessos";
import { ApiError } from "../lib/api";

/** A tela do convidado (/convite?token=…): define a senha; depois entra e cadastra o Authenticator. */
export function Convite({ token, onEntrar }: { token?: string; onEntrar: () => void }) {
  const [senha, setSenha] = useState("");
  const [repete, setRepete] = useState("");
  const [erroSenha, setErroSenha] = useState<string>();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  async function enviar() {
    if (enviando) return;
    setErro(null);
    const falta = !senha ? "Digite a senha." : senha.length < 6 ? "De 6 a 64 caracteres" : senha !== repete ? "As senhas são diferentes." : undefined;
    setErroSenha(falta);
    if (falta || !token) return;
    setEnviando(true);
    try {
      setEmail((await aceitarConvite(token, senha)).email);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) setErroSenha(e.message);
      else setErro(e instanceof ApiError ? (e.status === 0 ? e.message : mensagemDeAcesso(e.code, e.message)) : (e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-vupth-forest p-4">
      <View className="w-full max-w-sm gap-5 rounded-card bg-white p-8">
        <Text className="text-2xl font-bold text-vupth-textPrimary">vupth · painel</Text>
        {!token ? (
          <Aviso texto="Este link de convite está incompleto. Abra de novo o link do e-mail ou peça outro convite." />
        ) : email ? (
          <>
            <Text className="text-vupth-textPrimary">Senha definida para {email}.</Text>
            <Text className="text-vupth-textSecondary">
              Agora entre com ela. No primeiro acesso você cadastra o Google Authenticator.
            </Text>
            <Botao testID="ir-entrar" titulo="Entrar" onPress={onEntrar} />
          </>
        ) : (
          <>
            <Text className="text-vupth-textSecondary">Você foi convidado. Defina a sua senha.</Text>
            <Campo testID="nova-senha" rotulo="Senha" valor={senha} onChange={setSenha} erro={erroSenha} dica="De 6 a 64 caracteres" maxLength={64} onEnviar={enviar} senha />
            <Campo testID="repete-senha" rotulo="Repita a senha" valor={repete} onChange={setRepete} maxLength={64} onEnviar={enviar} senha />
            {erro ? <Aviso texto={erro} /> : null}
            <Botao testID="definir" titulo="Definir senha" onPress={enviar} carregando={enviando} />
          </>
        )}
      </View>
    </View>
  );
}
