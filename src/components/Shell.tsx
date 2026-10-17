import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import {
  Bell,
  CircleDollarSign,
  House,
  LogOut,
  Megaphone,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  ShieldCheck,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react-native";

export type ItemMenu = { rota: string; nome: string; Icone: LucideIcon };

// A ordem do menu é a da proposta do ADM-1 (painel.html → Solicitadas).
export const MENU: ItemMenu[] = [
  { rota: "/", nome: "Hoje", Icone: House },
  { rota: "/usuarios", nome: "Usuários", Icone: Users },
  { rota: "/estabelecimentos", nome: "Estabelecimentos", Icone: Store },
  { rota: "/campanhas", nome: "Campanhas", Icone: Megaphone },
  { rota: "/dinheiro", nome: "Dinheiro", Icone: CircleDollarSign },
  { rota: "/suporte", nome: "Suporte", Icone: MessageSquare },
  { rota: "/alertas", nome: "Alertas", Icone: Bell },
  { rota: "/auditoria", nome: "Auditoria", Icone: ScrollText },
  { rota: "/acessos", nome: "Acessos", Icone: ShieldCheck },
];

export const LARGURA_CELULAR = 768;

// O menu recolhido (só ícones) fica guardado no navegador; sem storage, começa aberto.
const CHAVE_MENU = "vupth-painel:menu-recolhido";

export function lerRecolhido(): boolean {
  try {
    return globalThis.localStorage?.getItem(CHAVE_MENU) === "1";
  } catch {
    return false;
  }
}

function guardarRecolhido(v: boolean): void {
  try {
    globalThis.localStorage?.setItem(CHAVE_MENU, v ? "1" : "0");
  } catch {
    // sem storage (janela privada): vale só até recarregar
  }
}

export function ativo(rota: string, atual: string): boolean {
  return rota === "/" ? atual === "/" : atual === rota || atual.startsWith(`${rota}/`);
}

type Props = { atual: string; nome: string; onIr: (rota: string) => void; onSair: () => void; children: ReactNode };

/** Menu lateral floresta (o mockup-painel); no celular, o menu vira barra de baixo. */
export function Shell({ atual, nome, onIr, onSair, children }: Props) {
  const { width } = useWindowDimensions();
  const celular = width < LARGURA_CELULAR;
  const [recolhido, setRecolhido] = useState(lerRecolhido);
  const alternar = () => {
    guardarRecolhido(!recolhido);
    setRecolhido(!recolhido);
  };

  if (celular) {
    return (
      <View className="flex-1 bg-vupth-surface">
        <View className="flex-row items-center justify-between bg-vupth-forest px-4 py-3">
          <Text className="text-lg font-bold text-vupth-green">vupth · painel</Text>
          <Pressable testID="sair" accessibilityRole="button" accessibilityLabel="Sair" onPress={onSair}>
            <LogOut color="#9FE870" size={20} />
          </Pressable>
        </View>
        <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4">
          {children}
        </ScrollView>
        <ScrollView horizontal className="max-h-16 grow-0 bg-vupth-forest" contentContainerClassName="px-2">
          {MENU.map((m) => (
            <ItemBarra key={m.rota} item={m} marcado={ativo(m.rota, atual)} onPress={() => onIr(m.rota)} />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 flex-row bg-vupth-surface">
      <View className={`justify-between bg-vupth-forest p-4 ${recolhido ? "w-16 items-center" : "w-60"}`}>
        <View className="gap-1">
          <View className={`mb-6 flex-row items-center ${recolhido ? "justify-center" : "justify-between px-3"}`}>
            {recolhido ? null : <Text className="text-xl font-bold text-vupth-green">vupth · painel</Text>}
            <Pressable
              testID="recolher-menu"
              accessibilityRole="button"
              accessibilityLabel={recolhido ? "Expandir o menu" : "Recolher o menu"}
              onPress={alternar}
            >
              {recolhido ? <PanelLeftOpen color="#9FE870" size={20} /> : <PanelLeftClose color="#9FE870" size={20} />}
            </Pressable>
          </View>
          {MENU.map((m) => {
            const marcado = ativo(m.rota, atual);
            return (
              <Pressable
                key={m.rota}
                testID={`menu-${m.rota}`}
                accessibilityRole="link"
                accessibilityLabel={m.nome}
                accessibilityState={{ selected: marcado }}
                onPress={() => onIr(m.rota)}
                className={`flex-row items-center gap-3 rounded-full py-2 ${recolhido ? "justify-center px-2" : "px-3"} ${marcado ? "bg-vupth-green" : ""}`}
              >
                <m.Icone color={marcado ? "#163300" : "#E2F6D5"} size={18} />
                {recolhido ? null : (
                  <Text className={marcado ? "font-semibold text-vupth-forest" : "text-vupth-greenTint"}>{m.nome}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
        <View className={`gap-2 ${recolhido ? "items-center" : "px-3"}`}>
          {recolhido ? null : (
            <Text className="text-xs text-vupth-greenTint" numberOfLines={1}>
              {nome}
            </Text>
          )}
          <Pressable
            testID="sair"
            accessibilityRole="button"
            accessibilityLabel="Sair"
            onPress={onSair}
            className="flex-row items-center gap-2"
          >
            <LogOut color="#9FE870" size={16} />
            {recolhido ? null : <Text className="text-vupth-green">Sair</Text>}
          </Pressable>
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-6xl gap-5 p-8">
        {children}
      </ScrollView>
    </View>
  );
}

function ItemBarra({ item, marcado, onPress }: { item: ItemMenu; marcado: boolean; onPress: () => void }) {
  return (
    <Pressable
      testID={`menu-${item.rota}`}
      accessibilityRole="link"
      accessibilityState={{ selected: marcado }}
      onPress={onPress}
      className="w-20 items-center justify-center gap-1 py-2"
    >
      <item.Icone color={marcado ? "#9FE870" : "#E2F6D5"} size={20} />
      <Text className={`text-[10px] ${marcado ? "font-semibold text-vupth-green" : "text-vupth-greenTint"}`}>
        {item.nome}
      </Text>
    </Pressable>
  );
}
