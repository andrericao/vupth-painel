import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { Shell } from "../components/Shell";
import { escolhaAtual, escolherTema, proximaEscolha, useEscolha } from "../escolhaDeTema";
import { CORES } from "../tema";
import { useCor } from "../useCor";

function Sonda() {
  const cor = useCor();
  return <Text testID="sonda">{`${useEscolha()}:${cor.background}`}</Text>;
}

// O preset nativo não tem DOM: um <html> de mentira mostra o atributo que o tailwind lê.
const atributos = new Map<string, string>();
const raiz = {
  setAttribute: (k: string, v: string) => atributos.set(k, v),
  removeAttribute: (k: string) => atributos.delete(k),
  getAttribute: (k: string) => atributos.get(k) ?? null,
  hasAttribute: (k: string) => atributos.has(k),
};

describe("escolha de tema", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: raiz } });
  });
  afterAll(() => {
    delete (globalThis as { document?: unknown }).document;
  });
  beforeEach(() => {
    localStorage.clear();
    escolherTema("sistema");
  });

  it("gira sistema → claro → escuro → sistema", () => {
    expect(proximaEscolha("sistema")).toBe("claro");
    expect(proximaEscolha("claro")).toBe("escuro");
    expect(proximaEscolha("escuro")).toBe("sistema");
  });

  it("guarda no navegador, marca o html e some o atributo no sistema", () => {
    escolherTema("escuro");
    expect(localStorage.getItem("vupth-painel:tema")).toBe("escuro");
    expect(raiz.getAttribute("data-tema")).toBe("escuro");
    escolherTema("claro");
    expect(raiz.getAttribute("data-tema")).toBe("claro");
    escolherTema("sistema");
    expect(localStorage.getItem("vupth-painel:tema")).toBeNull();
    expect(raiz.hasAttribute("data-tema")).toBe(false);
    expect(escolhaAtual()).toBe("sistema");
  });

  it("sem storage a escolha vale até recarregar", () => {
    const spy = jest.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(() => escolherTema("escuro")).not.toThrow();
    expect(escolhaAtual()).toBe("escuro");
    spy.mockRestore();
  });

  it("useCor segue a escolha", () => {
    render(<Sonda />);
    expect(screen.getByTestId("sonda").props.children).toBe(`sistema:${CORES.claro.background}`);
    act(() => escolherTema("escuro"));
    expect(screen.getByTestId("sonda").props.children).toBe(`escuro:${CORES.escuro.background}`);
    act(() => escolherTema("claro"));
    expect(screen.getByTestId("sonda").props.children).toBe(`claro:${CORES.claro.background}`);
  });

  it("o botão da lateral troca o tema", () => {
    render(
      <Shell atual="/" nome="André" onIr={jest.fn()} onSair={jest.fn()}>
        <Text>conteúdo</Text>
      </Shell>,
    );
    expect(screen.getByLabelText(/Tema: sistema/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("tema"));
    expect(screen.getByLabelText(/Tema: claro/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("tema"));
    expect(escolhaAtual()).toBe("escuro");
  });
});
