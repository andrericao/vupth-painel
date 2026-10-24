import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Leitura, Paginacao, Titulo } from "../components/leitura";
import { Aviso, Botao, Campo, Cartao, Estado } from "../components/ui";
import { iniciarTeste, listarLojas, tirarDoTeste, TAMANHO_PAGINA } from "../lib/admin";
import { erroDeTeste } from "../lib/erroDeTeste";
import { dataHora, maisNovoPrimeiro } from "../lib/format";
import { useCarga } from "../lib/useCarga";

/** Lojas com o estado de agora; marcar lojas e dar um nome inicia um teste, e a loja sai dele pela própria linha. */
export function Estabelecimentos() {
  const [digitado, setDigitado] = useState("");
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(0);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const r = useCarga(`lojas:${q}:${pagina}`, () => listarLojas(q, pagina));

  const alternar = (id: string) => setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  async function agir(acao: () => Promise<unknown>) {
    setOcupado(true);
    setErro("");
    try {
      await acao();
      setMarcadas([]);
      setNome("");
      r.recarregar();
    } catch (e) {
      setErro(erroDeTeste(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <View className="gap-5">
      <Titulo titulo="Estabelecimentos" resumo="Cada loja com o estado de agora e o dono. Marque lojas para iniciar um teste com nome." />
      <View className="flex-row items-end gap-3">
        <View className="flex-1">
          <Campo testID="busca" rotulo="Buscar" placeholder="Nome ou e-mail" valor={digitado} onChange={setDigitado} />
        </View>
        <Text
          testID="buscar"
          accessibilityRole="button"
          className="pb-3 font-heading text-vupth-textPrimary"
          onPress={() => {
            setPagina(0);
            setQ(digitado);
          }}
        >
          Buscar
        </Text>
      </View>
      {marcadas.length ? (
        <Cartao titulo={`Iniciar teste com ${marcadas.length} ${marcadas.length === 1 ? "loja" : "lojas"}`}>
          <Campo testID="nome-do-teste" rotulo="Nome do teste" placeholder="Ex.: piloto da Barbearia" valor={nome} onChange={setNome} />
          <View className="flex-row flex-wrap gap-2">
            <Botao
              testID="iniciar-teste"
              titulo="Iniciar teste"
              carregando={ocupado}
              desabilitado={!nome.trim()}
              onPress={() => agir(() => iniciarTeste(nome, marcadas))}
            />
            <Botao testID="limpar-marcas" titulo="Limpar" tipo="secundario" onPress={() => setMarcadas([])} />
          </View>
        </Cartao>
      ) : null}
      {erro ? <Aviso texto={erro} /> : null}
      <Leitura carregando={r.carregando} erro={r.erro} onTentar={r.recarregar}>
        {r.dado && !r.dado.items.length ? (
          <Text testID="vazio" className="text-vupth-textSecondary">
            Nada por aqui.
          </Text>
        ) : null}
        {maisNovoPrimeiro(r.dado?.items ?? [], (l) => l.created_at).map((l) => {
          const emTeste = !!l.active_test_id;
          const marcada = marcadas.includes(l.id);
          return (
            <Cartao key={l.id}>
              <View testID={`loja-${l.id}`} className="gap-1">
                <View className="flex-row flex-wrap items-center justify-between gap-2">
                  <View className="flex-row items-center gap-3">
                    {emTeste ? null : (
                      <Pressable
                        testID={`marcar-${l.id}`}
                        accessibilityRole="checkbox"
                        accessibilityLabel={`Escolher ${l.name} para o teste`}
                        accessibilityState={{ checked: marcada }}
                        onPress={() => alternar(l.id)}
                        className={`h-6 w-6 items-center justify-center rounded-md border ${marcada ? "border-vupth-green bg-vupth-green" : "border-vupth-border bg-vupth-background"}`}
                      >
                        <Text className="text-xs font-heading text-vupth-onGreen">{marcada ? "✓" : ""}</Text>
                      </Pressable>
                    )}
                    <Text className="text-base font-heading text-vupth-textPrimary">{l.name}</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {emTeste ? <Estado tom="atencao" texto={`TESTE: ${l.active_test_name}`} /> : null}
                    <Estado tom={l.open_status === "OPEN" ? "ok" : "neutro"} texto={l.open_status === "OPEN" ? "Aberta" : "Fechada"} />
                  </View>
                </View>
                <Text className="text-vupth-textSecondary">
                  Dono: {l.owner_name} · {l.professionals} {l.professionals === 1 ? "profissional" : "profissionais"} · {l.status}
                </Text>
                <Text className="text-vupth-textSecondary">Criada em {dataHora(l.created_at)}</Text>
                {emTeste ? (
                  <View className="flex-row pt-1">
                    <Botao
                      testID={`tirar-${l.id}`}
                      titulo="Tirar do teste"
                      tipo="secundario"
                      desabilitado={ocupado}
                      onPress={() => agir(() => tirarDoTeste(l.active_test_id!, l.id))}
                    />
                  </View>
                ) : null}
              </View>
            </Cartao>
          );
        })}
        {r.dado ? <Paginacao pagina={pagina} tamanho={TAMANHO_PAGINA} total={r.dado.total} onIr={setPagina} /> : null}
      </Leitura>
    </View>
  );
}
