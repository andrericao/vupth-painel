import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { useCor } from "../useCor";

// Peças do painel, no desenho do app: floresta sobre verde, pílulas, cartões de 20px.

type BotaoProps = {
  titulo: string;
  onPress: () => void;
  tipo?: "primario" | "secundario" | "perigo";
  carregando?: boolean;
  desabilitado?: boolean;
  testID?: string;
};

const FUNDO = {
  primario: "bg-vupth-green",
  secundario: "border border-vupth-border bg-vupth-background",
  perigo: "bg-vupth-dangerTint",
};
const TEXTO = { primario: "text-vupth-onGreen", secundario: "text-vupth-textPrimary", perigo: "text-vupth-danger" };

export function Botao({ titulo, onPress, tipo = "primario", carregando, desabilitado, testID }: BotaoProps) {
  const cor = useCor();
  const off = desabilitado || carregando;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      disabled={off}
      onPress={onPress}
      className={`h-11 flex-row items-center justify-center rounded-full px-5 ${FUNDO[tipo]} ${off ? "opacity-50" : ""}`}
    >
      {carregando ? <ActivityIndicator color={tipo === "primario" ? cor.onGreen : cor.textPrimary} /> : <Text className={`font-heading ${TEXTO[tipo]}`}>{titulo}</Text>}
    </Pressable>
  );
}

/** Indicador de carregamento das leituras. */
export function Carregando() {
  const cor = useCor();
  return <ActivityIndicator testID="carregando" color={cor.textPrimary} />;
}

type CampoProps = {
  rotulo: string;
  valor: string;
  onChange?: (v: string) => void;
  erro?: string;
  dica?: string;
  placeholder?: string;
  senha?: boolean;
  maxLength?: number;
  desabilitado?: boolean;
  /** Enter no campo (teclado ou web) manda o formulário. */
  onEnviar?: () => void;
  /** Sinal fixo à direita do campo, como o % das porcentagens. */
  sufixo?: string;
  testID?: string;
};

export function Campo({
  rotulo,
  valor,
  onChange,
  erro,
  dica,
  placeholder,
  senha,
  maxLength,
  desabilitado,
  onEnviar,
  sufixo,
  testID,
}: CampoProps) {
  const cor = useCor();
  const [visivel, setVisivel] = useState(false);
  const oculta = !!senha && !visivel;
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-vupth-textPrimary">{rotulo}</Text>
      <View className="justify-center">
        <TextInput
          testID={testID}
          accessibilityLabel={rotulo}
          value={valor}
          onChangeText={onChange}
          onSubmitEditing={onEnviar}
          returnKeyType={onEnviar ? "go" : undefined}
          placeholder={placeholder}
          placeholderTextColor={cor.textPlaceholder}
          secureTextEntry={oculta}
          maxLength={maxLength}
          editable={!desabilitado}
          className={`h-11 rounded-xl border px-3 text-vupth-textPrimary ${senha || sufixo ? "pr-12" : ""} ${
            erro ? "border-vupth-danger" : "border-vupth-border"
          } ${desabilitado ? "bg-vupth-surface" : "bg-vupth-background"}`}
        />
        {sufixo ? (
          <Text testID={testID ? `${testID}-sufixo` : undefined} className="absolute right-3 text-vupth-textSecondary">
            {sufixo}
          </Text>
        ) : null}
        {senha ? (
          <Pressable
            testID={testID ? `${testID}-ver` : undefined}
            accessibilityRole="button"
            accessibilityLabel={visivel ? "Ocultar senha" : "Mostrar senha"}
            onPress={() => setVisivel((v) => !v)}
            className="absolute right-3"
          >
            {visivel ? <EyeOff size={20} color={cor.textPrimary} /> : <Eye size={20} color={cor.textPrimary} />}
          </Pressable>
        ) : null}
      </View>
      {erro ? (
        <Text className="text-xs text-vupth-danger">{erro}</Text>
      ) : dica ? (
        <Text className="text-xs text-vupth-textSecondary">{dica}</Text>
      ) : null}
    </View>
  );
}

type Opcao<T extends string> = { valor: T; rotulo: string };

/** Escolha de uma opção em pílulas (no lugar do select). */
export function Pilulas<T extends string>({
  opcoes,
  valor,
  onChange,
  testID,
}: {
  opcoes: Opcao<T>[];
  valor: T | T[];
  onChange: (v: T) => void;
  testID?: string;
}) {
  const marcado = (v: T) => (Array.isArray(valor) ? valor.includes(v) : valor === v);
  return (
    <View className="flex-row flex-wrap gap-2" testID={testID}>
      {opcoes.map((o) => (
        <Pressable
          key={o.valor}
          testID={testID ? `${testID}-${o.valor}` : undefined}
          accessibilityRole="button"
          accessibilityState={{ selected: marcado(o.valor) }}
          onPress={() => onChange(o.valor)}
          className={`rounded-full border px-4 py-2 ${
            marcado(o.valor) ? "border-vupth-greenTint bg-vupth-greenTint" : "border-vupth-border bg-vupth-background"
          }`}
        >
          <Text className={marcado(o.valor) ? "text-vupth-onGreenTint" : "text-vupth-textPrimary"}>{o.rotulo}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const COR_ESTADO = {
  ok: "bg-vupth-greenTint text-vupth-onGreenTint",
  atencao: "bg-vupth-accentPeach text-vupth-onAccentPeach",
  erro: "bg-vupth-dangerTint text-vupth-danger",
  neutro: "bg-vupth-surface text-vupth-textSecondary",
};

/** Cor só para estado (proposta do ADM-1): verde ok, âmbar atenção, vermelho erro. */
export function Estado({ texto, tom }: { texto: string; tom: keyof typeof COR_ESTADO }) {
  const [fundo, cor] = COR_ESTADO[tom].split(" ");
  return (
    <View className={`self-start rounded-full px-3 py-1 ${fundo}`}>
      <Text className={`text-xs font-heading ${cor}`}>{texto}</Text>
    </View>
  );
}

export function Cartao({ children, titulo, acao }: { children: ReactNode; titulo?: string; acao?: ReactNode }) {
  return (
    <View className="gap-4 rounded-card bg-vupth-surface p-5">
      {titulo || acao ? (
        <View className="flex-row items-center justify-between gap-3">
          {titulo ? <Text className="text-base font-heading text-vupth-textPrimary">{titulo}</Text> : <View />}
          {acao}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Barra de vagas: "37 de 50". */
export function Barra({ fracao, testID }: { fracao: number; testID?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, fracao)) * 100);
  const cor = pct >= 80 ? "bg-vupth-danger" : "bg-vupth-green";
  return (
    <View testID={testID} className="h-2 w-full overflow-hidden rounded-full bg-vupth-surfaceAlt">
      <View className={`h-2 rounded-full ${cor}`} style={{ width: `${pct}%` }} />
    </View>
  );
}

export function Aviso({ texto, tom = "erro" }: { texto: string; tom?: "erro" | "atencao" }) {
  return (
    <View
      accessible
      accessibilityRole="alert"
      className={`rounded-xl px-4 py-3 ${tom === "erro" ? "bg-vupth-dangerTint" : "bg-vupth-accentPeach"}`}
    >
      <Text className={tom === "erro" ? "text-vupth-danger" : "text-vupth-onAccentPeach"}>{texto}</Text>
    </View>
  );
}
