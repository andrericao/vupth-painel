import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

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
  secundario: "border border-vupth-border bg-white",
  perigo: "bg-vupth-dangerTint",
};
const TEXTO = { primario: "text-vupth-forest", secundario: "text-vupth-forest", perigo: "text-vupth-danger" };

export function Botao({ titulo, onPress, tipo = "primario", carregando, desabilitado, testID }: BotaoProps) {
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
      {carregando ? <ActivityIndicator color="#163300" /> : <Text className={`font-semibold ${TEXTO[tipo]}`}>{titulo}</Text>}
    </Pressable>
  );
}

type CampoProps = {
  rotulo: string;
  valor: string;
  onChange?: (v: string) => void;
  erro?: string;
  dica?: string;
  placeholder?: string;
  senha?: boolean;
  desabilitado?: boolean;
  testID?: string;
};

export function Campo({ rotulo, valor, onChange, erro, dica, placeholder, senha, desabilitado, testID }: CampoProps) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-vupth-textPrimary">{rotulo}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={rotulo}
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#6B706B"
        secureTextEntry={senha}
        editable={!desabilitado}
        className={`h-11 rounded-xl border px-3 text-vupth-textPrimary ${
          erro ? "border-vupth-danger" : "border-vupth-border"
        } ${desabilitado ? "bg-vupth-surface" : "bg-white"}`}
      />
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
            marcado(o.valor) ? "border-vupth-forest bg-vupth-forest" : "border-vupth-border bg-white"
          }`}
        >
          <Text className={marcado(o.valor) ? "text-white" : "text-vupth-textPrimary"}>{o.rotulo}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const COR_ESTADO = {
  ok: "bg-vupth-greenTint text-vupth-forest",
  atencao: "bg-vupth-amberTint text-vupth-amber",
  erro: "bg-vupth-dangerTint text-vupth-danger",
  neutro: "bg-vupth-surface text-vupth-textSecondary",
};

/** Cor só para estado (proposta do ADM-1): verde ok, âmbar atenção, vermelho erro. */
export function Estado({ texto, tom }: { texto: string; tom: keyof typeof COR_ESTADO }) {
  const [fundo, cor] = COR_ESTADO[tom].split(" ");
  return (
    <View className={`self-start rounded-full px-3 py-1 ${fundo}`}>
      <Text className={`text-xs font-semibold ${cor}`}>{texto}</Text>
    </View>
  );
}

export function Cartao({ children, titulo, acao }: { children: ReactNode; titulo?: string; acao?: ReactNode }) {
  return (
    <View className="gap-4 rounded-card border border-vupth-border bg-white p-5">
      {titulo || acao ? (
        <View className="flex-row items-center justify-between gap-3">
          {titulo ? <Text className="text-base font-semibold text-vupth-textPrimary">{titulo}</Text> : <View />}
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
  const cor = pct >= 80 ? "bg-vupth-amber" : "bg-vupth-forest";
  return (
    <View testID={testID} className="h-2 w-full overflow-hidden rounded-full bg-vupth-surface">
      <View className={`h-2 rounded-full ${cor}`} style={{ width: `${pct}%` }} />
    </View>
  );
}

export function Aviso({ texto, tom = "erro" }: { texto: string; tom?: "erro" | "atencao" }) {
  return (
    <View
      accessible
      accessibilityRole="alert"
      className={`rounded-xl px-4 py-3 ${tom === "erro" ? "bg-vupth-dangerTint" : "bg-vupth-amberTint"}`}
    >
      <Text className={tom === "erro" ? "text-vupth-danger" : "text-vupth-amber"}>{texto}</Text>
    </View>
  );
}
