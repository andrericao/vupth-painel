/**
 * A divisão do preço, a mesma do Backend (PriceSplit, DEC-54/91) e do app do parceiro, em centavos inteiros:
 *   preço      = o menor X,90 em que, depois do gateway e dos 2% do app, sobra ao menos o que o profissional recebe
 *   gateway    = o maior entre o Pix (R$ 1,99) e o cartão à vista (R$ 0,49 + 2,99% do preço, centavo para cima)
 *   app        = preço − recebe − gateway (os 2% + a sobra do arredondamento para X,90)
 */
const PIX = 199;
const CARTAO_FIXO = 49;

/** O gateway no preço (em centavos): o centavo do cartão sobe, a taxa nunca fica abaixo da real. */
export function gatewayCent(precoCent: number): number {
  return Math.max(PIX, CARTAO_FIXO + Math.ceil((precoCent * 299) / 10000));
}

/** Os 2% do app sobre o preço, centavo arredondado para cima a partir de meio. */
function dosPorCentoCent(precoCent: number): number {
  return Math.floor((precoCent * 2 + 50) / 100);
}

/** O preço do cliente para o profissional receber `recebeCent`: o X,90 logo acima, subindo R$ 1 até passar na prova. */
export function precoDoClienteCent(recebeCent: number): number {
  let preco = Math.floor(recebeCent / 100) * 100 + 90;
  if (preco < recebeCent) preco += 100;
  while (preco - gatewayCent(preco) - dosPorCentoCent(preco) < recebeCent) preco += 100;
  return preco;
}

/** O que sobra para o app em um corte em que o profissional recebe `recebeCent` (sem absorver taxa). */
export function margemDoAppCent(recebeCent: number): number {
  const preco = precoDoClienteCent(recebeCent);
  return preco - recebeCent - gatewayCent(preco);
}
