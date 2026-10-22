import { useState } from "react";
import { Text, View } from "react-native";

import { Cartao, Campo, Estado } from "../components/ui";
import { Leitura, Paginacao, Titulo } from "../components/leitura";
import {
  listarAuditoria,
  listarLojas,
  listarUsuarios,
  TAMANHO_PAGINA,
  type Pagina,
} from "../lib/admin";
import { dataHora } from "../lib/format";
import { useCarga } from "../lib/useCarga";

export const NOME_PAPEL: Record<string, string> = {
  CLIENT: "Cliente",
  PROFESSIONAL: "Profissional",
  OWNER: "Dono",
  ADMIN: "Admin",
};

/** Busca + lista paginada: mudar a busca volta para a primeira página. */
function Lista<T>({
  titulo,
  resumo,
  chave,
  buscar,
  linha,
  comBusca,
}: {
  titulo: string;
  resumo: string;
  chave: string;
  buscar: (q: string, pagina: number) => Promise<Pagina<T>>;
  linha: (x: T) => { id: string; corpo: React.ReactNode };
  comBusca: boolean;
}) {
  const [digitado, setDigitado] = useState("");
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(0);
  const r = useCarga(`${chave}:${q}:${pagina}`, () => buscar(q, pagina));

  return (
    <View className="gap-5">
      <Titulo titulo={titulo} resumo={resumo} />
      {comBusca ? (
        <View className="flex-row items-end gap-3">
          <View className="flex-1">
            <Campo
              testID="busca"
              rotulo="Buscar"
              placeholder="Nome ou e-mail"
              valor={digitado}
              onChange={setDigitado}
            />
          </View>
          <Text
            testID="buscar"
            accessibilityRole="button"
            className="pb-3 font-semibold text-vupth-forest"
            onPress={() => {
              setPagina(0);
              setQ(digitado);
            }}
          >
            Buscar
          </Text>
        </View>
      ) : null}
      <Leitura carregando={r.carregando} erro={r.erro} onTentar={r.recarregar}>
        {r.dado && !r.dado.items.length ? (
          <Text testID="vazio" className="text-vupth-textSecondary">
            Nada por aqui.
          </Text>
        ) : null}
        {r.dado?.items.map((x) => {
          const l = linha(x);
          return (
            <Cartao key={l.id}>{l.corpo}</Cartao>
          );
        })}
        {r.dado ? <Paginacao pagina={pagina} tamanho={TAMANHO_PAGINA} total={r.dado.total} onIr={setPagina} /> : null}
      </Leitura>
    </View>
  );
}

export function Usuarios() {
  return (
    <Lista
      titulo="Usuários"
      resumo="Busca por nome ou e-mail. Sem telefone, chave Pix nem senha."
      chave="usuarios"
      comBusca
      buscar={listarUsuarios}
      linha={(u) => ({
        id: u.id,
        corpo: (
          <View className="gap-1">
            <View className="flex-row flex-wrap items-center justify-between gap-2">
              <Text className="text-base font-semibold text-vupth-textPrimary">{u.name}</Text>
              {u.deleted ? <Estado tom="erro" texto="Excluído" /> : <Estado tom={u.active ? "ok" : "atencao"} texto={u.active ? "Ativo" : "Inativo"} />}
            </View>
            <Text className="text-vupth-textSecondary">{u.email}</Text>
            <Text className="text-vupth-textSecondary">
              {u.roles.map((r) => NOME_PAPEL[r] ?? r).join(", ") || "Sem papel"} · desde {dataHora(u.created_at)}
            </Text>
          </View>
        ),
      })}
    />
  );
}

export function Estabelecimentos() {
  return (
    <Lista
      titulo="Estabelecimentos"
      resumo="Cada loja com o estado de agora e o dono."
      chave="lojas"
      comBusca
      buscar={listarLojas}
      linha={(l) => ({
        id: l.id,
        corpo: (
          <View className="gap-1">
            <View className="flex-row flex-wrap items-center justify-between gap-2">
              <Text className="text-base font-semibold text-vupth-textPrimary">{l.name}</Text>
              <Estado tom={l.open_status === "OPEN" ? "ok" : "neutro"} texto={l.open_status === "OPEN" ? "Aberta" : "Fechada"} />
            </View>
            <Text className="text-vupth-textSecondary">
              Dono: {l.owner_name} · {l.professionals} {l.professionals === 1 ? "profissional" : "profissionais"} · {l.status}
            </Text>
            <Text className="text-vupth-textSecondary">Criada em {dataHora(l.created_at)}</Text>
          </View>
        ),
      })}
    />
  );
}

export function Auditoria() {
  return (
    <Lista
      titulo="Auditoria"
      resumo="Quem fez o quê e quando no painel, da mais nova para a mais antiga."
      chave="auditoria"
      comBusca={false}
      buscar={(_q, pagina) => listarAuditoria(pagina)}
      linha={(a) => ({
        id: a.id,
        corpo: (
          <View className="gap-1">
            <View className="flex-row flex-wrap items-center justify-between gap-2">
              <Text className="font-semibold text-vupth-textPrimary">
                {a.method} {a.path}
                {a.query ? `?${a.query}` : ""}
              </Text>
              <Estado tom={a.status < 400 ? "ok" : "erro"} texto={String(a.status)} />
            </View>
            <Text className="text-vupth-textSecondary">
              {a.admin_email} · {dataHora(a.created_at)}
            </Text>
          </View>
        ),
      })}
    />
  );
}
