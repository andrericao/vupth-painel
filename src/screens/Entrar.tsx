import { useState } from "react";
import { Text, View } from "react-native";

import { Aviso, Botao, Campo } from "../components/ui";
import { ApiError } from "../lib/api";
import { entrar, etapaDoSegundoFator } from "../lib/auth";
import { SegundoFator } from "./SegundoFator";

/** E-mail e senha; depois o segundo fator (código do Google Authenticator), quando o Backend o exige. */
export function Entrar({ onEntrou }: { onEntrou: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erroEmail, setErroEmail] = useState<string>();
  const [erroSenha, setErroSenha] = useState<string>();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [etapa, setEtapa] = useState<"configurar" | "codigo">();

  async function enviar() {
    if (enviando) return;
    const faltaEmail = !email.trim() ? "Digite o e-mail." : undefined;
    const faltaSenha = !senha ? "Digite a senha." : undefined;
    setErroEmail(faltaEmail);
    setErroSenha(faltaSenha);
    setErro(null);
    if (faltaEmail || faltaSenha) return;
    setEnviando(true);
    try {
      await entrar(email, senha);
      const proxima = await etapaDoSegundoFator();
      if (proxima === "pronto") onEntrou();
      else setEtapa(proxima);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      if (status === 401) setErroSenha("E-mail ou senha errados.");
      else if (status === 0) setErro("Sem conexão com o servidor. Confira a internet e tente de novo.");
      else if (status === 502 || status === 503 || status === 504)
        setErro("O servidor está acordando. Espere cerca de um minuto e tente de novo.");
      else setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-vupth-background p-4">
      <View className="w-full max-w-sm gap-5 rounded-card bg-vupth-surface p-8">
        <View className="gap-1">
          <Text className="text-2xl font-bold text-vupth-textPrimary">vupth · painel</Text>
          <Text className="text-vupth-textSecondary">Só para a conta de administrador.</Text>
        </View>
        {etapa ? (
          <SegundoFator etapa={etapa} onPronto={onEntrou} />
        ) : (
          <>
            <Campo testID="email" rotulo="E-mail" valor={email} onChange={setEmail} erro={erroEmail} onEnviar={enviar} placeholder="voce@exemplo.com" />
            <Campo
              testID="senha"
              rotulo="Senha"
              valor={senha}
              onChange={setSenha}
              erro={erroSenha}
              dica="De 6 a 64 caracteres"
              maxLength={64}
              onEnviar={enviar}
              senha
            />
            {erro ? <Aviso texto={erro} /> : null}
            <Botao testID="entrar" titulo="Entrar" onPress={enviar} carregando={enviando} />
          </>
        )}
      </View>
    </View>
  );
}
