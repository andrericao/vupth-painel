import type { Previa } from "../components/EsperaBackend";

// O que cada tela traz, tirado da proposta aprovada (painel.html → Solicitadas, ADM-1; DEC-74).
export const PREVIAS: Record<string, Previa> = {
  hoje: {
    titulo: "Hoje",
    resumo: "Cada número com a seta contra o mesmo dia da semana passada. Fuso de São Paulo.",
    numeros: [
      "Lojas abertas agora",
      "Na fila agora",
      "Cortes concluídos",
      "Atrasos e multas",
      "Desistências e cancelamentos",
      "Cadastros novos",
    ],
    blocos: [
      { titulo: "Cortes por hora", itens: ["Hoje × a média das últimas 4 semanas, em linha."] },
      {
        titulo: "Precisa de você",
        itens: ["Mensagem do suporte sem resposta", "Campanha perto do teto", "Pagamento parado"],
      },
    ],
    endpoint: "GET /admin/overview e /admin/series",
  },
  usuarios: {
    titulo: "Usuários",
    resumo: "Busca por nome, e-mail ou telefone. Dado pessoal mascarado até clicar (a leitura vai para a auditoria).",
    numeros: [],
    blocos: [
      { titulo: "Filtros", itens: ["Perfil: cliente, profissional, dono", "Situação: ativo, multa pendente, bloqueado, isento"] },
      { titulo: "Ficha", itens: ["Histórico", "Multas", "Campanhas resgatadas", "Ação: isentar"] },
    ],
    endpoint: "GET /admin/users",
  },
  estabelecimentos: {
    titulo: "Estabelecimentos",
    resumo: "Cada loja com o estado de agora e o dia.",
    numeros: ["Abertas", "Fechadas", "Espera média"],
    blocos: [
      { titulo: "Por loja", itens: ["Aberto ou fechado", "Fila", "Espera média", "Cortes do dia", "Avaliação"] },
      { titulo: "Avisos", itens: ["Loja sem ponto no mapa"] },
    ],
    endpoint: "GET /admin/establishments",
  },
  dinheiro: {
    titulo: "Dinheiro",
    resumo: "Estimativa; o número exato sai no relatório em CSV.",
    numeros: ["Pagamentos", "Taxa do gateway", "Taxa do app", "Multas"],
    blocos: [
      { titulo: "Multas", itens: ["De atraso", "De falta de pagamento", "São a fonte da bonificação (DEC-53, 70)"] },
      { titulo: "Bonificação a pagar", itens: ["Por profissional, com o Pix de cada um (DEC-65)"] },
    ],
    endpoint: "GET /admin/finance",
  },
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
  alertas: {
    titulo: "Alertas",
    resumo: "Só o que pede ação: alerta demais vira ruído.",
    numeros: [],
    blocos: [
      {
        titulo: "Regras",
        itens: [
          "Erro 5xx acima do normal",
          "Servidor fora (readiness)",
          "Push recusado",
          "Pagamento parado",
          "Loja aberta sem atender há 30 min",
          "Campanha a 80% do teto",
        ],
      },
      { titulo: "Histórico", itens: ["Quando disparou, quando voltou ao normal"] },
    ],
    endpoint: "GET /admin/alerts",
  },
  auditoria: {
    titulo: "Auditoria",
    resumo: "Quem fez o quê e quando: toda ação e toda leitura de dado pessoal.",
    numeros: [],
    blocos: [{ titulo: "Registro", itens: ["Data e hora", "Quem", "Ação", "Sobre quem ou o quê"] }],
    endpoint: "GET /admin/audit",
  },
};
