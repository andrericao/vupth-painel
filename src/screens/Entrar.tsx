import { useState } from "react";
import { Text, View } from "react-native";

import { Aviso, Botao, Campo } from "../components/ui";
import { ApiError } from "../lib/api";
import { entrar } from "../lib/auth";

/** E-mail, senha e o código de 6 dígitos (o código entra quando o Backend tiver a segunda etapa). */
export function Entrar({ onEntrou }: { onEntrou: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!email.trim() || !senha) {
      setErro("Preencha o e-mail e a senha.");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
      onEntrou();
    } catch (e) {
      setErro(e instanceof ApiError && e.status === 401 ? "E-mail ou senha errados." : (e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-vupth-forest p-4">
      <View className="w-full max-w-sm gap-5 rounded-card bg-white p-8">
        <View className="gap-1">
          <Text className="text-2xl font-bold text-vupth-textPrimary">vupth · painel</Text>
          <Text className="text-vupth-textSecondary">Só para a conta de administrador.</Text>
        </View>
        <Campo testID="email" rotulo="E-mail" valor={email} onChange={setEmail} placeholder="voce@exemplo.com" />
        <Campo testID="senha" rotulo="Senha" valor={senha} onChange={setSenha} senha />
        <Campo
          testID="codigo"
          rotulo="Código do Google Authenticator"
          valor=""
          desabilitado
          dica="Chega com a segunda etapa do Backend."
        />
        {erro ? <Aviso texto={erro} /> : null}
        <Botao testID="entrar" titulo="Entrar" onPress={enviar} carregando={enviando} />
      </View>
    </View>
  );
}
