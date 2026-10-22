import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { EsperaBackend } from "../EsperaBackend";
import { ativo, lerRecolhido, MENU, Shell } from "../Shell";
import { Aviso, Barra, Botao, Campo, Cartao, Estado, Pilulas } from "../ui";
import { PREVIAS } from "../../screens/previas";

let mockLargura = 1280;
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => ({ width: mockLargura, height: 800, scale: 1, fontScale: 1 }),
}));

function largura(px: number) {
  mockLargura = px;
}

describe("ui", () => {
  it("Botao chama e trava quando carrega ou desabilitado", () => {
    const fn = jest.fn();
    const { rerender } = render(<Botao testID="b" titulo="Ir" onPress={fn} tipo="perigo" />);
    fireEvent.press(screen.getByTestId("b"));
    expect(fn).toHaveBeenCalledTimes(1);
    rerender(<Botao testID="b" titulo="Ir" onPress={fn} carregando />);
    expect(screen.queryByText("Ir")).toBeNull();
    expect(screen.getByTestId("b")).toBeDisabled();
    rerender(<Botao testID="b" titulo="Ir" onPress={fn} desabilitado tipo="secundario" />);
    fireEvent.press(screen.getByTestId("b"));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("Campo mostra erro, dica ou nada", () => {
    const fn = jest.fn();
    const { rerender } = render(<Campo testID="c" rotulo="Nome" valor="" onChange={fn} erro="faltou" />);
    expect(screen.getByText("faltou")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("c"), "x");
    expect(fn).toHaveBeenCalledWith("x");
    rerender(<Campo rotulo="Nome" valor="" onChange={fn} dica="uma dica" desabilitado senha />);
    expect(screen.getByText("uma dica")).toBeTruthy();
    rerender(<Campo rotulo="Nome" valor="" onChange={fn} />);
    expect(screen.queryByText("uma dica")).toBeNull();
  });

  it("Pilulas: uma ou várias marcadas", () => {
    const fn = jest.fn();
    const opcoes = [
      { valor: "a", rotulo: "A" },
      { valor: "b", rotulo: "B" },
    ];
    const { rerender } = render(<Pilulas testID="p" opcoes={opcoes} valor="a" onChange={fn} />);
    fireEvent.press(screen.getByTestId("p-b"));
    expect(fn).toHaveBeenCalledWith("b");
    rerender(<Pilulas opcoes={opcoes} valor={["a", "b"]} onChange={fn} />);
    fireEvent.press(screen.getByText("A"));
    expect(fn).toHaveBeenCalledWith("a");
  });

  it("Estado, Cartao, Barra e Aviso", () => {
    render(
      <>
        <Estado tom="erro" texto="caiu" />
        <Cartao titulo="T" acao={<Text>ação</Text>}>
          <Text>dentro</Text>
        </Cartao>
        <Cartao acao={<Text>só ação</Text>}>
          <Text>x</Text>
        </Cartao>
        <Cartao>
          <Text>sem cabeça</Text>
        </Cartao>
        <Barra testID="b1" fracao={0.9} />
        <Barra testID="b2" fracao={-1} />
        <Aviso texto="ruim" />
        <Aviso texto="atenção" tom="atencao" />
      </>,
    );
    expect(screen.getByText("caiu")).toBeTruthy();
    expect(screen.getByText("T")).toBeTruthy();
    expect(screen.getByText("só ação")).toBeTruthy();
    expect(screen.getByText("sem cabeça")).toBeTruthy();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });
});

describe("Shell", () => {
  it("ativo: a raiz só nela mesma; as outras pegam as filhas", () => {
    expect(ativo("/", "/")).toBe(true);
    expect(ativo("/", "/campanhas")).toBe(false);
    expect(ativo("/campanhas", "/campanhas/x")).toBe(true);
    expect(ativo("/campanhas", "/campanhasx")).toBe(false);
  });

  it("no computador, menu lateral com todas as telas e Sair", () => {
    largura(1280);
    const onIr = jest.fn();
    const onSair = jest.fn();
    render(
      <Shell atual="/campanhas" nome="André" onIr={onIr} onSair={onSair}>
        <Text>conteúdo</Text>
      </Shell>,
    );
    expect(screen.getByText("André")).toBeTruthy();
    MENU.forEach((m) => expect(screen.getByText(m.nome)).toBeTruthy());
    fireEvent.press(screen.getByTestId("menu-/usuarios"));
    expect(onIr).toHaveBeenCalledWith("/usuarios");
    fireEvent.press(screen.getByTestId("sair"));
    expect(onSair).toHaveBeenCalled();
  });

  it("recolhe o menu para só ícones, guarda no navegador e volta", () => {
    largura(1280);
    localStorage.clear();
    const props = { atual: "/", nome: "André", onIr: jest.fn(), onSair: jest.fn() };
    const { unmount } = render(
      <Shell {...props}>
        <Text>conteúdo</Text>
      </Shell>,
    );
    fireEvent.press(screen.getByTestId("recolher-menu"));
    expect(screen.queryByText("André")).toBeNull();
    expect(screen.queryByText("Campanhas")).toBeNull();
    expect(screen.getByLabelText("Expandir o menu")).toBeTruthy();
    expect(screen.getByLabelText("Campanhas")).toBeTruthy();
    expect(localStorage.getItem("vupth-painel:menu-recolhido")).toBe("1");
    expect(screen.getByLabelText("Expandir o menu").props.accessibilityState).toEqual({ expanded: false });
    expect(screen.queryByTestId("dica-menu-/campanhas")).toBeNull();
    fireEvent(screen.getByTestId("menu-/campanhas"), "hoverIn");
    expect(screen.getByTestId("dica-menu-/campanhas")).toBeTruthy();
    fireEvent(screen.getByTestId("menu-/campanhas"), "hoverOut");
    expect(screen.queryByTestId("dica-menu-/campanhas")).toBeNull();
    fireEvent(screen.getByTestId("sair"), "focus");
    expect(screen.getByTestId("dica-sair")).toBeTruthy();
    fireEvent(screen.getByTestId("sair"), "blur");
    expect(screen.queryByTestId("dica-sair")).toBeNull();
    unmount();
    render(
      <Shell {...props}>
        <Text>conteúdo</Text>
      </Shell>,
    );
    expect(screen.queryByText("Campanhas")).toBeNull();
    fireEvent.press(screen.getByTestId("recolher-menu"));
    expect(screen.getByText("Campanhas")).toBeTruthy();
    expect(screen.getByText("Collapse")).toBeTruthy();
    expect(screen.getByLabelText("Recolher o menu").props.accessibilityState).toEqual({ expanded: true });
    expect(localStorage.getItem("vupth-painel:menu-recolhido")).toBe("0");
    localStorage.clear();
  });

  it("sem storage o menu começa aberto e recolhe só até recarregar", () => {
    largura(1280);
    const spy = jest.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    const set = jest.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(lerRecolhido()).toBe(false);
    render(
      <Shell atual="/" nome="André" onIr={jest.fn()} onSair={jest.fn()}>
        <Text>conteúdo</Text>
      </Shell>,
    );
    fireEvent.press(screen.getByTestId("recolher-menu"));
    expect(screen.queryByText("Campanhas")).toBeNull();
    spy.mockRestore();
    set.mockRestore();
  });

  it("esconde do menu a tela que a permissão não dá (computador e celular)", () => {
    largura(1280);
    const props = { atual: "/", nome: "André", onIr: jest.fn(), onSair: jest.fn(), permissoes: ["OVERVIEW"] };
    const { unmount } = render(
      <Shell {...props}>
        <Text>conteúdo</Text>
      </Shell>,
    );
    expect(screen.getByTestId("menu-/")).toBeTruthy();
    expect(screen.queryByTestId("menu-/usuarios")).toBeNull();
    unmount();
    largura(390);
    render(
      <Shell {...props}>
        <Text>conteúdo</Text>
      </Shell>,
    );
    expect(screen.getByTestId("menu-/")).toBeTruthy();
    expect(screen.queryByTestId("menu-/campanhas")).toBeNull();
  });

  it("no celular, barra de baixo", () => {
    largura(390);
    const onIr = jest.fn();
    const onSair = jest.fn();
    render(
      <Shell atual="/" nome="André" onIr={onIr} onSair={onSair}>
        <Text>conteúdo</Text>
      </Shell>,
    );
    expect(screen.queryByText("André")).toBeNull();
    fireEvent.press(screen.getByTestId("menu-/alertas"));
    expect(onIr).toHaveBeenCalledWith("/alertas");
    fireEvent.press(screen.getByTestId("sair"));
    expect(onSair).toHaveBeenCalled();
    largura(1280);
  });
});

describe("EsperaBackend", () => {
  it("cada tela mostra o endpoint que espera e nenhum número", () => {
    Object.values(PREVIAS).forEach((p) => {
      const { unmount } = render(<EsperaBackend previa={p} />);
      expect(screen.getByText(`Espera o Backend: ${p.endpoint}`)).toBeTruthy();
      expect(screen.queryAllByText("—")).toHaveLength(p.numeros.length);
      unmount();
    });
  });
});
