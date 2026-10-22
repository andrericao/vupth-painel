import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Leitura, Paginacao, Titulo } from "../components/leitura";
import { Cartao, Pilulas } from "../components/ui";
import { listarSuporte, mascararEmail, TAMANHO_PAGINA } from "../lib/admin";
import { dataHora } from "../lib/format";
import { useCarga } from "../lib/useCarga";

type Filtro = string;

/** A caixa de entrada do formulário de suporte (GET /admin/support/messages): da mais nova para a mais antiga. */
export function Suporte() {
  const [pagina, setPagina] = useState(0);
  const [categoria, setCategoria] = useState<Filtro>("TODAS");
  const [abertas, setAbertas] = useState<string[]>([]);
  const [emailsVistos, setEmailsVistos] = useState<string[]>([]);
  const r = useCarga(`suporte:${pagina}`, () => listarSuporte(pagina));

  const alternar = (lista: string[], id: string) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);
  const categorias = Array.from(new Set((r.dado?.items ?? []).map((m) => m.category).filter(Boolean))) as string[];
  const visiveis = (r.dado?.items ?? []).filter((m) => categoria === "TODAS" || m.category === categoria);

  return (
    <View className="gap-5">
      <Titulo
        titulo="Suporte"
        resumo="As mensagens do formulário de suporte, da mais nova para a mais antiga. O e-mail fica mascarado até clicar; a leitura vai para a auditoria."
      />
      {categorias.length ? (
        <Pilulas<Filtro>
          testID="categoria"
          valor={categoria}
          onChange={setCategoria}
          opcoes={[{ valor: "TODAS", rotulo: "Todas" }, ...categorias.map((c) => ({ valor: c, rotulo: c }))]}
        />
      ) : null}
      <Leitura carregando={r.carregando} erro={r.erro} onTentar={r.recarregar}>
        {r.dado && !visiveis.length ? (
          <Text testID="vazio" className="text-vupth-textSecondary">
            {r.dado.items.length ? "Nenhuma mensagem nesta categoria." : "Nenhuma mensagem ainda."}
          </Text>
        ) : null}
        {visiveis.map((m) => {
          const aberta = abertas.includes(m.id);
          const visto = emailsVistos.includes(m.id);
          return (
            <Cartao key={m.id}>
              <Pressable
                testID={`msg-${m.id}`}
                accessibilityRole="button"
                accessibilityState={{ expanded: aberta }}
                accessibilityLabel={`Mensagem de ${m.name}`}
                onPress={() => setAbertas((l) => alternar(l, m.id))}
                className="gap-1"
              >
                <View className="flex-row flex-wrap items-center justify-between gap-2">
                  <Text className="text-base font-semibold text-vupth-textPrimary">{m.subject || "Sem assunto"}</Text>
                  <Text className="text-xs text-vupth-textSecondary">{dataHora(m.created_at)}</Text>
                </View>
                <Text className="text-vupth-textSecondary">
                  {m.name}
                  {m.profile ? ` · ${m.profile}` : ""}
                  {m.category ? ` · ${m.category}` : ""}
                </Text>
                {aberta ? (
                  <Text testID={`texto-${m.id}`} className="pt-2 text-vupth-textPrimary">
                    {m.message}
                  </Text>
                ) : (
                  <Text numberOfLines={1} className="text-vupth-textSecondary">
                    {m.message}
                  </Text>
                )}
              </Pressable>
              <Pressable
                testID={`email-${m.id}`}
                accessibilityRole="button"
                accessibilityLabel={visto ? "Ocultar o e-mail" : "Mostrar o e-mail"}
                onPress={() => setEmailsVistos((l) => alternar(l, m.id))}
              >
                <Text className="text-vupth-forest">
                  {visto ? m.email : mascararEmail(m.email)} · {visto ? "ocultar" : "mostrar"}
                </Text>
              </Pressable>
            </Cartao>
          );
        })}
        {r.dado ? <Paginacao pagina={pagina} tamanho={TAMANHO_PAGINA} total={r.dado.total} onIr={setPagina} /> : null}
      </Leitura>
    </View>
  );
}
