import { Redirect, router, Slot, usePathname } from "expo-router";

import { Shell } from "../../src/components/Shell";
import { sair } from "../../src/lib/auth";
import { lerSessao } from "../../src/lib/session";

export default function PainelLayout() {
  const atual = usePathname();
  const sessao = lerSessao();
  if (!sessao || sessao.pendente) return <Redirect href="/entrar" />;
  return (
    <Shell
      atual={atual}
      nome={sessao.nome}
      permissoes={sessao.permissoes}
      onIr={(rota) => router.push(rota as never)}
      onSair={() => {
        sair();
        router.replace("/entrar");
      }}
    >
      <Slot />
    </Shell>
  );
}
