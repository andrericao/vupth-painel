import type { Previa } from "../components/EsperaBackend";

// O que cada tela traz, tirado da proposta aprovada (painel.html → Solicitadas, ADM-1; DEC-74).
export const PREVIAS: Record<string, Previa> = {
  suporte: {
    titulo: "Suporte",
    resumo: "A caixa de entrada do formulário, por perfil e categoria.",
    numeros: ["Sem resposta", "Hoje"],
    blocos: [
      {
        titulo: "Caixa de entrada",
        itens: ["Hoje o POST /support/contact só manda e-mail: a caixa precisa o Backend guardar a mensagem."],
      },
    ],
    endpoint: "GET /admin/support/messages",
  },
};
